const PLAYER_KEY='partyPocketPlayersV3';
const LEGACY_PLAYER_KEYS=['partyPocketPlayersV2','partyPocketPlayers'];

function safePlayers(storage){
  try{
    for(const key of [PLAYER_KEY,...LEGACY_PLAYER_KEYS]){
      const value=storage?.getItem?.(key);
      if(value){const parsed=JSON.parse(value);if(Array.isArray(parsed)&&parsed.length>=2)return parsed}
    }
  }catch{}
  return ['プレイヤー1','プレイヤー2'];
}

function shuffled(values,rng=Math.random){
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
  return result;
}

export function buildPartySchedule(gameIds,totalRounds=6,rng=Math.random){
  if(!gameIds.length||totalRounds<=0)return [];
  const schedule=[];
  while(schedule.length<totalRounds){
    const pool=shuffled(gameIds,rng);
    if(schedule.length&&pool.length>1&&pool[0]===schedule.at(-1)) [pool[0],pool[1]]=[pool[1],pool[0]];
    schedule.push(...pool.slice(0,totalRounds-schedule.length));
  }
  return schedule;
}

export function buildBalancedSchedule(gameIds,repeats=2,rng=Math.random){
  return buildPartySchedule(gameIds,gameIds.length*repeats,rng);
}

export function partyAwards(scores){
  const distinct=[...new Set(scores)].sort((a,b)=>b-a);
  const points=[3,2,1];
  return scores.map(score=>points[distinct.indexOf(score)]||0);
}

export function rankScores(scores){
  const ordered=scores.map((score,index)=>({index,score})).sort((a,b)=>b.score-a.score||a.index-b.index);
  return ordered.map((row,pos)=>({
    ...row,
    rank:pos===0?1:(row.score===ordered[pos-1].score?ordered[pos-1].rank:pos+1)
  }));
}

export class SessionStore{
  constructor({storage=globalThis.localStorage,transport=null}={}){
    this.storage=storage;this.transport=transport;
    this.players=safePlayers(storage);
    this.scores=Array(this.players.length).fill(0);
    this.partyScores=Array(this.players.length).fill(0);
    this.mode='single';
    this.party={round:0,totalRounds:0,schedule:[],active:false,lastAward:null};
  }
  snapshot(){return{players:[...this.players],scores:[...this.scores],partyScores:[...this.partyScores],mode:this.mode,party:{...this.party,schedule:[...this.party.schedule]}}}
  emit(){this.transport?.publish?.('session:state',this.snapshot())}
  savePlayers(names){
    this.players=names.map((n,i)=>(n||'').trim()||`プレイヤー${i+1}`);
    this.storage?.setItem?.(PLAYER_KEY,JSON.stringify(this.players));
    this.resetScores();this.partyScores=Array(this.players.length).fill(0);this.emit();
  }
  resetScores(){this.scores=Array(this.players.length).fill(0)}
  addScore(index,points=1){this.scores[index]=(this.scores[index]||0)+points;this.emit()}
  startSingle(){this.mode='single';this.party.active=false;this.resetScores();this.emit()}
  startParty(gameIds,totalRounds=6,rng=Math.random){
    this.mode='party';this.resetScores();this.partyScores=Array(this.players.length).fill(0);
    const schedule=buildPartySchedule(gameIds,totalRounds,rng);
    this.party={round:0,totalRounds:schedule.length,schedule,active:true,lastAward:null};this.emit();
  }
  currentPartyGame(){return this.party.schedule[this.party.round]}
  finishPartyRound(){
    const gameScores=[...this.scores],awards=partyAwards(gameScores);
    awards.forEach((p,i)=>this.partyScores[i]+=p);
    this.party.lastAward={gameScores,awards};
    this.party.round+=1;this.resetScores();this.emit();
    return{finished:this.party.round>=this.party.totalRounds,gameScores,awards};
  }
  winnerIndexes(useParty=false){
    const source=useParty?this.partyScores:this.scores,best=Math.max(...source);
    return source.map((s,i)=>s===best?i:-1).filter(i=>i>=0);
  }
}

export function normalizeAnswer(value){
  return value.normalize('NFKC').trim().toLowerCase().replace(/[\s　、。,.!?！？ー-]/g,'');
}
