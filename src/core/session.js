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

export function buildBalancedSchedule(gameIds,repeats=2,rng=Math.random){
  const schedule=[];
  for(let r=0;r<repeats;r++)schedule.push(...gameIds);
  for(let i=schedule.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[schedule[i],schedule[j]]=[schedule[j],schedule[i]]}
  return schedule;
}

export function partyAwards(scores){
  const distinct=[...new Set(scores)].sort((a,b)=>b-a);
  const points=[3,2,1];
  return scores.map(score=>points[distinct.indexOf(score)]||0);
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
  startParty(gameIds,repeats=2,rng=Math.random){
    this.mode='party';this.resetScores();this.partyScores=Array(this.players.length).fill(0);
    const schedule=buildBalancedSchedule(gameIds,repeats,rng);
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
