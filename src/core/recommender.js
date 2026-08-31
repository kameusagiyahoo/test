import {categoriesFor,fitsRecommendedPlayers,gameMeta} from './catalog.js';

function uniq(values){return [...new Set(values.filter(Boolean))]}

export function recentGameIdsForPlayers(entries,players,limit=8){
  const target=Array.isArray(players)?players:[];
  const result=[];
  for(const entry of entries||[]){
    if(entry?.mode!=='party'||!Array.isArray(entry.players))continue;
    const same=entry.players.length===target.length&&entry.players.every((name,i)=>name===target[i]);
    if(!same)continue;
    if(!result.includes(entry.gameId))result.push(entry.gameId);
    if(result.length>=limit)break;
  }
  return result;
}

function mapById(rows=[]){return new Map(rows.map(row=>[row.gameId,row]))}

export function scorePartyGame(game,{
  playerCount=2,
  favoriteIds=[],
  recentIds=[],
  playtestRows=[],
  healthRows=[]
}={}){
  const favoriteSet=new Set(favoriteIds),recent=uniq(recentIds);
  const p=mapById(playtestRows).get(game.id);
  const h=mapById(healthRows).get(game.id);
  let score=0;
  const reasons=[];

  if(fitsRecommendedPlayers(game.id,playerCount)){score+=6;reasons.push('人数に合う')}
  else score-=2;

  if(favoriteSet.has(game.id)){score+=2.5;reasons.push('お気に入り')}

  const recentIndex=recent.indexOf(game.id);
  if(recentIndex>=0){
    score-=Math.max(1,4-recentIndex*.5);
    reasons.push('最近プレイ済み');
  }else{
    score+=1;
  }

  if(Number.isFinite(p?.qualityAverage)){
    const delta=(p.qualityAverage-3.5)*1.4;
    score+=delta;
    if(p.qualityAverage>=4)reasons.push('高評価');
  }

  if(h?.status==='healthy'){score+=1.25;reasons.push('健全')}
  else if(h?.status==='watch')score-=1.5;
  else if(h?.status==='action')score-=4;

  const meta=gameMeta(game.id);
  if(meta.minutes<=5){score+=.3}
  return{gameId:game.id,score,reasons};
}

function noveltyBonus(game,selected){
  if(!selected.length)return 0;
  const used=new Set(selected.flatMap(item=>categoriesFor(item.id)));
  const cats=categoriesFor(game.id).filter(id=>id!=='solo'&&id!=='duel');
  const fresh=cats.filter(id=>!used.has(id)).length;
  const overlap=cats.filter(id=>used.has(id)).length;
  return fresh*1.4-overlap*.25;
}

function difficultyBonus(game,selected){
  if(!selected.length)return 0;
  const level=gameMeta(game.id).difficulty;
  const seen=new Set(selected.map(item=>gameMeta(item.id).difficulty));
  return seen.has(level)?0:.8;
}

export function buildSmartParty(games,{
  playerCount=2,
  rounds=3,
  favoriteIds=[],
  recentIds=[],
  playtestRows=[],
  healthRows=[],
  allowedGameIds=null,
  rng=Math.random
}={}){
  const allowed=allowedGameIds?new Set(allowedGameIds):null;
  const pool=(games||[]).filter(game=>!allowed||allowed.has(game.id));
  if(playerCount<2||!pool.length||rounds<1)return[];

  const baseScores=new Map(pool.map(game=>{
    const row=scorePartyGame(game,{playerCount,favoriteIds,recentIds,playtestRows,healthRows});
    return[game.id,row];
  }));

  const selected=[];
  const remaining=[...pool];
  while(selected.length<Math.min(rounds,pool.length)){
    const ranked=remaining.map(game=>{
      const base=baseScores.get(game.id);
      const adjusted=base.score+noveltyBonus(game,selected)+difficultyBonus(game,selected)+rng()*.001;
      return{game,adjusted,base};
    }).sort((a,b)=>b.adjusted-a.adjusted||a.game.id.localeCompare(b.game.id));
    const winner=ranked[0];
    selected.push(winner.game);
    const idx=remaining.findIndex(g=>g.id===winner.game.id);
    remaining.splice(idx,1);
  }
  return selected;
}

export function buildSmartPartyWithLocks(games,{
  playerCount=2,
  rounds=3,
  favoriteIds=[],
  recentIds=[],
  playtestRows=[],
  healthRows=[],
  allowedGameIds=null,
  lockedIds=[],
  rng=Math.random
}={}){
  const allowed=allowedGameIds?new Set(allowedGameIds):null;
  const byId=new Map((games||[]).map(g=>[g.id,g]));
  const locked=uniq(lockedIds).map(id=>byId.get(id)).filter(game=>game&&(!allowed||allowed.has(game.id)));
  const remainingRounds=Math.max(0,rounds-locked.length);
  const pool=(games||[]).filter(game=>!locked.some(x=>x.id===game.id));
  const fill=buildSmartParty(pool,{
    playerCount,
    rounds:remainingRounds,
    favoriteIds,
    recentIds,
    playtestRows,
    healthRows,
    allowedGameIds:allowed? [...allowed].filter(id=>!locked.some(x=>x.id===id)):null,
    rng
  });
  return [...locked,...fill].slice(0,rounds);
}

export function replaceSmartPartyGame(games,currentGameIds,targetGameId,{
  playerCount=2,
  favoriteIds=[],
  recentIds=[],
  playtestRows=[],
  healthRows=[],
  allowedGameIds=null,
  rng=Math.random
}={}){
  const selectedIds=uniq(currentGameIds).filter(id=>id!==targetGameId);
  const allowed=allowedGameIds?new Set(allowedGameIds):null;
  const candidates=(games||[]).filter(game=>
    !selectedIds.includes(game.id)&&game.id!==targetGameId&&(!allowed||allowed.has(game.id))
  );
  if(!candidates.length)return null;

  const selected=(games||[]).filter(game=>selectedIds.includes(game.id));
  return candidates.map(game=>{
    const base=scorePartyGame(game,{playerCount,favoriteIds,recentIds,playtestRows,healthRows});
    const adjusted=base.score+noveltyBonus(game,selected)+difficultyBonus(game,selected)+rng()*.001;
    return{game,adjusted};
  }).sort((a,b)=>b.adjusted-a.adjusted||a.game.id.localeCompare(b.game.id))[0]?.game||null;
}

export function smartPartyReasons(game,options={}){
  return scorePartyGame(game,options).reasons;
}

export function summarizeSmartParty(games){
  const totalMinutes=games.reduce((sum,g)=>sum+gameMeta(g.id).minutes,0);
  const categories=uniq(games.flatMap(g=>categoriesFor(g.id)).filter(id=>!['solo','duel'].includes(id)));
  const difficulties=uniq(games.map(g=>gameMeta(g.id).difficulty)).sort();
  return{totalMinutes,categories,difficulties,count:games.length};
}
