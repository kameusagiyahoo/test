const STATS_KEY='partyPocketStatsV1';
const MAX_HISTORY=200;
const SOLO_DIFFICULTIES=new Set(['easy','normal','hard']);

function readJson(storage,key,fallback){
  try{const raw=storage?.getItem?.(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}

function normalizeEntry(entry){
  if(!entry||typeof entry!=='object'||!entry.gameId)return null;
  const players=Array.isArray(entry.players)?entry.players.map(v=>String(v)).filter(Boolean):[];
  const scores=Array.isArray(entry.scores)?entry.scores.map(v=>Number(v)||0):[];
  const winners=Array.isArray(entry.winners)?entry.winners.map(Number).filter(i=>Number.isInteger(i)&&i>=0&&i<players.length):[];
  if(!players.length||scores.length!==players.length)return null;
  return{
    gameId:String(entry.gameId),
    mode:entry.mode==='party'?'party':'single',
    players,
    scores,
    winners:[...new Set(winners)],
    difficulty:SOLO_DIFFICULTIES.has(entry.difficulty)?entry.difficulty:null,
    clearRounds:Number.isInteger(entry.clearRounds)&&entry.clearRounds>0?entry.clearRounds:null,
    at:Number(entry.at)||Date.now()
  };
}

export class StatsStore{
  constructor(storage=globalThis.localStorage,now=()=>Date.now()){this.storage=storage;this.now=now}
  history(){
    const raw=readJson(this.storage,STATS_KEY,[]);
    return (Array.isArray(raw)?raw:[]).map(normalizeEntry).filter(Boolean).slice(0,MAX_HISTORY);
  }
  save(entries){
    const value=entries.map(normalizeEntry).filter(Boolean).slice(0,MAX_HISTORY);
    this.storage?.setItem?.(STATS_KEY,JSON.stringify(value));
    return value;
  }
  record({gameId,mode='single',players,scores,winners,difficulty=null,clearRounds=null,at}){
    const entry=normalizeEntry({gameId,mode,players,scores,winners,difficulty,clearRounds,at:at??this.now()});
    if(!entry)throw new Error('invalid stats entry');
    this.save([entry,...this.history()]);
    return entry;
  }
  clear(){this.storage?.setItem?.(STATS_KEY,'[]')}
  report(validGameIds=[]){
    const allowed=validGameIds.length?new Set(validGameIds):null;
    const entries=this.history().filter(e=>!allowed||allowed.has(e.gameId));
    const players=new Map(),games=new Map();
    for(const entry of entries){
      let game=games.get(entry.gameId);
      if(!game){game={gameId:entry.gameId,plays:0,single:0,party:0,players:new Map()};games.set(entry.gameId,game)}
      game.plays++;game[entry.mode]++;
      entry.players.forEach((name,i)=>{
        const won=entry.winners.includes(i);
        const p=players.get(name)||{name,plays:0,wins:0,single:0,party:0};
        p.plays++;p[entry.mode]++;if(won)p.wins++;players.set(name,p);
        const gp=game.players.get(name)||{name,plays:0,wins:0};
        gp.plays++;if(won)gp.wins++;game.players.set(name,gp);
      });
    }
    const playerStats=[...players.values()].map(p=>({...p,winRate:p.plays?p.wins/p.plays:0}))
      .sort((a,b)=>b.wins-a.wins||b.winRate-a.winRate||b.plays-a.plays||a.name.localeCompare(b.name,'ja'));
    const gameStats=[...games.values()].map(g=>{
      const leaders=[...g.players.values()].map(p=>({...p,winRate:p.plays?p.wins/p.plays:0}))
        .sort((a,b)=>b.wins-a.wins||b.winRate-a.winRate||b.plays-a.plays||a.name.localeCompare(b.name,'ja'));
      return{gameId:g.gameId,plays:g.plays,single:g.single,party:g.party,playerCount:g.players.size,leader:leaders[0]||null};
    }).sort((a,b)=>b.plays-a.plays||a.gameId.localeCompare(b.gameId));
    return{
      totalPlays:entries.length,
      singlePlays:entries.filter(e=>e.mode==='single').length,
      partyRounds:entries.filter(e=>e.mode==='party').length,
      gamesPlayed:gameStats.length,
      playerStats,
      gameStats,
      recent:entries.slice(0,20)
    };
  }
}

export function winnerIndexesFromScores(scores){
  if(!Array.isArray(scores)||!scores.length)return[];
  const max=Math.max(...scores.map(Number));
  if(!Number.isFinite(max)||max<=0)return[];
  return scores.map((score,i)=>Number(score)===max?i:-1).filter(i=>i>=0);
}
