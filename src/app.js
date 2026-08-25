import {SessionStore} from './core/session.js';
import {createLocalTransport} from './core/transport.js';
import {registerGame,getGame,listGames} from './core/registry.js';
import {syncGame} from './games/sync.js';
import {bombGame} from './games/bomb.js';
import {fiveGame} from './games/five.js';

registerGame(syncGame);
registerGame(bombGame);
registerGame(fiveGame);

const transport=createLocalTransport();
const session=new SessionStore({transport});
const app=document.querySelector('#app');
const badge=document.querySelector('#sessionBadge');
const homeButton=document.querySelector('#homeButton');
const toastEl=document.querySelector('#toast');
let draftPlayers=[...session.players];
let activeCleanup=null;

const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function toast(text){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),1500)}
function updateBadge(text){badge.textContent=text||`${session.players.length}人`}
function disposeActiveGame(){try{activeCleanup?.()}finally{activeCleanup=null}}

homeButton.onclick=()=>{disposeActiveGame();renderHome()};

function saveDraft(){
  session.savePlayers(draftPlayers);
  draftPlayers=[...session.players];
  updateBadge();
  toast('メンバーを保存しました');
}

function renderPlayers(){
  const box=app.querySelector('#playerList');
  if(!box)return;
  box.innerHTML=draftPlayers.map((name,i)=>`<div class="player-row"><div class="avatar">${i+1}</div><input data-player="${i}" maxlength="16" value="${esc(name)}"><button class="icon-btn" data-remove="${i}" ${draftPlayers.length<=2?'disabled':''}>×</button></div>`).join('');
  box.querySelectorAll('[data-player]').forEach(input=>input.oninput=e=>draftPlayers[+e.target.dataset.player]=e.target.value);
  box.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{if(draftPlayers.length>2){draftPlayers.splice(+button.dataset.remove,1);renderPlayers()}});
}

function renderHome(){
  disposeActiveGame();
  draftPlayers=[...session.players];
  updateBadge(`${session.players.length}人 · ${listGames().length} games`);
  app.innerHTML=`<section class="hero"><h1>集まったら、<br>すぐ遊ぶ。</h1><p>2〜8人。スマホ1台を回して遊ぶ、GitHub Pagesだけで完結するミニゲーム集。</p></section>
  <div class="section-head"><h2>プレイヤー</h2><span class="muted">端末に保存</span></div>
  <section class="panel"><div id="playerList" class="stack"></div><div class="actions"><button class="btn" id="addPlayer">＋ 追加</button><button class="btn primary" id="savePlayers">保存</button></div></section>
  <div class="section-head"><h2>遊び方</h2><span class="muted">おすすめ: Party Mode</span></div>
  <section class="mode-grid"><button class="game-card" id="partyMode" style="background:#fff0bd"><div class="chip">6 ROUNDS</div><h3>🏆 Party Mode</h3><p>3ゲームを各2回。ラウンド順位をParty Pointへ変換して総合優勝を決める。</p></button><div class="card" style="padding:18px"><div class="chip">SINGLE</div><h3>1ゲームだけ遊ぶ</h3><p class="muted">好きなゲームを選び、先に5点取った人が勝利。</p></div></section>
  <div class="section-head"><h2>ゲーム</h2><span class="muted">スマホ1台</span></div>
  <section class="games">${listGames().map(g=>`<button class="game-card" data-game="${g.id}"><div style="font-size:32px">${g.emoji}</div><h3>${g.title}</h3><p>${g.description}</p><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">${g.tags.map(t=>`<span class="chip">${t}</span>`).join('')}</div></button>`).join('')}</section>
  <div class="footer">Party Pocket · GitHub Pages only</div>`;

  renderPlayers();
  app.querySelector('#addPlayer').onclick=()=>{if(draftPlayers.length>=8)return toast('最大8人です');draftPlayers.push(`プレイヤー${draftPlayers.length+1}`);renderPlayers()};
  app.querySelector('#savePlayers').onclick=saveDraft;
  app.querySelector('#partyMode').onclick=()=>{saveDraft();session.startParty(listGames().map(g=>g.id),2);renderPartyIntermission(true)};
  app.querySelectorAll('[data-game]').forEach(button=>button.onclick=()=>{saveDraft();session.startSingle();startGame(button.dataset.game)});
}

function renderScorebar(current=-1){
  document.querySelectorAll('[data-scorebar]').forEach(bar=>bar.innerHTML=session.players.map((name,i)=>`<div class="score ${i===current?'current':''}">${esc(name)} · ${session.scores[i]||0}</div>`).join(''));
}

function startGame(id){
  disposeActiveGame();
  const game=getGame(id);
  if(!game)return renderHome();
  updateBadge(session.mode==='party'?`Party ${session.party.round+1}/${session.party.totalRounds}`:'先に5点');
  app.innerHTML=`<div class="game-top"><button class="btn back" id="backButton">←</button><div><div class="eyebrow">${session.mode==='party'?'PARTY ROUND':'SINGLE GAME'}</div><div style="font-size:24px;font-weight:950">${game.emoji} ${game.title}</div></div></div><div class="scorebar" data-scorebar></div><section class="stage" id="gameStage"></section>`;
  app.querySelector('#backButton').onclick=renderHome;
  renderScorebar();
  const ctx={root:app.querySelector('#gameStage'),session,esc,toast,renderScorebar,completeRound:restart=>completeRound(restart)};
  activeCleanup=game.mount(ctx)||null;
}

function completeRound(restart){
  renderScorebar();
  if(session.mode==='single'){
    if(Math.max(...session.scores)>=5){disposeActiveGame();return renderWinner(false)}
    return restart();
  }
  const result=session.finishPartyRound();
  disposeActiveGame();
  if(result.finished)return renderWinner(true);
  renderPartyIntermission(false,result);
}

function renderPartyIntermission(first=false,result=null){
  const nextId=session.currentPartyGame();
  const game=getGame(nextId);
  const progress=session.party.round/session.party.totalRounds*100;
  updateBadge(`Party ${session.party.round+1}/${session.party.totalRounds}`);
  const awardHtml=result?`<div class="card" style="margin-bottom:14px"><div class="eyebrow">ROUND RESULT</div><div class="result-list">${session.players.map((name,i)=>`<div class="result-row"><span>${esc(name)}</span><span>＋${result.awards[i]} Party pt</span></div>`).join('')}</div></div>`:'';
  app.innerHTML=`<section class="panel"><div class="eyebrow">PARTY MODE</div><div class="prompt">${first?'各ゲーム2回ずつの総合戦':'次のラウンド'}</div><div class="party-progress"><span style="width:${progress}%"></span></div>${awardHtml}<div class="result-list">${session.players.map((name,i)=>`<div class="result-row"><span>${i+1}. ${esc(name)}</span><span>${session.partyScores[i]} Party pt</span></div>`).join('')}</div><div style="margin-top:20px" class="card"><div style="font-size:36px">${game.emoji}</div><h3 style="font-size:24px;margin:8px 0">Round ${session.party.round+1}: ${game.title}</h3><p class="muted">${game.description}</p></div><button class="btn primary" style="width:100%;margin-top:18px" id="partyNext">${first?'Party Modeを開始':'次のゲームへ'}</button></section>`;
  app.querySelector('#partyNext').onclick=()=>startGame(nextId);
}

function renderWinner(isParty){
  disposeActiveGame();
  const winners=session.winnerIndexes(isParty);
  const scores=isParty?session.partyScores:session.scores;
  updateBadge('RESULT');
  app.innerHTML=`<section class="panel winner"><div class="trophy">🏆</div><div class="eyebrow">${isParty?'PARTY CHAMPION':'WINNER'}</div><h2>${winners.map(i=>esc(session.players[i])).join(' & ')}</h2><p class="muted">${winners.length>1?'同点優勝！':'優勝！'}</p><div class="result-list">${session.players.map((name,i)=>`<div class="result-row"><span>${esc(name)}</span><span>${scores[i]} ${isParty?'Party pt':'pt'}</span></div>`).join('')}</div><div class="actions"><button class="btn" id="homeResult">ホーム</button><button class="btn primary" id="againResult">もう一度</button></div></section>`;
  app.querySelector('#homeResult').onclick=renderHome;
  app.querySelector('#againResult').onclick=()=>{if(isParty){session.startParty(listGames().map(g=>g.id),2);renderPartyIntermission(true)}else renderHome()};
}

renderHome();
