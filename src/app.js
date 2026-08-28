import {SessionStore,rankScores} from './core/session.js';
import {RatingStore,PartySettingsStore} from './core/preferences.js';
import {createLocalTransport} from './core/transport.js';
import {registerGame,getGame,listGames} from './core/registry.js';
import {CATEGORY_DEFS,categoriesFor,categoryLabel,filterGames,recommendedGames} from './core/catalog.js';
import {syncGame} from './games/sync.js';
import {bombGame} from './games/bomb.js';
import {fiveGame} from './games/five.js';
import {minorityGame} from './games/minority.js';
import {sniperGame} from './games/sniper.js';
import {tabooGame} from './games/taboo.js';
import {clockGame} from './games/clock.js';
import {tenGame} from './games/ten.js';
import {codeGame} from './games/code.js';
import {logicGame} from './games/logic.js';
import {evGame} from './games/ev.js';
import {auctionGame} from './games/auction.js';

[syncGame,bombGame,fiveGame,minorityGame,sniperGame,tabooGame,clockGame,tenGame,codeGame,logicGame,evGame,auctionGame].forEach(registerGame);

const transport=createLocalTransport();
const session=new SessionStore({transport});
const ratings=new RatingStore(globalThis.localStorage);
const partySettings=new PartySettingsStore(globalThis.localStorage);
const app=document.querySelector('#app');
const badge=document.querySelector('#sessionBadge');
const homeButton=document.querySelector('#homeButton');
const toastEl=document.querySelector('#toast');
let draftPlayers=[...session.players];
let activeCleanup=null;
let lastSingleGameId=null;

const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function toast(text){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),1500)}
function updateBadge(text){badge.textContent=text||`${session.players.length}人`}
function disposeActiveGame(){try{activeCleanup?.()}finally{activeCleanup=null}}
function rankingHtml(scores,unit){return rankScores(scores).map(row=>`<div class="result-row"><span>${row.rank}. ${esc(session.players[row.index])}</span><span>${row.score} ${unit}</span></div>`).join('')}
function ratingSummary(gameId){const r=ratings.get(gameId);return r.total?`また遊びたい ${r.good}/${r.total}`:''}
function ratingPromptHtml(gameId){
  const game=getGame(gameId);if(!game)return'';const r=ratings.get(gameId);
  return `<section class="feedback" data-rating-game="${gameId}"><div><div class="eyebrow">PERSONAL NOTE</div><strong>${esc(game.title)}をどう感じた？</strong><div class="feedback-history">${r.total?`これまで ${r.total}回評価 · また遊びたい ${r.good}回`:'この端末だけに記録します'}</div></div><div class="rating-actions"><button class="rating-btn" data-rate="good">また遊びたい</button><button class="rating-btn" data-rate="neutral">普通</button><button class="rating-btn" data-rate="bad">見直したい</button></div></section>`;
}
function bindRating(gameId){
  const wrap=app.querySelector(`[data-rating-game="${gameId}"]`);if(!wrap)return;let done=false;
  wrap.querySelectorAll('[data-rate]').forEach(button=>button.onclick=()=>{
    if(done)return;done=true;const value=button.dataset.rate;const r=ratings.rate(gameId,value);
    wrap.querySelector('.rating-actions').innerHTML=`<div class="rating-saved">記録しました · また遊びたい ${r.good}/${r.total}</div>`;
  });
}

function gameCardHtml(game,index){
  const categoryTags=categoriesFor(game.id).slice(0,2).map(categoryLabel);
  return `<button class="game-card" data-game="${game.id}"><div class="game-card-top"><span class="game-index">${String(index+1).padStart(2,'0')}</span><span class="game-symbol">${game.emoji}</span></div><h3>${game.title}</h3><p>${game.description}</p><div class="game-meta">${categoryTags.map(t=>`<span>${t}</span>`).join('')}${ratingSummary(game.id)?`<span class="rating-summary">${ratingSummary(game.id)}</span>`:''}</div></button>`;
}

function recommendationHtml(game){
  return `<button class="recommend-card" data-game="${game.id}"><span class="recommend-symbol">${game.emoji}</span><span><b>${game.title}</b><small>${categoriesFor(game.id).slice(0,2).map(categoryLabel).join(' · ')}</small></span><span class="recommend-arrow">→</span></button>`;
}

function bindGameLaunch(container=app){
  container.querySelectorAll('[data-game]').forEach(button=>button.onclick=()=>{saveDraft({quiet:true});session.startSingle();startGame(button.dataset.game)});
}

homeButton.onclick=()=>{disposeActiveGame();renderHome()};

function saveDraft({quiet=false}={}){
  session.savePlayers(draftPlayers);draftPlayers=[...session.players];updateBadge();if(!quiet)toast('プレイヤーを保存しました');
}

function renderPlayers(){
  const box=app.querySelector('#playerList');if(!box)return;
  box.innerHTML=draftPlayers.map((name,i)=>`<div class="player-row"><div class="avatar">${String(i+1).padStart(2,'0')}</div><input data-player="${i}" maxlength="16" value="${esc(name)}"><button class="icon-btn" data-remove="${i}" aria-label="削除" ${draftPlayers.length<=2?'disabled':''}>×</button></div>`).join('');
  box.querySelectorAll('[data-player]').forEach(input=>input.oninput=e=>draftPlayers[+e.target.dataset.player]=e.target.value);
  box.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{if(draftPlayers.length>2){draftPlayers.splice(+button.dataset.remove,1);renderPlayers()}});
}

function renderHome(){
  disposeActiveGame();draftPlayers=[...session.players];
  const games=listGames(),saved=session.savedPartyInfo(),savedGame=saved?getGame(saved.nextGameId):null;
  updateBadge(`${session.players.length}人 · ${games.length} games`);
  const resumeHtml=saved&&savedGame?`<section class="resume-card"><div><div class="eyebrow">SAVED PARTY</div><h3>Round ${saved.round+1}/${saved.totalRounds} から再開</h3><p>${esc(savedGame.title)}から続けます。ラウンド途中で閉じた場合、そのラウンドは最初から始まります。</p></div><div class="resume-actions"><button class="btn primary" id="resumeParty">再開する</button><button class="btn quiet" id="discardParty">保存を破棄</button></div></section>`:'';
  app.innerHTML=`<section class="hero"><div class="eyebrow hero-label">LOCAL PARTY GAMES</div><h1>ひとつのスマホで、<br>場を動かす。</h1><p>2〜8人。準備なしで始められる、短いゲームのコレクション。</p></section>
  ${resumeHtml}
  <div class="section-head"><h2>Players</h2><span class="muted">この端末に保存</span></div>
  <section class="panel"><div id="playerList" class="stack"></div><div class="actions"><button class="btn quiet" id="addPlayer">プレイヤー追加</button><button class="btn primary" id="savePlayers">保存</button></div></section>
  <div class="section-head"><h2>Play</h2><span class="muted">おすすめは Party</span></div>
  <section class="mode-grid"><button class="mode-card featured" id="partyMode"><div class="mode-kicker">PARTY</div><h3>総合戦を組む</h3><p>3 / 6 / 9ラウンド。遊ぶゲームを選んで、その場に合う構成にできます。</p><span class="text-link">設定して始める →</span></button><div class="mode-card static"><div class="mode-kicker">SINGLE</div><h3>1ゲームだけ遊ぶ</h3><p>下の一覧から選択。先に5点取ったプレイヤーが勝ちです。</p></div></section>
  <div class="section-head"><h2>For this group</h2><span class="muted">${session.players.length}人向け</span></div>
  <section class="recommend-grid" id="recommendGrid">${recommendedGames(games,session.players.length).map(recommendationHtml).join('')}</section>
  <div class="section-head"><h2>Games</h2><span class="muted" id="catalogCount">${games.length} titles</span></div>
  <section class="catalog-tools"><input id="gameSearch" type="search" inputmode="search" placeholder="ゲーム名・特徴で検索" aria-label="ゲーム検索"><div class="catalog-chips">${CATEGORY_DEFS.map(c=>`<button class="catalog-chip ${c.id==='all'?'active':''}" data-catalog-category="${c.id}">${c.label}</button>`).join('')}</div></section>
  <section class="games" id="gameCatalog"></section>
  <div class="catalog-empty" id="catalogEmpty" hidden>条件に合うゲームがありません。</div>
  <div class="footer">Party Pocket · local play on GitHub Pages</div>`;

  renderPlayers();
  app.querySelector('#addPlayer').onclick=()=>{if(draftPlayers.length>=8)return toast('最大8人です');draftPlayers.push(`プレイヤー${draftPlayers.length+1}`);renderPlayers()};
  app.querySelector('#savePlayers').onclick=()=>saveDraft();
  app.querySelector('#partyMode').onclick=()=>{saveDraft({quiet:true});renderPartySetup()};
  const catalogState={category:'all',query:''};
  const catalogIndex=new Map(games.map((g,i)=>[g.id,i]));
  function paintCatalog(){
    const filtered=filterGames(games,catalogState);
    const catalog=app.querySelector('#gameCatalog'),empty=app.querySelector('#catalogEmpty');
    catalog.innerHTML=filtered.map(g=>gameCardHtml(g,catalogIndex.get(g.id))).join('');
    empty.hidden=filtered.length!==0;
    app.querySelector('#catalogCount').textContent=`${filtered.length} / ${games.length}`;
    app.querySelectorAll('[data-catalog-category]').forEach(b=>b.classList.toggle('active',b.dataset.catalogCategory===catalogState.category));
    bindGameLaunch(catalog);
  }
  app.querySelector('#gameSearch').oninput=e=>{catalogState.query=e.target.value;paintCatalog()};
  app.querySelectorAll('[data-catalog-category]').forEach(button=>button.onclick=()=>{catalogState.category=button.dataset.catalogCategory;paintCatalog()});
  bindGameLaunch(app.querySelector('#recommendGrid'));
  paintCatalog();
  app.querySelector('#resumeParty')?.addEventListener('click',()=>{if(session.resumeParty()){draftPlayers=[...session.players];renderPartyIntermission(false,null,true)}});
  app.querySelector('#discardParty')?.addEventListener('click',()=>{session.clearSavedParty();renderHome()});
}

function renderPartySetup(){
  disposeActiveGame();const games=listGames(),ids=games.map(g=>g.id),saved=partySettings.load(ids);
  const state={rounds:saved.rounds,selected:new Set(saved.gameIds)};
  const presets={
    all:ids,
    brain:['code','logic','ev','auction','sniper','portfolio','priority','triad'],
    strategy:['auction','ev','grid','allocation','portfolio','frontline','priority','sequence','isolation','gate','triad','bomb','ten'],
    foresight:['sequence','frontline','priority','grid','auction','isolation','gate','triad'],
    perfect:['isolation','gate','triad','grid'],
    read:['sync','minority','sniper','bomb','auction','sequence'],
    talk:['taboo','sync','five','minority'],
    quick:['five','clock','ten','bomb']
  };
  function paint(){
    updateBadge('PARTY SETUP');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="setupBack">←</button><div><div class="eyebrow">PARTY SETUP</div><div class="screen-title">総合戦を組む</div></div></div>
    <section class="panel setup-section"><div class="setup-label">ラウンド数</div><div class="segmented">${[3,6,9].map(n=>`<button class="segment ${state.rounds===n?'active':''}" data-rounds="${n}">${n}</button>`).join('')}</div><p class="helper">短く試すなら3、標準は6、しっかり遊ぶなら9。</p></section>
    <section class="panel setup-section"><div class="setup-label">プリセット</div><div class="preset-row"><button class="preset-btn" data-preset="all">バランス</button><button class="preset-btn" data-preset="brain">頭脳戦</button><button class="preset-btn" data-preset="strategy">戦略</button><button class="preset-btn" data-preset="foresight">先読み</button><button class="preset-btn" data-preset="perfect">完全情報</button><button class="preset-btn" data-preset="read">読み合い</button><button class="preset-btn" data-preset="talk">会話中心</button><button class="preset-btn" data-preset="quick">短時間</button></div></section>
    <section class="panel setup-section"><div class="setup-head"><div class="setup-label">ゲーム選択</div><span>${state.selected.size}/${games.length}</span></div><div class="select-games">${games.map((g,i)=>`<button class="select-game ${state.selected.has(g.id)?'selected':''}" data-select-game="${g.id}" aria-pressed="${state.selected.has(g.id)}"><span class="game-index">${String(i+1).padStart(2,'0')}</span><span class="select-title">${g.title}</span><span class="select-check">${state.selected.has(g.id)?'選択中':'除外'}</span></button>`).join('')}</div><p class="helper">2ゲーム以上を選択してください。ゲーム数よりラウンド数が多い場合は重複して登場します。</p></section>
    <button class="btn primary full" id="startParty">${state.rounds}ラウンドで開始</button>`;
    app.querySelector('#setupBack').onclick=renderHome;
    app.querySelectorAll('[data-rounds]').forEach(b=>b.onclick=()=>{state.rounds=+b.dataset.rounds;paint()});
    app.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{state.selected=new Set(presets[b.dataset.preset].filter(id=>ids.includes(id)));paint()});
    app.querySelectorAll('[data-select-game]').forEach(b=>b.onclick=()=>{const id=b.dataset.selectGame;state.selected.has(id)?state.selected.delete(id):state.selected.add(id);paint()});
    app.querySelector('#startParty').onclick=()=>{
      if(state.selected.size<2)return toast('2ゲーム以上を選択してください');
      const selected=games.map(g=>g.id).filter(id=>state.selected.has(id));partySettings.save({rounds:state.rounds,gameIds:selected},ids);
      session.startParty(selected,state.rounds);renderPartyIntermission(true);
    };
  }
  paint();
}

function renderScorebar(current=-1){
  document.querySelectorAll('[data-scorebar]').forEach(bar=>bar.innerHTML=session.players.map((name,i)=>`<div class="score ${i===current?'current':''}"><span>${esc(name)}</span><b>${session.scores[i]||0}</b></div>`).join(''));
}

function startGame(id){
  disposeActiveGame();const game=getGame(id);if(!game)return renderHome();if(session.mode==='single')lastSingleGameId=id;
  updateBadge(session.mode==='party'?`Round ${session.party.round+1}/${session.party.totalRounds}`:'First to 5');
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="backButton">←</button><div class="game-heading"><span class="game-symbol small">${game.emoji}</span><div><div class="eyebrow">${session.mode==='party'?'PARTY ROUND':'SINGLE GAME'}</div><div class="screen-title">${game.title}</div></div></div></div><div class="scorebar" data-scorebar></div><section class="stage" id="gameStage"></section>`;
  app.querySelector('#backButton').onclick=renderHome;renderScorebar();
  const ctx={root:app.querySelector('#gameStage'),session,esc,toast,renderScorebar,completeRound:restart=>completeRound(restart)};
  activeCleanup=game.mount(ctx)||null;
}

function completeRound(restart){
  renderScorebar();
  if(session.mode==='single'){
    if(Math.max(...session.scores)>=5){disposeActiveGame();return renderWinner(false,lastSingleGameId)}
    return restart();
  }
  const completedGameId=session.currentPartyGame(),result=session.finishPartyRound();disposeActiveGame();
  if(result.finished)return renderWinner(true,completedGameId);
  renderPartyIntermission(false,result,false,completedGameId);
}

function renderPartyIntermission(first=false,result=null,resuming=false,completedGameId=null){
  const nextId=session.currentPartyGame(),game=getGame(nextId),progress=session.party.round/session.party.totalRounds*100;
  updateBadge(`Round ${session.party.round+1}/${session.party.totalRounds}`);
  const awardHtml=result?`<section class="card result-card"><div class="eyebrow">ROUND RESULT</div><div class="result-list">${session.players.map((name,i)=>`<div class="result-row"><span>${esc(name)}</span><span>+${result.awards[i]} Party pt</span></div>`).join('')}</div></section>`:'';
  const resumeNote=resuming?'<div class="notice">保存地点から再開しました。途中だったラウンドは最初から始まります。</div>':'';
  app.innerHTML=`<section class="panel party-board"><div class="eyebrow">PARTY</div><div class="prompt compact">${first?'構成完了':resuming?'ゲームを再開':'次のラウンド'}</div><div class="party-progress"><span style="width:${progress}%"></span></div>${resumeNote}${awardHtml}${completedGameId?ratingPromptHtml(completedGameId):''}<div class="standings"><div class="setup-label">Standings</div><div class="result-list">${rankingHtml(session.partyScores,'Party pt')}</div></div><div class="next-game"><div class="game-card-top"><span class="game-index">${String(session.party.round+1).padStart(2,'0')} / ${String(session.party.totalRounds).padStart(2,'0')}</span><span class="game-symbol">${game.emoji}</span></div><h3>${game.title}</h3><p>${game.description}</p></div><button class="btn primary full" id="partyNext">${first?'開始する':resuming?'このラウンドを始める':'次へ'}</button></section>`;
  if(completedGameId)bindRating(completedGameId);app.querySelector('#partyNext').onclick=()=>startGame(nextId);
}

function renderWinner(isParty,ratingGameId=null){
  disposeActiveGame();const winners=session.winnerIndexes(isParty),scores=isParty?session.partyScores:session.scores;
  updateBadge('RESULT');
  app.innerHTML=`<section class="panel winner"><div class="winner-mark">RESULT</div><div class="eyebrow">${isParty?'PARTY COMPLETE':'GAME COMPLETE'}</div><h2>${winners.map(i=>esc(session.players[i])).join(' & ')}</h2><p class="muted">${winners.length>1?'同点首位':'1位'}</p><div class="result-list">${rankingHtml(scores,isParty?'Party pt':'pt')}</div>${ratingGameId?ratingPromptHtml(ratingGameId):''}<div class="actions"><button class="btn quiet" id="homeResult">ホーム</button><button class="btn primary" id="againResult">もう一度</button></div></section>`;
  if(ratingGameId)bindRating(ratingGameId);
  app.querySelector('#homeResult').onclick=renderHome;
  app.querySelector('#againResult').onclick=()=>{
    if(isParty){const games=listGames(),settings=partySettings.load(games.map(g=>g.id));session.startParty(settings.gameIds,settings.rounds);return renderPartyIntermission(true)}
    if(lastSingleGameId){session.startSingle();return startGame(lastSingleGameId)}renderHome();
  };
}

renderHome();