import {partyMvp} from './party-history.js';

const pad=value=>String(value).padStart(2,'0');

export function seasonKeyFromTimestamp(timestamp){
  const date=new Date(Number(timestamp)||0);
  if(Number.isNaN(date.getTime()))return'';
  return date.getFullYear()+'-'+pad(date.getMonth()+1);
}

export function currentSeasonKey(date=new Date()){
  return date.getFullYear()+'-'+pad(date.getMonth()+1);
}

export function previousSeasonKey(key){
  const parts=String(key||'').split('-').map(Number);
  if(parts.length!==2||!parts[0]||!parts[1])return'';
  return currentSeasonKey(new Date(parts[0],parts[1]-2,1));
}

export function seasonLabel(key){
  const parts=String(key||'').split('-').map(Number);
  return parts.length===2&&parts[0]&&parts[1]?parts[0]+'年'+parts[1]+'月':String(key||'');
}

function statsForSeason(entries,key){
  return (Array.isArray(entries)?entries:[]).filter(entry=>seasonKeyFromTimestamp(entry?.at)===key);
}

function partiesForSeason(entries,key){
  return (Array.isArray(entries)?entries:[]).filter(entry=>seasonKeyFromTimestamp(entry?.completedAt)===key);
}

export function availableSeasonKeys(statsEntries=[],partyEntries=[],date=new Date()){
  const keys=new Set([currentSeasonKey(date)]);
  for(const entry of Array.isArray(statsEntries)?statsEntries:[]){const key=seasonKeyFromTimestamp(entry?.at);if(key)keys.add(key)}
  for(const entry of Array.isArray(partyEntries)?partyEntries:[]){const key=seasonKeyFromTimestamp(entry?.completedAt);if(key)keys.add(key)}
  return [...keys].sort().reverse();
}

export function buildSeasonBoard(key,statsEntries=[],partyEntries=[]){
  const stats=statsForSeason(statsEntries,key),parties=partiesForSeason(partyEntries,key),names=[];
  const add=name=>{if(name&&!names.includes(name))names.push(name)};
  for(const entry of stats)for(const name of entry.players||[])add(name);
  for(const entry of parties)for(const name of entry.players||[])add(name);

  const rows=names.map(name=>{
    let plays=0,wins=0,single=0,partyRounds=0;
    const games=new Set();
    for(const entry of stats){
      const indexes=(entry.players||[]).map((player,i)=>player===name?i:-1).filter(i=>i>=0);
      for(const index of indexes){
        plays++;
        if(entry.mode==='single')single++;else partyRounds++;
        if(entry.winners?.includes(index))wins++;
        if(entry.gameId)games.add(entry.gameId);
      }
    }

    let partySessions=0,partyWins=0,mvpCount=0,partyPoints=0;
    for(const entry of parties){
      const index=(entry.players||[]).indexOf(name);
      if(index<0)continue;
      partySessions++;
      if(entry.winners?.includes(index))partyWins++;
      partyPoints+=Number(entry.finalScores?.[index])||0;
      const mvp=partyMvp(entry);
      if(mvp?.indexes?.includes(index))mvpCount++;
    }

    return{
      name,plays,wins,winRate:plays?wins/plays:0,
      single,partyRounds,gamesPlayed:games.size,
      partySessions,partyWins,mvpCount,partyPoints
    };
  }).sort((a,b)=>b.wins-a.wins||b.partyWins-a.partyWins||b.mvpCount-a.mvpCount||b.winRate-a.winRate||b.plays-a.plays||a.name.localeCompare(b.name,'ja'));

  return{
    key,label:seasonLabel(key),rows,
    totalPlays:stats.length,
    partySessions:parties.length,
    players:rows.length,
    gamesPlayed:new Set(stats.map(entry=>entry.gameId).filter(Boolean)).size
  };
}

export function buildSeasonView(key,statsEntries=[],partyEntries=[]){
  const current=buildSeasonBoard(key,statsEntries,partyEntries);
  const previous=buildSeasonBoard(previousSeasonKey(key),statsEntries,partyEntries);
  const previousByName=new Map(previous.rows.map(row=>[row.name,row]));
  return{
    ...current,
    rows:current.rows.map((row,index)=>{
      const before=previousByName.get(row.name)||{};
      return{
        ...row,rank:index+1,
        deltaWins:row.wins-(Number(before.wins)||0),
        deltaPartyWins:row.partyWins-(Number(before.partyWins)||0),
        deltaMvp:row.mvpCount-(Number(before.mvpCount)||0),
        previousPlays:Number(before.plays)||0
      };
    })
  };
}
