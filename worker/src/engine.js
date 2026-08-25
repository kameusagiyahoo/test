const SCHEDULE=['sync','bomb','five','sync','bomb','five'];
const choicePrompts=[
  {q:'休日の朝にしたいこと',a:['二度寝','散歩','カフェ','ゲーム']},
  {q:'無人島に1つ持っていくなら',a:['ナイフ','スマホ','水','友達']},
  {q:'旅行で一番大事なのは',a:['景色','食事','ホテル','一緒に行く人']},
  {q:'超能力を1つ選ぶなら',a:['瞬間移動','透明化','時間停止','心を読む']},
  {q:'夏といえば',a:['海','花火','祭り','かき氷']},
  {q:'最強の夜食',a:['ラーメン','おにぎり','アイス','ポテチ']}
];
const freePrompts=['赤い食べ物といえば？','日本の観光地といえば？','人気の動物といえば？','丸いものといえば？','夏の食べ物といえば？','東京といえば？','黄色いものといえば？','朝に飲むものといえば？'];
const fivePrompts={
  normal:['「か」から始まる言葉を3つ','スマホでできることを3つ','黄色い食べ物を3つ','旅行先でやることを3つ','映画のジャンルを3つ','柔らかいものを3つ'],
  hard:['「ん」で終わる言葉を3つ','同じ色のものを4つ','海外の都市を4つ','家にある白いものを4つ','水に浮くものを4つ','カタカナの食べ物を4つ']
};

const pick=a=>a[Math.floor(Math.random()*a.length)];
const rand=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
const norm=value=>String(value??'').normalize('NFKC').trim().toLowerCase().replace(/[\s　、。,.!?！？ー-]/g,'');

export function createInitialRoom(code,hostName,now=Date.now()){
  const hostId=crypto.randomUUID();
  const playerToken=crypto.randomUUID().replaceAll('-','');
  const hostToken=crypto.randomUUID().replaceAll('-','');
  return {
    code,createdAt:now,updatedAt:now,phase:'lobby',hostId,hostToken,
    players:[{id:hostId,name:safeName(hostName,1),token:playerToken,connected:false}],
    party:{round:0,totalRounds:SCHEDULE.length,schedule:[...SCHEDULE],scores:[0]},
    game:null,lastResult:null,
    credentials:{playerId:hostId,playerToken,hostToken}
  };
}

export function safeName(name,index=1){
  const value=String(name??'').trim().slice(0,20);
  return value||`プレイヤー${index}`;
}

export function joinRoom(state,name){
  if(state.phase!=='lobby')throw new Error('GAME_ALREADY_STARTED');
  if(state.players.length>=8)throw new Error('ROOM_FULL');
  const id=crypto.randomUUID(),token=crypto.randomUUID().replaceAll('-','');
  state.players.push({id,name:safeName(name,state.players.length+1),token,connected:false});
  state.party.scores.push(0);state.updatedAt=Date.now();
  return {playerId:id,playerToken:token};
}

export function authenticate(state,playerId,token){
  return state.players.find(p=>p.id===playerId&&p.token===token)||null;
}

export function publicSnapshot(state,viewerId){
  const me=state.players.find(p=>p.id===viewerId);
  const base={
    code:state.code,phase:state.phase,hostId:state.hostId,
    players:state.players.map(p=>({id:p.id,name:p.name,connected:!!p.connected})),
    party:{round:state.party.round,totalRounds:state.party.totalRounds,schedule:state.party.schedule,scores:state.party.scores},
    game:publicGame(state.game,viewerId),lastResult:state.lastResult,
    me:me?{id:me.id,name:me.name,isHost:me.id===state.hostId}:null
  };
  return base;
}

function publicGame(game,viewerId){
  if(!game)return null;
  if(game.type==='sync'){
    return {type:'sync',prompt:game.prompt,submitted:Object.keys(game.answers),myAnswer:game.answers[viewerId]?.label??null};
  }
  if(game.type==='bomb')return {...game,passes:undefined};
  if(game.type==='five')return {...game};
  return game;
}

export function startParty(state){
  if(state.players.length<2)throw new Error('NEED_TWO_PLAYERS');
  state.phase='game';state.party={round:0,totalRounds:SCHEDULE.length,schedule:[...SCHEDULE],scores:Array(state.players.length).fill(0)};
  state.lastResult=null;state.game=createGame(state,state.party.schedule[0]);state.updatedAt=Date.now();
}

export function applyIntent(state,actorId,intent,now=Date.now()){
  if(!intent||typeof intent.type!=='string')throw new Error('BAD_INTENT');
  const actorIndex=state.players.findIndex(p=>p.id===actorId);
  if(actorIndex<0)throw new Error('UNAUTHORIZED');
  const isHost=actorId===state.hostId;

  if(intent.type==='START_PARTY'){
    if(!isHost||state.phase!=='lobby')throw new Error('FORBIDDEN');
    startParty(state);return;
  }
  if(intent.type==='NEXT_ROUND'){
    if(!isHost||state.phase!=='round-result')throw new Error('FORBIDDEN');
    state.party.round+=1;
    if(state.party.round>=state.party.totalRounds){state.phase='final';state.game=null;state.updatedAt=now;return;}
    state.phase='game';state.lastResult=null;state.game=createGame(state,state.party.schedule[state.party.round]);state.updatedAt=now;return;
  }
  if(intent.type==='RESTART_PARTY'){
    if(!isHost||state.phase!=='final')throw new Error('FORBIDDEN');
    startParty(state);return;
  }
  if(state.phase!=='game'||!state.game)throw new Error('GAME_NOT_ACTIVE');

  if(state.game.type==='sync')handleSync(state,actorId,intent);
  else if(state.game.type==='bomb')handleBomb(state,actorIndex,intent);
  else if(state.game.type==='five')handleFive(state,actorIndex,isHost,intent,now);
  state.updatedAt=now;
}

function createGame(state,type){
  if(type==='sync'){
    const isFree=Math.random()<0.45;
    const prompt=isFree?{type:'free',q:pick(freePrompts)}:{type:'choice',...pick(choicePrompts)};
    return {type:'sync',prompt,answers:{}};
  }
  if(type==='bomb')return {type:'bomb',n:0,target:rand(18,30),maxStep:rand(2,4),turn:0,passes:Array(state.players.length).fill(true)};
  const difficulty=Math.random()<0.35?'hard':'normal';
  return {type:'five',difficulty,seconds:difficulty==='hard'?4:5,turn:0,prompt:pick(fivePrompts[difficulty]),deadline:null,rawScores:Array(state.players.length).fill(0)};
}

function handleSync(state,actorId,intent){
  if(intent.type!=='SYNC_ANSWER'||state.game.answers[actorId])throw new Error('INVALID_ACTION');
  const prompt=state.game.prompt;
  let key,label;
  if(prompt.type==='choice'){
    const idx=Number(intent.value);if(!Number.isInteger(idx)||idx<0||idx>=prompt.a.length)throw new Error('INVALID_ANSWER');
    key=`c${idx}`;label=prompt.a[idx];
  }else{
    label=String(intent.value??'').trim().slice(0,30);key=norm(label);if(!key)throw new Error('INVALID_ANSWER');
  }
  state.game.answers[actorId]={key,label};
  if(Object.keys(state.game.answers).length===state.players.length){
    const counts={};Object.values(state.game.answers).forEach(a=>counts[a.key]=(counts[a.key]||0)+1);
    const raw=state.players.map(p=>Math.max(0,(counts[state.game.answers[p.id].key]||1)-1));
    finishRound(state,raw,{type:'sync',answers:state.players.map(p=>({playerId:p.id,name:p.name,answer:state.game.answers[p.id].label}))});
  }
}

function handleBomb(state,actorIndex,intent){
  const g=state.game;if(actorIndex!==g.turn)throw new Error('NOT_YOUR_TURN');
  if(intent.type==='BOMB_PASS'){
    if(!g.passes[actorIndex])throw new Error('NO_PASS');g.passes[actorIndex]=false;g.turn=(g.turn+1)%state.players.length;return;
  }
  if(intent.type!=='BOMB_MOVE')throw new Error('INVALID_ACTION');
  const value=Number(intent.value);if(!Number.isInteger(value)||value<1||value>g.maxStep)throw new Error('INVALID_MOVE');
  g.n+=value;
  if(g.n>=g.target){
    const raw=state.players.map((_,i)=>i===actorIndex?0:1);
    finishRound(state,raw,{type:'bomb',loserId:state.players[actorIndex].id,target:g.target});
  }else g.turn=(g.turn+1)%state.players.length;
}

function handleFive(state,actorIndex,isHost,intent,now){
  const g=state.game;
  if(intent.type==='FIVE_START'){
    if(actorIndex!==g.turn||g.deadline)throw new Error('INVALID_ACTION');
    g.deadline=now+g.seconds*1000;return;
  }
  if(intent.type==='FIVE_JUDGE'){
    if(!isHost||!g.deadline||now<g.deadline-150)throw new Error('INVALID_ACTION');
    if(intent.success)g.rawScores[g.turn]+=1;
    g.turn+=1;
    if(g.turn>=state.players.length){finishRound(state,g.rawScores,{type:'five'});return;}
    g.prompt=pick(fivePrompts[g.difficulty]);g.deadline=null;return;
  }
  throw new Error('INVALID_ACTION');
}

function finishRound(state,rawScores,details){
  const awards=rankAwards(rawScores);
  state.party.scores=state.party.scores.map((s,i)=>s+awards[i]);
  state.phase='round-result';
  state.lastResult={game:state.game.type,rawScores,awards,details};
  state.game=null;
}

export function rankAwards(rawScores){
  const unique=[...new Set(rawScores)].sort((a,b)=>b-a);
  return rawScores.map(score=>{const rank=unique.indexOf(score);return rank===0?3:rank===1?2:rank===2?1:0});
}
