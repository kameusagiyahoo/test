const PLAYER_KEY='partyPocketPlayersV3';
const PARTY_KEY='partyPocketPartyCheckpointV1';
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

function safeCheckpoint(storage){
  try{
    const raw=storage?.getItem?.(PARTY_KEY);
    if(!raw)return null;
    const value=JSON.parse(raw);
    if(value?.version!==1||!Array.isArray(value.players)||value.players.length<2)return null;
    if(!Array.isArray(value.partyScores)||value.partyScores.length!==value.players.length)return null;
    if(!Array.isArray(value.party?.schedule)||!Number.isInteger(value.party?.round)||value.party.round<0)return null;
    if(value.party.round>=value.party.schedule.length)return null;
    return value;
  }catch{return null}
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

export function buildBalancedSchedule(gameIds,repeats=2,rng=Math.random){return buildPartySchedule(gameIds,gameIds.length*repeats,rng)}

export function partyAwards(scores){
  const distinct=[...new Set(scores.filter(score=>score>0))].sort((a,b)=>b-a),points=[3,2,1];
  return scores.map(score=>score>0?(points[distinct.indexOf(score)]||0):0);
}

export function rankScores(scores){
  const ordered=scores.map((score,index)=>({index,score})).sort((a,b)=>b.score-a.score||a.index-b.index);
  let previousScore=null,previousRank=0;
  return ordered.map((row,pos)=>{const rank=pos===0||row.score!==previousScore?pos+1:previousRank;previousScore=row.score;previousRank=rank;return{...row,rank}});
}

export class SessionStore{
  constructor({storage=globalThis.localStorage,transport=null}={}){
    this.storage=storage;this.transport=transport;this.players=safePlayers(storage);
    this.scores=Array(this.players.length).fill(0);this.partyScores=Array(this.players.length).fill(0);this.mode='single';
    this.party={round:0,totalRounds:0,schedule:[],active:false,lastAward:null};this.savedParty=safeCheckpoint(storage);
  }
  snapshot(){return{players:[...this.players],scores:[...this.scores],partyScores:[...this.partyScores],mode:this.mode,party:{...this.party,schedule:[...this.party.schedule]}}}
  emit(){this.transport?.publish?.('session:state',this.snapshot())}
  savePlayers(names){
    const normalized=names.map((n,i)=>(n||'').trim()||`プレイヤー${i+1}`);
    const changed=normalized.length!==this.players.length||normalized.some((name,i)=>name!==this.players[i]);
    this.players=normalized;this.storage?.setItem?.(PLAYER_KEY,JSON.stringify(this.players));
    this.resetScores();this.partyScores=Array(this.players.length).fill(0);if(changed)this.clearSavedParty();this.emit();
  }
  resetScores(){this.scores=Array(this.players.length).fill(0)}
  addScore(index,points=1){this.scores[index]=(this.scores[index]||0)+points;this.emit()}
  startSingle(){this.mode='single';this.party.active=false;this.resetScores();this.emit()}
  startParty(gameIds,totalRounds=6,rng=Math.random){
    this.mode='party';this.resetScores();this.partyScores=Array(this.players.length).fill(0);
    const schedule=buildPartySchedule(gameIds,totalRounds,rng);
    this.party={round:0,totalRounds:schedule.length,schedule,active:true,lastAward:null};this.savePartyCheckpoint();this.emit();
  }
  currentPartyGame(){return this.party.schedule[this.party.round]}
  finishPartyRound(){
    const gameScores=[...this.scores],awards=partyAwards(gameScores);awards.forEach((p,i)=>this.partyScores[i]+=p);
    this.party.lastAward={gameScores,awards};this.party.round+=1;this.resetScores();const finished=this.party.round>=this.party.totalRounds;
    if(finished)this.clearSavedParty();else this.savePartyCheckpoint();this.emit();return{finished,gameScores,awards};
  }
  winnerIndexes(useParty=false){const source=useParty?this.partyScores:this.scores,best=Math.max(...source);return source.map((s,i)=>s===best?i:-1).filter(i=>i>=0)}
  savePartyCheckpoint(){
    if(this.mode!=='party'||!this.party.active||!this.party.schedule.length)return;
    const payload={version:1,players:[...this.players],partyScores:[...this.partyScores],party:{...this.party,schedule:[...this.party.schedule],lastAward:null}};
    this.savedParty=payload;this.storage?.setItem?.(PARTY_KEY,JSON.stringify(payload));
  }
  clearSavedParty(){this.savedParty=null;if(this.storage?.removeItem)this.storage.removeItem(PARTY_KEY);else this.storage?.setItem?.(PARTY_KEY,'')}
  savedPartyInfo(){
    const value=this.savedParty;if(!value)return null;
    return{round:value.party.round,totalRounds:value.party.totalRounds,nextGameId:value.party.schedule[value.party.round],players:[...value.players],partyScores:[...value.partyScores]};
  }
  resumeParty(){
    const value=this.savedParty;if(!value)return false;
    this.players=[...value.players];this.storage?.setItem?.(PLAYER_KEY,JSON.stringify(this.players));this.scores=Array(this.players.length).fill(0);
    this.partyScores=[...value.partyScores];this.mode='party';this.party={...value.party,schedule:[...value.party.schedule],active:true,lastAward:null};this.emit();return true;
  }
}

export function normalizeAnswer(value){return value.normalize('NFKC').trim().toLowerCase().replace(/[\s　、。,.!?！？ー-]/g,'')}
