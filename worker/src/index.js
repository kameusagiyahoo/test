import {DurableObject} from 'cloudflare:workers';
import {applyIntent,authenticate,createInitialRoom,joinRoom,publicSnapshot} from './engine.js';

const ROOM_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}});

function randomRoomCode(){
  const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
  return [...bytes].map(v=>ROOM_CHARS[v%ROOM_CHARS.length]).join('');
}

function originAllowed(request,env){
  const origin=request.headers.get('Origin');if(!origin)return true;
  const allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  return allowed.includes('*')||allowed.includes(origin);
}

function cors(request,env,response){
  const origin=request.headers.get('Origin');
  const headers=new Headers(response.headers);
  if(origin&&originAllowed(request,env)){headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin')}
  headers.set('Access-Control-Allow-Headers','content-type');headers.set('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function readJson(request){try{return await request.json()}catch{return {}}}

export default {
  async fetch(request,env){
    if(request.method==='OPTIONS')return cors(request,env,new Response(null,{status:204}));
    if(!originAllowed(request,env))return json({error:'ORIGIN_NOT_ALLOWED'},403);
    const url=new URL(request.url);
    if(url.pathname==='/health')return cors(request,env,json({ok:true,service:'party-pocket-room'}));

    if(url.pathname==='/api/rooms'&&request.method==='POST'){
      const body=await readJson(request);
      for(let i=0;i<8;i++){
        const code=randomRoomCode(),stub=env.ROOMS.get(env.ROOMS.idFromName(code));
        const response=await stub.fetch(new Request(`https://room.internal/create`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,hostName:body.name})}));
        if(response.status===201)return cors(request,env,response);
      }
      return cors(request,env,json({error:'ROOM_CODE_EXHAUSTED'},503));
    }

    const match=url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})\/(join|ws|snapshot)$/i);
    if(!match)return cors(request,env,json({error:'NOT_FOUND'},404));
    const code=match[1].toUpperCase(),action=match[2];
    const stub=env.ROOMS.get(env.ROOMS.idFromName(code));
    const internal=new URL(request.url);internal.hostname='room.internal';internal.protocol='https:';internal.pathname=`/${action}`;internal.searchParams.set('roomCode',code);
    const response=await stub.fetch(new Request(internal.toString(),request));
    if(action==='ws')return response;
    return cors(request,env,response);
  }
};

export class PartyRoom extends DurableObject{
  constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env}

  async fetch(request){
    const url=new URL(request.url);
    if(url.pathname==='/create'&&request.method==='POST')return this.create(request);
    if(url.pathname==='/join'&&request.method==='POST')return this.join(request);
    if(url.pathname==='/snapshot'&&request.method==='GET')return this.snapshot(request);
    if(url.pathname==='/ws')return this.websocket(request);
    return json({error:'NOT_FOUND'},404);
  }

  async load(){return await this.ctx.storage.get('room')}
  async save(state){await this.ctx.storage.put('room',state)}

  async create(request){
    if(await this.load())return json({error:'ROOM_EXISTS'},409);
    const body=await readJson(request);const state=createInitialRoom(body.code,body.hostName);
    const credentials=state.credentials;delete state.credentials;await this.save(state);
    return json({roomCode:state.code,...credentials},201);
  }

  async join(request){
    const state=await this.load();if(!state)return json({error:'ROOM_NOT_FOUND'},404);
    const body=await readJson(request);
    if(body.playerId&&body.playerToken){
      const existing=authenticate(state,body.playerId,body.playerToken);
      if(existing)return json({roomCode:state.code,playerId:existing.id,playerToken:existing.token,reconnected:true});
    }
    try{
      const credentials=joinRoom(state,body.name);await this.save(state);await this.broadcastState(state);
      return json({roomCode:state.code,...credentials},201);
    }catch(error){return json({error:error.message},error.message==='ROOM_FULL'?409:400)}
  }

  async snapshot(request){
    const state=await this.load();if(!state)return json({error:'ROOM_NOT_FOUND'},404);
    const url=new URL(request.url),player=authenticate(state,url.searchParams.get('playerId'),url.searchParams.get('token'));
    if(!player)return json({error:'UNAUTHORIZED'},401);
    return json({type:'ROOM_STATE',state:publicSnapshot(state,player.id)});
  }

  async websocket(request){
    if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'EXPECTED_WEBSOCKET'},426);
    const state=await this.load();if(!state)return json({error:'ROOM_NOT_FOUND'},404);
    const url=new URL(request.url),player=authenticate(state,url.searchParams.get('playerId'),url.searchParams.get('token'));
    if(!player)return json({error:'UNAUTHORIZED'},401);

    const pair=new WebSocketPair();const [client,server]=Object.values(pair);
    this.ctx.acceptWebSocket(server,[`player:${player.id}`]);
    server.serializeAttachment({playerId:player.id,joinedAt:Date.now()});
    player.connected=true;state.updatedAt=Date.now();await this.save(state);
    server.send(JSON.stringify({type:'ROOM_STATE',state:publicSnapshot(state,player.id)}));
    await this.broadcastState(state);
    return new Response(null,{status:101,webSocket:client});
  }

  async webSocketMessage(ws,message){
    const attachment=ws.deserializeAttachment();if(!attachment?.playerId)return ws.close(1008,'Missing session');
    let packet;try{packet=JSON.parse(typeof message==='string'?message:new TextDecoder().decode(message))}catch{return ws.send(JSON.stringify({type:'ERROR',error:'BAD_JSON'}))}
    if(packet.type!=='INTENT')return ws.send(JSON.stringify({type:'ERROR',error:'BAD_MESSAGE'}));
    const state=await this.load();if(!state)return ws.close(1011,'Room missing');
    try{applyIntent(state,attachment.playerId,packet.intent,Date.now());await this.save(state);await this.broadcastState(state)}
    catch(error){ws.send(JSON.stringify({type:'ERROR',error:error.message||'INVALID_ACTION'}))}
  }

  async webSocketClose(ws,code,reason){
    const attachment=ws.deserializeAttachment();const state=await this.load();
    if(state&&attachment?.playerId){const player=state.players.find(p=>p.id===attachment.playerId);if(player){player.connected=false;state.updatedAt=Date.now();await this.save(state);await this.broadcastState(state)}}
    try{ws.close(code,reason)}catch{}
  }

  async webSocketError(ws){try{ws.close(1011,'WebSocket error')}catch{}}

  async broadcastState(state){
    for(const ws of this.ctx.getWebSockets()){
      if(ws.readyState!==WebSocket.OPEN)continue;
      const attachment=ws.deserializeAttachment();if(!attachment?.playerId)continue;
      try{ws.send(JSON.stringify({type:'ROOM_STATE',state:publicSnapshot(state,attachment.playerId)}))}catch{}
    }
  }
}
