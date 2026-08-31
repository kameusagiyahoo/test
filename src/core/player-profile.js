import {partyMvp} from './party-history.js';

function pct(value){return Math.round((Number(value)||0)*100)}

function compareGameRows(a,b){
  return b.wins-a.wins||b.winRate-a.winRate||b.plays-a.plays||a.gameId.localeCompare(b.gameId);
}

function normalizeStatsEntries(entries=[]){
  return (Array.isArray(entries)?entries:[]).filter(entry=>entry&&Array.isArray(entry.players)&&Array.isArray(entry.winners));
}

function normalizeParties(entries=[]){
  return (Array.isArray(entries)?entries:[]).filter(entry=>entry&&Array.isArray(entry.players)&&Array.isArray(entry.finalScores));
}

export function buildPlayerProfile(name,statsEntries=[],partyEntries=[]){
  const stats=normalizeStatsEntries(statsEntries),parties=normalizeParties(partyEntries);
  const gameMap=new Map();
  let plays=0,wins=0,singlePlays=0,partyRounds=0;

  for(const entry of stats){
    const indexes=entry.players.map((player,i)=>player===name?i:-1).filter(i=>i>=0);
    if(!indexes.length)continue;
    for(const index of indexes){
      plays++;
      if(entry.mode==='single')singlePlays++;else partyRounds++;
      const won=entry.winners.includes(index);
      if(won)wins++;
      const row=gameMap.get(entry.gameId)||{gameId:entry.gameId,plays:0,wins:0};
      row.plays++;if(won)row.wins++;gameMap.set(entry.gameId,row);
    }
  }

  const gameStats=[...gameMap.values()].map(row=>({...row,winRate:row.plays?row.wins/row.plays:0})).sort(compareGameRows);
  const established=gameStats.filter(row=>row.plays>=2);
  const bestGame=(established[0]||gameStats[0]||null);

  let partySessions=0,partyWins=0,mvpCount=0,partyPoints=0;
  const rivals=new Map(),recentParty=[];
  for(const entry of parties){
    const index=entry.players.indexOf(name);if(index<0)continue;
    partySessions++;
    const won=entry.winners?.includes(index);
    if(won)partyWins++;
    partyPoints+=Number(entry.finalScores[index])||0;
    const mvp=partyMvp(entry);
    if(mvp?.indexes?.includes(index))mvpCount++;

    const myScore=Number(entry.finalScores[index])||0;
    for(let i=0;i<entry.players.length;i++){
      if(i===index)continue;
      const rivalName=entry.players[i],theirScore=Number(entry.finalScores[i])||0;
      const row=rivals.get(rivalName)||{name:rivalName,meetings:0,wins:0,draws:0,losses:0};
      row.meetings++;
      if(myScore>theirScore)row.wins++;
      else if(myScore<theirScore)row.losses++;
      else row.draws++;
      rivals.set(rivalName,row);
    }

    const max=Math.max(...entry.finalScores.map(Number));
    const leaders=entry.finalScores.map((v,i)=>Number(v)===max?i:-1).filter(i=>i>=0);
    recentParty.push({
      id:entry.id,
      completedAt:entry.completedAt,
      score:myScore,
      result:leaders.includes(index)?(leaders.length>1?'draw':'win'):'loss'
    });
  }

  const rivalStats=[...rivals.values()].map(row=>({
    ...row,
    winRate:row.meetings?row.wins/row.meetings:0
  })).sort((a,b)=>b.meetings-a.meetings||b.wins-a.wins||a.name.localeCompare(b.name,'ja'));

  return{
    name,
    plays,wins,winRate:plays?wins/plays:0,
    singlePlays,partyRounds,
    gamesPlayed:gameStats.length,
    gameStats,
    bestGame,
    partySessions,
    partyWins,
    partyWinRate:partySessions?partyWins/partySessions:0,
    mvpCount,
    partyPoints,
    rivals:rivalStats,
    recentParty:recentParty.slice(0,5),
    winRatePercent:pct(plays?wins/plays:0),
    partyWinRatePercent:pct(partySessions?partyWins/partySessions:0)
  };
}

export function buildPlayerProfiles(statsEntries=[],partyEntries=[]){
  const names=[];
  for(const entry of normalizeStatsEntries(statsEntries))for(const name of entry.players)if(!names.includes(name))names.push(name);
  for(const entry of normalizeParties(partyEntries))for(const name of entry.players)if(!names.includes(name))names.push(name);
  return names.map(name=>buildPlayerProfile(name,statsEntries,partyEntries))
    .sort((a,b)=>b.wins-a.wins||b.winRate-a.winRate||b.partyWins-a.partyWins||a.name.localeCompare(b.name,'ja'));
}

export function topPlayerRecords(profiles=[]){
  const rows=Array.isArray(profiles)?profiles:[];
  const by=(selector,filter=()=>true)=>rows.filter(filter).sort((a,b)=>selector(b)-selector(a)||b.plays-a.plays||a.name.localeCompare(b.name,'ja'))[0]||null;
  return{
    mostWins:by(p=>p.wins,p=>p.plays>0),
    bestWinRate:by(p=>p.winRate,p=>p.plays>=5),
    mostPartyWins:by(p=>p.partyWins,p=>p.partySessions>0),
    mostMvp:by(p=>p.mvpCount,p=>p.partySessions>0)
  };
}
