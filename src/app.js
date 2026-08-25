import {SessionStore} from './core/session.js';
import {registerGame,getGame,listGames} from './core/registry.js';
import {syncGame} from './games/sync.js';
import {bombGame} from './games/bomb.js';
import {fiveGame} from './games/five.js';

registerGame(syncGame);registerGame(bombGame);registerGame(fiveGame);

const session=new SessionStore();
const app=document.querySelector('#app');
const badge=document.querySelector('#sessionBadge');
const homeButton=document.querySelector('#homeButton');
const toastEl=document.querySelector('#toast');
let draftPlayers=[...session.players];

const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function toast(text){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),1400)}
function updateBadge(text){badge.textContent=text||`${session.players.length}人`}

homeButton.onclick=()=>renderHome();

function saveDraft(){
  session.savePlayers(draftPlayers);
  draftPlayers=[...session.players];
  updateBadge();toast('メンバーを保存しました');
}

function renderPlayers(){
  const box=app.querySelector('#playerList');
  if(!box)return;
  box.innerHTML=draftPlayers.map((n,i)=>`<div class="player-row"><div class="avatar">${i+1}</div><input data-player="${i}" maxlength="16" value="${esc(n)}"><button class="icon-btn" data-remove="${i}" ${draftPlayers.length<=2?'disabled':''}>×</button></div>`).join('');
  box.querySelectorAll('[data-player]').forEach(input=>input.oninput=e=>draftPlayers[+e.target.dataset.player]=e.target.value);
  box.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{if(draftPlayers.length>2){draftPlayers.splice(+button.dataset.remove,1);renderPlayers()}});
}

function renderHome(){
  draftPlayers=[...session.players];updateBadge(`${session.players.length}人 · 3 games`);
  app.innerHTML=`<section class="hero"><h1>集まったら、<br>すぐ遊ぶ。</h1><p>2〜8人。スマホ1台。短いゲームをつないで総合優勝も決められる。</p></section>
  <div class="section-head"><h2>プレイヤー</h2><span class="muted">端末に保存</span></div>
  <section class="panel"><div id="playerList" class="stack"></div><div class="actions"><button class="btn" id="addPlayer">＋ 追加</button><button class="btn primary" id="savePlayers">保存</button></div></section>
  <div class="section-head"><h2>遊び方</h2><span class="muted">おすすめ: Party Mode</span></div>
  <section class="mode-grid"><button class="game-card" id="partyMode" style="background:#fff0bd"><div class="chip">5 ROUNDS</div><h3>🏆 Party Mode</h3><p>3種類のゲームを順番に遊び、スコアを持ち越して総合優勝を決める。</p></button><div class="card" style="padding:18px"><div class="chip">SINGLE</div><h3>1ゲームだけ遊ぶ</h3><p class="muted">好きなゲームを選び、先に5点取った人が勝利。</p></div></section>
  <div class="section-head"><h2>ゲーム</h2><span class="muted">モジュール式</span></div>
  <section class="games">${listGames().map(g=>`<button class="game-card" data-game="${g.id}"><div style="font-size:32px">${g.emoji}</div><h3>${g.title}</h3><p>${g.description}</p><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">${g.tags.map(t=>`<span class="chip">${t}</span>`).join('')}</div></button>`).join('')}</section><div class="footer">Party Pocket v2 · modular game platform</div>`;
  renderPlayers();
  app.querySelector('#addPlayer').onclick=()=>{if(draftPlayers.length>=8)return toast('最大8人です');draftPlayers.push(`プレイヤー${draftPlayers.length+1}`);renderPlayers()};
  app.querySelector('#savePlayers').onclick=saveDraft;
  app.querySelector('#partyMode').onclick=()=>{saveDraft();session.startParty(5);renderPartyIntermission(true)};
  app.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{saveDraft();session.startSingle();startGame(b.dataset.game)});
}

function renderScorebar(current=-1){
  document.querySelectorAll('[data-scorebar]').forEach(bar=>bar.innerHTML=session.players.map((n,i)=>`<div class="score ${i===current?'current':''}">${esc(n)} · ${session.scores[i]||0}</div>`).join(''));
}

function startGame(id){
  const game=getGame(id);if(!game)return renderHome();
  updateBadge(session.mode==='party'?`Party ${session.party.round+1}/${session.party.totalRounds}`:'先に5点');
  app.innerHTML=`<div class="game-top"><button class="btn back" id="backButton">←</button><div><div class="eyebrow">${session.mode==='party'?'PARTY ROUND':'SINGLE GAME'}</div><div style="font-size:24px;font-weight:950">${game.emoji} ${game.title}</div></div></div><div class="scorebar" data-scorebar></div><section class="stage" id="gameStage"></section>`;
  app.querySelector('#backButton').onclick=()=>renderHome();renderScorebar();
  const ctx={root:app.querySelector('#gameStage'),session,esc,toast,renderScorebar,completeRound:(restart)=>completeRound(id,restart)};
  game.mount(ctx);
}

function completeRound(gameId,restart){
  renderScorebar();
  if(session.mode==='single'){
    if(Math.max(...session.scores)>=5)return renderWinner(false);
    return restart();
  }
  const finished=session.finishPartyRound();
  if(finished)return renderWinner(true);
  renderPartyIntermission(false,gameId);
}

function renderPartyIntermission(first=false){
  const nextId=session.currentPartyGame(),game=getGame(nextId),progress=session.party.round/session.party.totalRounds*100;
  updateBadge(`Party ${session.party.round+1}/${session.party.totalRounds}`);
  app.innerHTML=`<section class="panel"><div class="eyebrow">PARTY MODE</div><div class="prompt">${first?'5ラウンドで総合勝負':'次のラウンド'}</div><div class="party-progress"><span style="width:${progress}%"></span></div><div class="result-list">${session.players.map((n,i)=>`<div class="result-row"><span>${i+1}. ${esc(n)}</span><span>${session.scores[i]} pt</span></div>`).join('')}</div><div style="margin-top:20px" class="card"><div style="font-size:36px">${game.emoji}</div><h3 style="font-size:24px;margin:8px 0">Round ${session.party.round+1}: ${game.title}</h3><p class="muted">${game.description}</p></div><button class="btn primary" style="width:100%;margin-top:18px" id="partyNext">${first?'Party Modeを開始':'次のゲームへ'}</button></section>`;
  app.querySelector('#partyNext').onclick=()=>startGame(nextId);
}

function renderWinner(isParty){
  const winners=session.winnerIndexes();
  updateBadge('RESULT');
  app.innerHTML=`<section class="panel winner"><div class="trophy">🏆</div><div class="eyebrow">${isParty?'PARTY CHAMPION':'WINNER'}</div><h2>${winners.map(i=>esc(session.players[i])).join(' & ')}</h2><p class="muted">${winners.length>1?'同点優勝！':'優勝！'}</p><div class="result-list">${session.players.map((n,i)=>`<div class="result-row"><span>${esc(n)}</span><span>${session.scores[i]} pt</span></div>`).join('')}</div><div class="actions"><button class="btn" id="homeResult">ホーム</button><button class="btn primary" id="againResult">もう一度</button></div></section>`;
  app.querySelector('#homeResult').onclick=renderHome;
  app.querySelector('#againResult').onclick=()=>{if(isParty){session.startParty(5);renderPartyIntermission(true)}else renderHome()};
}

renderHome();
