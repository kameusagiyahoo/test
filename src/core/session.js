const PLAYER_KEY='partyPocketPlayersV2';

export class SessionStore{
  constructor(){
    this.players=JSON.parse(localStorage.getItem(PLAYER_KEY)||'null')||['プレイヤー1','プレイヤー2'];
    this.scores=Array(this.players.length).fill(0);
    this.mode='single';
    this.party={round:0,totalRounds:5,rotation:['sync','bomb','five'],active:false};
  }
  savePlayers(names){
    this.players=names.map((n,i)=>(n||'').trim()||`プレイヤー${i+1}`);
    localStorage.setItem(PLAYER_KEY,JSON.stringify(this.players));
    this.resetScores();
  }
  resetScores(){this.scores=Array(this.players.length).fill(0)}
  addScore(index,points=1){this.scores[index]=(this.scores[index]||0)+points}
  startSingle(){this.mode='single';this.party.active=false;this.resetScores()}
  startParty(totalRounds=5){
    this.mode='party';
    this.resetScores();
    this.party={round:0,totalRounds,rotation:['sync','bomb','five'],active:true};
  }
  currentPartyGame(){return this.party.rotation[this.party.round%this.party.rotation.length]}
  finishPartyRound(){this.party.round+=1;return this.party.round>=this.party.totalRounds}
  winnerIndexes(){
    const best=Math.max(...this.scores);
    return this.scores.map((s,i)=>s===best?i:-1).filter(i=>i>=0);
  }
}

export function normalizeAnswer(value){
  return value.normalize('NFKC').trim().toLowerCase().replace(/[\s　、。,.!?！？ー-]/g,'');
}
