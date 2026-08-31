const HISTORY_KEY='partyPocketPartyHistoryV1';
const ACTIVE_KEY='partyPocketPartyActiveV1';
const MAX_HISTORY=50;

function readJson(storage,key,fallback){
  try{const raw=storage?.getItem?.(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}
function cleanPlayers(players){return Array.isArray(players)?players.map(v=>String(v)).filter(Boolean).slice(0,8):[]}
function cleanNumbers(values,length){return Array.isArray(values)?values.slice(0,length).map(v=>Number(v)||0):Array(length).fill(0)}
function cleanSchedule(schedule){return Array.isArray(schedule)?schedule.map(String).filter(Boolean).slice(0,50):[]}
function normalizeRound(round,playerCount){
  if(!round||typeof round!=='object'||!round.gameId)return null;
  return{
    gameId:String(round.gameId),
    gameScores:cleanNumbers(round.gameScores,playerCount),
    awards:cleanNumbers(round.awards,playerCount),
    cumulativeScores:cleanNumbers(round.cumulativeScores,playerCount),
    winners:Array.isArray(round.winners)?[...new Set(round.winners.map(Number).filter(i=>Number.isInteger(i)&&i>=0&&i<playerCount))]:[],
    at:Number(round.at)||0
  };
}
function normalizeParty(value){
  if(!value||typeof value!=='object')return null;
  const players=cleanPlayers(value.players),schedule=cleanSchedule(value.schedule);
  if(players.length<2||schedule.length<2)return null;
  const rounds=(Array.isArray(value.rounds)?value.rounds:[]).map(r=>normalizeRound(r,players.length)).filter(Boolean).slice(0,schedule.length);
  return{
    id:String(value.id||''),
    players,
    schedule,
    rounds,
    finalScores:cleanNumbers(value.finalScores,players.length),
    winners:Array.isArray(value.winners)?[...new Set(value.winners.map(Number).filter(i=>Number.isInteger(i)&&i>=0&&i<players.length))]:[],
    startedAt:Number(value.startedAt)||0,
    completedAt:Number(value.completedAt)||0,
    partial:Boolean(value.partial)
  };
}

export class PartyHistoryStore{
  constructor(storage=globalThis.localStorage,now=()=>Date.now()){this.storage=storage;this.now=now}
  active(){
    return normalizeParty(readJson(this.storage,ACTIVE_KEY,null));
  }
  begin({players,schedule}){
    const now=this.now(),party=normalizeParty({
      id:'party-'+now,
      players,
      schedule,
      rounds:[],
      finalScores:Array(players.length).fill(0),
      winners:[],
      startedAt:now,
      completedAt:0,
      partial:false
    });
    if(!party)throw new Error('invalid party');
    this.storage?.setItem?.(ACTIVE_KEY,JSON.stringify(party));
    return party;
  }
  ensureActive({players,schedule}){
    const current=this.active();
    const same=current&&current.players.length===players.length&&current.players.every((p,i)=>p===players[i])&&
      current.schedule.length===schedule.length&&current.schedule.every((id,i)=>id===schedule[i]);
    if(same)return current;
    const created=this.begin({players,schedule});
    created.partial=true;
    this.storage?.setItem?.(ACTIVE_KEY,JSON.stringify(created));
    return created;
  }
  recordRound({players,schedule,gameId,gameScores,awards,cumulativeScores,winners,at}){
    const active=this.ensureActive({players,schedule}),index=active.rounds.length;
    if(index>=active.schedule.length)return active;
    const round=normalizeRound({
      gameId,
      gameScores,
      awards,
      cumulativeScores,
      winners,
      at:at??this.now()
    },active.players.length);
    if(!round)throw new Error('invalid party round');
    active.rounds.push(round);
    this.storage?.setItem?.(ACTIVE_KEY,JSON.stringify(active));
    return active;
  }
  complete({finalScores,winners,at}={}){
    const active=this.active();if(!active)return null;
    active.finalScores=cleanNumbers(finalScores,active.players.length);
    active.winners=Array.isArray(winners)?[...new Set(winners.map(Number).filter(i=>Number.isInteger(i)&&i>=0&&i<active.players.length))]:[];
    active.completedAt=Number(at)||this.now();
    const history=[active,...this.history().filter(p=>p.id!==active.id)].slice(0,MAX_HISTORY);
    this.storage?.setItem?.(HISTORY_KEY,JSON.stringify(history));
    this.storage?.removeItem?.(ACTIVE_KEY);
    return active;
  }
  abandon(){this.storage?.removeItem?.(ACTIVE_KEY)}
  history(validGameIds=[]){
    const valid=validGameIds.length?new Set(validGameIds):null;
    const raw=readJson(this.storage,HISTORY_KEY,[]);
    const rows=(Array.isArray(raw)?raw:[]).map(normalizeParty).filter(Boolean);
    if(!valid)return rows.slice(0,MAX_HISTORY);
    return rows.map(p=>({
      ...p,
      schedule:p.schedule.filter(id=>valid.has(id)),
      rounds:p.rounds.filter(r=>valid.has(r.gameId))
    })).filter(p=>p.schedule.length>=2).slice(0,MAX_HISTORY);
  }
  get(id,validGameIds=[]){return this.history(validGameIds).find(p=>p.id===id)||null}
  clear(){this.storage?.setItem?.(HISTORY_KEY,'[]');this.abandon()}
}

export function partyMvp(entry){
  if(!entry||!entry.players?.length)return null;
  const wins=Array(entry.players.length).fill(0);
  for(const round of entry.rounds||[])for(const i of round.winners||[])wins[i]++;
  const max=Math.max(...wins);
  if(max<=0)return null;
  const indexes=wins.map((v,i)=>v===max?i:-1).filter(i=>i>=0);
  return{indexes,wins:max,names:indexes.map(i=>entry.players[i])};
}

export function partyLeadChanges(entry){
  if(!entry?.rounds?.length)return 0;
  let previous='',changes=0;
  for(const round of entry.rounds){
    const max=Math.max(...round.cumulativeScores);
    const leaders=round.cumulativeScores.map((v,i)=>v===max?i:-1).filter(i=>i>=0).join(',');
    if(previous&&leaders!==previous)changes++;
    previous=leaders;
  }
  return changes;
}

export const PARTY_HISTORY_LIMIT=MAX_HISTORY;
