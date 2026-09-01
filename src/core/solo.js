const SOLO_KEY='partyPocketSoloProgressV1';
export const SOLO_GAME_IDS=['memory','route','pattern'];
export const SOLO_DIFFICULTIES=['easy','normal','hard'];

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

function normalizeDifficulty(value){
  return SOLO_DIFFICULTIES.includes(value)?value:'normal';
}

export function soloDifficultyLabel(value){
  const labels={easy:'Easy',normal:'Normal',hard:'Hard'};
  return labels[normalizeDifficulty(value)];
}

export function dailySoloGameId(date=new Date()){
  return SOLO_GAME_IDS[((dayNumber(date)%SOLO_GAME_IDS.length)+SOLO_GAME_IDS.length)%SOLO_GAME_IDS.length];
}

export function dailySoloDifficulty(date=new Date()){
  const block=Math.floor(dayNumber(date)/SOLO_GAME_IDS.length);
  return SOLO_DIFFICULTIES[((block%SOLO_DIFFICULTIES.length)+SOLO_DIFFICULTIES.length)%SOLO_DIFFICULTIES.length];
}

export function dailyTarget(date=new Date()){
  const gameId=dailySoloGameId(date),difficulty=dailySoloDifficulty(date);
  const targets={easy:4,normal:4,hard:5};
  return{date:ymd(date),gameId,difficulty,maxRounds:targets[difficulty]};
}

function emptyTier(){return{plays:0,clears:0,bestRounds:null,bestStreak:0}}

function normalizeTier(raw={}){
  return{
    plays:Number(raw.plays)||0,
    clears:Number(raw.clears)||0,
    bestRounds:Number.isInteger(raw.bestRounds)&&raw.bestRounds>0?raw.bestRounds:null,
    bestStreak:Number(raw.bestStreak)||0
  };
}

function normalizeGame(raw={}){
  const hasTiers=raw?.difficulties&&typeof raw.difficulties==='object';
  const difficulties={};
  for(const difficulty of SOLO_DIFFICULTIES){
    if(hasTiers)difficulties[difficulty]=normalizeTier(raw.difficulties[difficulty]);
    else difficulties[difficulty]=difficulty==='normal'?normalizeTier(raw):emptyTier();
  }
  const tiers=SOLO_DIFFICULTIES.map(id=>difficulties[id]);
  return{
    plays:tiers.reduce((sum,tier)=>sum+tier.plays,0),
    clears:tiers.reduce((sum,tier)=>sum+tier.clears,0),
    bestRounds:tiers.map(tier=>tier.bestRounds).filter(Number.isInteger).sort((a,b)=>a-b)[0]??null,
    bestStreak:Math.max(0,...tiers.map(tier=>tier.bestStreak)),
    difficulties
  };
}

function normalize(data){
  const games={};
  for(const id of SOLO_GAME_IDS)games[id]=normalizeGame(data?.games?.[id]||{});
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
  recordRun(gameId,{rounds,maxStreak,completed=true,date=new Date(),difficulty='normal'}){
    if(!SOLO_GAME_IDS.includes(gameId))return this.state();
    const level=normalizeDifficulty(difficulty),state=this.state(),tier=state.games[gameId].difficulties[level];
    tier.plays++;
    tier.bestStreak=Math.max(tier.bestStreak,Number(maxStreak)||0);
    if(completed){
      tier.clears++;
      if(Number.isInteger(rounds)&&rounds>0)tier.bestRounds=tier.bestRounds==null?rounds:Math.min(tier.bestRounds,rounds);
      const daily=dailyTarget(date);
      if(daily.gameId===gameId&&daily.difficulty===level&&rounds<=daily.maxRounds&&!state.dailyClears.includes(daily.date))state.dailyClears.push(daily.date);
    }
    return this.save(state);
  }
  game(gameId,difficulty=null){
    const game=this.state().games[gameId]||null;
    if(!game||difficulty==null)return game;
    return game.difficulties[normalizeDifficulty(difficulty)]||null;
  }
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

export function normalizeSoloDifficulty(value){return normalizeDifficulty(value)}
