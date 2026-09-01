function safeEntries(entries=[]){
  return (Array.isArray(entries)?entries:[]).filter(e=>e&&e.gameId&&Array.isArray(e.players)&&Array.isArray(e.winners));
}

function pct(value){return Math.round((Number(value)||0)*100)}

function modeShare(count,total){return total?count/total:0}

export function buildGameInsights(gameId,statsEntries=[],playtest={},health=null,{now=Date.now()}={}){
  const entries=safeEntries(statsEntries)
    .filter(entry=>entry.gameId===gameId)
    .sort((a,b)=>(Number(b.at)||0)-(Number(a.at)||0));

  const playerMap=new Map(),playerCounts=new Map();
  let single=0,party=0;
  for(const entry of entries){
    if(entry.mode==='party')party++;else single++;
    const count=entry.players.length;
    playerCounts.set(count,(playerCounts.get(count)||0)+1);
    entry.players.forEach((name,index)=>{
      const row=playerMap.get(name)||{name,plays:0,wins:0};
      row.plays++;
      if(entry.winners.includes(index))row.wins++;
      playerMap.set(name,row);
    });
  }

  const players=[...playerMap.values()]
    .map(row=>({...row,winRate:row.plays?row.wins/row.plays:0}))
    .sort((a,b)=>b.wins-a.wins||b.winRate-a.winRate||b.plays-a.plays||a.name.localeCompare(b.name,'ja'));

  const day=86400000,currentStart=now-30*day,previousStart=now-60*day;
  const current30=entries.filter(e=>Number(e.at)>=currentStart&&Number(e.at)<=now).length;
  const previous30=entries.filter(e=>Number(e.at)>=previousStart&&Number(e.at)<currentStart).length;
  const trendDelta=current30-previous30;

  const axes=['fun','clarity','brain','replay'].map(id=>{
    const axis=playtest?.[id]||{};
    return{id,average:Number.isFinite(axis.average)?axis.average:null,count:Number(axis.count)||0};
  });

  const recent=entries.slice(0,10).map(entry=>({
    at:Number(entry.at)||0,
    mode:entry.mode==='party'?'party':'single',
    players:[...entry.players],
    winners:(entry.winners||[]).map(i=>entry.players[i]).filter(Boolean)
  }));

  return{
    gameId,
    plays:entries.length,
    single,
    party,
    singleShare:modeShare(single,entries.length),
    partyShare:modeShare(party,entries.length),
    current30,
    previous30,
    trendDelta,
    lastPlayedAt:entries[0]?.at||0,
    players,
    playerCountBuckets:[...playerCounts.entries()]
      .map(([playerCount,plays])=>({playerCount,plays,share:modeShare(plays,entries.length)}))
      .sort((a,b)=>a.playerCount-b.playerCount),
    recent,
    reviews:Number(playtest?.responses)||0,
    legacyReviews:Number(playtest?.legacyResponses)||0,
    qualityAverage:Number.isFinite(playtest?.qualityAverage)?playtest.qualityAverage:null,
    axes,
    health:health||{status:'data',issues:[],plays:entries.length,reviews:Number(playtest?.responses)||0}
  };
}

export function gameInsightHeadline(insight){
  if(!insight?.plays)return'まだ実戦データなし';
  if(insight.trendDelta>0)return'直近30日でプレイ増加';
  if(insight.trendDelta<0)return'直近30日でプレイ減少';
  return'直近30日は前期間と同水準';
}

export function trendLabel(insight){
  const delta=Number(insight?.trendDelta)||0;
  return delta>0?'+'+delta:String(delta);
}
