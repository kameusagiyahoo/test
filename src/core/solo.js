const SOLO_KEY='partyPocketSoloProgressV1';
export const SOLO_GAME_IDS=['memory','route','pattern'];

function readJson(storage,key,fallback){
  try{const raw=storage?.getItem?.(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}

function ymd(date=new Date()){
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+d;
}

function dayNumber(date=new Date()){
  const localMidnight=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  return Math.floor(localMidnight.getTime()/86400000);
}

export function dailySoloGameId(date=new Date()){
  return SOLO_GAME_IDS[((dayNumber(date)%SOLO_GAME_IDS.length)+SOLO_GAME_IDS.length)%SOLO_GAME_IDS.length];
}

export function dailyTarget(date=new Date()){
  const gameId=dailySoloGameId(date);
  const targets={memory:4,route:4,pattern:4};
  return{date:ymd(date),gameId,maxRounds:targets[gameId]};
}

function normalize(data){
  const games={};
  for(const id of SOLO_GAME_IDS){
    const raw=data?.games?.[id]||{};
    games[id]={
      plays:Number(raw.plays)||0,
      clears:Number(raw.clears)||0,
      bestRounds:Number.isInteger(raw.bestRounds)&&raw.bestRounds>0?raw.bestRounds:null,
      bestStreak:Number(raw.bestStreak)||0
    };
  }
  return{
    games,
    dailyClears:Array.isArray(data?.dailyClears)?[...new Set(data.dailyClears.filter(v=>typeof v==='string'))].sort():[]
  };
}

export class SoloProgressStore{
  constructor(storage=globalThis.localStorage){this.storage=storage}
  state(){return normalize(readJson(this.storage,SOLO_KEY,{}))}
  save(value){
    const state=normalize(value);
    this.storage?.setItem?.(SOLO_KEY,JSON.stringify(state));
    return state;
  }
  recordRun(gameId,{rounds,maxStreak,completed=true,date=new Date()}){
    if(!SOLO_GAME_IDS.includes(gameId))return this.state();
    const state=this.state(),g=state.games[gameId];
    g.plays++;
    g.bestStreak=Math.max(g.bestStreak,Number(maxStreak)||0);
    if(completed){
      g.clears++;
      if(Number.isInteger(rounds)&&rounds>0)g.bestRounds=g.bestRounds==null?rounds:Math.min(g.bestRounds,rounds);
      const daily=dailyTarget(date);
      if(daily.gameId===gameId&&rounds<=daily.maxRounds&&!state.dailyClears.includes(daily.date))state.dailyClears.push(daily.date);
    }
    return this.save(state);
  }
  game(gameId){return this.state().games[gameId]||null}
  daily(date=new Date()){
    const state=this.state(),target=dailyTarget(date);
    return{...target,cleared:state.dailyClears.includes(target.date),streak:this.dailyStreak(date)};
  }
  dailyStreak(date=new Date()){
    const clears=new Set(this.state().dailyClears);
    let streak=0,cursor=new Date(date.getFullYear(),date.getMonth(),date.getDate());
    while(clears.has(ymd(cursor))){
      streak++;cursor.setDate(cursor.getDate()-1);
    }
    return streak;
  }
  summary(){
    const state=this.state();
    return{
      totalRuns:SOLO_GAME_IDS.reduce((s,id)=>s+state.games[id].plays,0),
      totalClears:SOLO_GAME_IDS.reduce((s,id)=>s+state.games[id].clears,0),
      bestStreak:Math.max(0,...SOLO_GAME_IDS.map(id=>state.games[id].bestStreak))
    };
  }
}
