export class CloudflareRoomTransport{
  constructor(baseUrl){
    this.baseUrl=String(baseUrl||'').trim().replace(/\/$/,'');
    this.handlers=new Map();this.socket=null;this.credentials=null;this.manualClose=false;this.retryTimer=null;
  }
  async createRoom(name){
    const response=await fetch(`${this.baseUrl}/api/rooms`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name})});
    return parseResponse(response);
  }
  async joinRoom(roomCode,name,previous={}){
    const code=cleanCode(roomCode);
    const response=await fetch(`${this.baseUrl}/api/rooms/${code}/join`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,playerId:previous.playerId,playerToken:previous.playerToken})});
    return parseResponse(response);
  }
  async connect(credentials){
    this.disconnect();this.manualClose=false;this.credentials={...credentials,roomCode:cleanCode(credentials.roomCode)};
    return new Promise((resolve,reject)=>{
      const wsUrl=new URL(`${this.baseUrl}/api/rooms/${this.credentials.roomCode}/ws`);
      wsUrl.protocol=wsUrl.protocol==='https:'?'wss:':'ws:';
      wsUrl.searchParams.set('playerId',this.credentials.playerId);wsUrl.searchParams.set('token',this.credentials.playerToken);
      const ws=new WebSocket(wsUrl);this.socket=ws;
      let settled=false;
      ws.onopen=()=>{settled=true;this.emit('connection',{connected:true});resolve()};
      ws.onmessage=event=>{let message;try{message=JSON.parse(event.data)}catch{return}this.emit(message.type,message)};
      ws.onerror=()=>{if(!settled){settled=true;reject(new Error('ROOM_CONNECTION_FAILED'))}};
      ws.onclose=()=>{this.emit('connection',{connected:false});if(!this.manualClose)this.scheduleReconnect()};
    });
  }
  publish(type,payload={}){
    if(type!=='INTENT')return false;
    if(this.socket?.readyState!==WebSocket.OPEN)return false;
    this.socket.send(JSON.stringify({type,payload,intent:payload}));return true;
  }
  sendIntent(intent){
    if(this.socket?.readyState!==WebSocket.OPEN)throw new Error('NOT_CONNECTED');
    this.socket.send(JSON.stringify({type:'INTENT',intent}));
  }
  subscribe(type,handler){
    if(!this.handlers.has(type))this.handlers.set(type,new Set());this.handlers.get(type).add(handler);
    return()=>this.handlers.get(type)?.delete(handler);
  }
  emit(type,payload){for(const fn of this.handlers.get(type)||[])fn(payload)}
  scheduleReconnect(){
    clearTimeout(this.retryTimer);if(!this.credentials)return;
    this.retryTimer=setTimeout(()=>this.connect(this.credentials).catch(()=>this.scheduleReconnect()),1500);
  }
  disconnect(){
    this.manualClose=true;clearTimeout(this.retryTimer);this.retryTimer=null;
    if(this.socket){try{this.socket.close(1000,'client disconnect')}catch{}this.socket=null}
  }
}

export function cleanCode(value){return String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6)}

async function parseResponse(response){
  let body={};try{body=await response.json()}catch{}
  if(!response.ok)throw new Error(body.error||`HTTP_${response.status}`);
  return body;
}
