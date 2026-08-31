import {SessionStore,rankScores} from './core/session.js';
import {RatingStore,PartySettingsStore,LibraryStore,PlaytestStore} from './core/preferences.js';
import {createLocalTransport} from './core/transport.js';
import {registerGame,getGame,listGames} from './core/registry.js';
import {CATEGORY_DEFS,categoriesFor,categoryLabel,difficultyLabel,filterGames,gameMeta,pickGame,playerRangeLabel,recommendedGames} from './core/catalog.js';
import {gameGuide} from './core/game-guide.js';
import {StatsStore,winnerIndexesFromScores} from './core/stats.js';
import {buildHealthReport} from './core/health.js';
import {SoloProgressStore,SOLO_GAME_IDS} from './core/solo.js';
import {canPromptInstall,isIOS,isOnline,isStandalone,registerPWA,requestInstall,watchConnectivity,watchInstallPrompt} from './core/pwa.js';
import {backupFilename,backupSummary,clearPartyPocketData,createBackup,parseBackupText,restoreBackup,stringifyBackup} from './core/backup.js';
import {PlayerGroupStore,samePlayers} from './core/groups.js';
import {buildSmartParty,recentGameIdsForPlayers,summarizeSmartParty} from './core/recommender.js';
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
const library=new LibraryStore(globalThis.localStorage);
const playtests=new PlaytestStore(globalThis.localStorage);
const stats=new StatsStore(globalThis.localStorage);
const soloProgress=new SoloProgressStore(globalThis.localStorage);
const playerGroups=new PlayerGroupStore(globalThis.localStorage);
const app=document.querySelector('#app');
const badge=document.querySelector('#sessionBadge');
const homeButton=document.querySelector('#homeButton');
const toastEl=document.querySelector('#toast');
let draftPlayers=[...session.players];
let activeCleanup=null;
let lastSingleGameId=null;
let soloRun=null;
let lastSoloResult=null;
let pwaInstallReady=false;
let pwaUpdateRegistration=null;
const APP_VERSION='8.16.0';

const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function toast(text){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),1500)}
function updateBadge(text){badge.textContent=text||`${session.players.length}人`}
function pwaStatusLabel(){return isStandalone()?'APP':isOnline()?'ONLINE':'OFFLINE'}
function smartPartyPlan(rounds,{players=session.players,allowedGameIds=null}={}){
  const games=listGames(),ids=games.map(g=>g.id),pRows=playtests.report(ids),sReport=stats.report(ids);
  const health=buildHealthReport(ids,pRows,sReport.gameStats);
  const recentIds=recentGameIdsForPlayers(stats.history(),players,8);
  return buildSmartParty(games,{
    playerCount:players.length,
    rounds,
    favoriteIds:library.favorites(ids),
    recentIds,
    playtestRows:pRows,
    healthRows:health.games,
    allowedGameIds
  });
}
function startSmartParty(rounds,{players=session.players,allowedGameIds=null}={}){
  if(players.length<2)return toast('Smart Partyは2人以上で遊べます');
  if(!samePlayers(players,session.players))session.savePlayers(players);
  const plan=smartPartyPlan(rounds,{players,allowedGameIds});
  if(plan.length<2)return toast('Smart Partyを組めませんでした');
  session.startParty(plan.map(g=>g.id),plan.length);
  renderPartyIntermission(true);
}
function disposeActiveGame(){try{activeCleanup?.()}finally{activeCleanup=null}}
function rankingHtml(scores,unit){return rankScores(scores).map(row=>`<div class="result-row"><span>${row.rank}. ${esc(session.players[row.index])}</span><span>${row.score} ${unit}</span></div>`).join('')}
function oneDecimal(value){return Number.isFinite(value)?value.toFixed(1):'—'}
function ratingSummary(gameId){
  const p=playtests.get(gameId);
  if(p.responses)return `評価 ${p.responses}回 · 面白さ ${oneDecimal(p.fun.average)}`;
  const r=ratings.get(gameId);return r.total?`旧評価 ${r.total}回`:'';
}
function scoreButtons(axis){
  return [1,2,3,4,5].map(score=>`<button class="score-choice" data-axis="${axis}" data-score="${score}" aria-pressed="false">${score}</button>`).join('');
}
function playtestPromptHtml(gameId){
  const game=getGame(gameId);if(!game)return'';const p=playtests.get(gameId);
  return `<section class="feedback playtest-card" data-playtest-game="${gameId}"><div><div class="eyebrow">PLAYTEST NOTE</div><strong>${esc(game.title)}を4軸で評価</strong><div class="feedback-history">${p.responses?`新評価 ${p.responses}回 · 面白さ ${oneDecimal(p.fun.average)} · 分かりやすさ ${oneDecimal(p.clarity.average)}`:p.legacyResponses?`旧「また遊びたい」評価 ${p.legacyResponses}件を引き継ぎ済み`:'この端末だけに記録します'}</div></div><div class="playtest-fields"><div class="playtest-row"><span>面白さ</span><div class="score-choices">${scoreButtons('fun')}</div></div><div class="playtest-row"><span>分かりやすさ</span><div class="score-choices">${scoreButtons('clarity')}</div></div><div class="playtest-row"><span>頭を使う度</span><div class="score-choices">${scoreButtons('brain')}</div></div><div class="playtest-row"><span>もう一度遊びたい</span><div class="score-choices">${scoreButtons('replay')}</div></div></div><button class="btn primary full playtest-save" disabled>4項目を記録</button></section>`;
}
function bindPlaytest(gameId){
  const wrap=app.querySelector(`[data-playtest-game="${gameId}"]`);if(!wrap)return;
  const scores={};const save=wrap.querySelector('.playtest-save');
  wrap.querySelectorAll('[data-axis][data-score]').forEach(button=>button.onclick=()=>{
    const axis=button.dataset.axis,s=Number(button.dataset.score);scores[axis]=s;
    wrap.querySelectorAll(`[data-axis="${axis}"]`).forEach(b=>{const on=Number(b.dataset.score)===s;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
    save.disabled=!['fun','clarity','brain','replay'].every(key=>scores[key]);
  });
  save.onclick=()=>{
    if(save.disabled)return;
    const result=playtests.submit(gameId,scores);
    ratings.rate(gameId,scores.replay>=4?'good':scores.replay===3?'neutral':'bad');
    wrap.innerHTML=`<div><div class="eyebrow">SAVED</div><strong>プレイテスト評価を記録しました</strong><div class="feedback-history">面白さ ${oneDecimal(result.fun.average)} · 分かりやすさ ${oneDecimal(result.clarity.average)} · 頭を使う度 ${oneDecimal(result.brain.average)} · また遊びたい ${oneDecimal(result.replay.average)}</div></div>`;
  };
}

function gameCardHtml(game,index){
  const categoryTags=categoriesFor(game.id).slice(0,2).map(categoryLabel),meta=gameMeta(game.id),favorite=library.isFavorite(game.id);
  return `<button class="game-card" data-game="${game.id}"><div class="game-card-top"><span class="game-index">${String(index+1).padStart(2,'0')}</span><span class="game-card-tools"><span class="favorite-mark">${favorite?'★':''}</span><span class="game-symbol">${game.emoji}</span></span></div><h3>${game.title}</h3><p>${game.description}</p><div class="game-facts"><span>${difficultyLabel(meta.difficulty)}</span><span>約${meta.minutes}分</span><span>${playerRangeLabel(meta)}推奨</span></div><div class="game-meta">${categoryTags.map(t=>`<span>${t}</span>`).join('')}${ratingSummary(game.id)?`<span class="rating-summary">${ratingSummary(game.id)}</span>`:''}</div></button>`;
}

function recommendationHtml(game){
  const meta=gameMeta(game.id);
  return `<button class="recommend-card" data-game="${game.id}"><span class="recommend-symbol">${game.emoji}</span><span><b>${game.title}</b><small>${difficultyLabel(meta.difficulty)} · 約${meta.minutes}分 · ${playerRangeLabel(meta)}推奨</small></span><span class="recommend-arrow">→</span></button>`;
}

function libraryRowHtml(game){
  const meta=gameMeta(game.id);
  return `<button class="library-row" data-game="${game.id}"><span class="recommend-symbol">${game.emoji}</span><span><b>${game.title}</b><small>${difficultyLabel(meta.difficulty)} · 約${meta.minutes}分</small></span><span class="recommend-arrow">→</span></button>`;
}

function bindGameLaunch(container=app){
  container.querySelectorAll('[data-game]').forEach(button=>button.onclick=()=>{saveDraft({quiet:true});renderGameDetail(button.dataset.game)});
}

function renderGameDetail(id){
  disposeActiveGame();
  const game=getGame(id);if(!game)return renderHome();
  const meta=gameMeta(id),guide=gameGuide(id),favorite=library.isFavorite(id);
  updateBadge('GAME GUIDE');
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="detailBack">←</button><div class="game-heading"><span class="game-symbol small">${game.emoji}</span><div><div class="eyebrow">GAME GUIDE</div><div class="screen-title">${game.title}</div></div></div></div>
  <section class="panel game-detail"><div class="detail-facts"><span>${difficultyLabel(meta.difficulty)}</span><span>約${meta.minutes}分</span><span>${playerRangeLabel(meta)}推奨</span></div><div class="detail-section"><div class="eyebrow">OBJECTIVE</div><h3>${esc(guide.objective)}</h3></div><div class="detail-section"><div class="eyebrow">HOW TO PLAY</div><ol class="rule-steps">${guide.rules.map(rule=>`<li>${esc(rule)}</li>`).join('')}</ol></div><div class="detail-grid"><div class="detail-note"><div class="eyebrow">WIN / SCORE</div><p>${esc(guide.scoring)}</p></div><div class="detail-note"><div class="eyebrow">EXAMPLE</div><p>${esc(guide.example)}</p></div></div><div class="detail-actions"><button class="btn quiet favorite-button ${favorite?'active':''}" id="favoriteToggle">${favorite?'★ お気に入り済み':'☆ お気に入り'}</button><button class="btn primary" id="detailStart">このゲームを始める</button></div></section>`;
  app.querySelector('#detailBack').onclick=renderHome;
  app.querySelector('#favoriteToggle').onclick=()=>{library.toggleFavorite(id);renderGameDetail(id)};
  app.querySelector('#detailStart').onclick=()=>{session.startSingle();startGame(id)};
}

homeButton.onclick=()=>{disposeActiveGame();renderHome()};

function saveDraft({quiet=false}={}){
  session.savePlayers(draftPlayers);draftPlayers=[...session.players];updateBadge();if(!quiet)toast('プレイヤーを保存しました');
}

function renderPlayers(){
  const box=app.querySelector('#playerList');if(!box)return;
  box.innerHTML=draftPlayers.map((name,i)=>`<div class="player-row"><div class="avatar">${String(i+1).padStart(2,'0')}</div><input data-player="${i}" maxlength="16" value="${esc(name)}"><button class="icon-btn" data-remove="${i}" aria-label="削除" ${draftPlayers.length<=1?'disabled':''}>×</button></div>`).join('');
  box.querySelectorAll('[data-player]').forEach(input=>input.oninput=e=>draftPlayers[+e.target.dataset.player]=e.target.value);
  box.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{if(draftPlayers.length>1){draftPlayers.splice(+button.dataset.remove,1);renderPlayers()}});
}

function renderHome(){
  disposeActiveGame();draftPlayers=[...session.players];
  const games=listGames(),saved=session.savedPartyInfo(),savedGame=saved?getGame(saved.nextGameId):null;
  const validIds=games.map(g=>g.id),byId=new Map(games.map(g=>[g.id,g]));
  const favoriteGames=library.favorites(validIds).map(id=>byId.get(id)).filter(Boolean);
  const recentGames=library.recent(validIds).map(id=>byId.get(id)).filter(Boolean);
  const groups=playerGroups.recent();
  const daily=soloProgress.daily(),dailyGame=byId.get(daily.gameId),soloSummary=soloProgress.summary();
  updateBadge(`${session.players.length}人 · ${games.length} games · ${pwaStatusLabel()}`);
  const resumeHtml=saved&&savedGame?`<section class="resume-card"><div><div class="eyebrow">SAVED PARTY</div><h3>Round ${saved.round+1}/${saved.totalRounds} から再開</h3><p>${esc(savedGame.title)}から続けます。ラウンド途中で閉じた場合、そのラウンドは最初から始まります。</p></div><div class="resume-actions"><button class="btn primary" id="resumeParty">再開する</button><button class="btn quiet" id="discardParty">保存を破棄</button></div></section>`:'';
  app.innerHTML=`<section class="hero"><div class="eyebrow hero-label">LOCAL PARTY GAMES</div><h1>ひとつのスマホで、<br>場を動かす。</h1><p>1〜8人。ひとりでも、みんなでも。準備なしで始められる短いゲームのコレクション。</p></section>
  ${resumeHtml}
  <div class="section-head"><h2>Players</h2><button class="section-action" id="manageGroups">グループ管理</button></div>
  ${groups.length?`<section class="group-list" id="savedGroups">${groups.map(group=>`<article class="group-card ${samePlayers(group.players,session.players)?'active':''}" data-group-card="${group.id}"><div class="group-card-main"><div><div class="eyebrow">${group.players.length===1?'SOLO GROUP':'PLAYER GROUP'}</div><h3>${esc(group.name)}</h3><p>${group.players.map(esc).join(' · ')}</p></div><span class="group-count">${group.players.length}人</span></div><div class="group-actions"><button class="btn quiet" data-load-group="${group.id}">呼び出す</button><button class="btn primary" data-quick-group="${group.id}">${group.players.length===1?'Quick Solo':'Quick Party 3R'}</button></div></article>`).join('')}</section>`:''}
  <section class="panel"><div id="playerList" class="stack"></div><div class="actions"><button class="btn quiet" id="addPlayer">プレイヤー追加</button><button class="btn primary" id="savePlayers">保存</button></div></section>
  <div class="section-head"><h2>Play</h2><span class="muted">おすすめは Party</span></div>
  <section class="mode-grid"><button class="mode-card featured" id="partyMode" ${session.players.length<2?'disabled':''}><div class="mode-kicker">PARTY</div><h3>${session.players.length<2?'2人以上でParty':'総合戦を組む'}</h3><p>${session.players.length<2?'1人のときは下のSingleゲームを遊べます。':'3 / 6 / 9ラウンド。遊ぶゲームを選んで、その場に合う構成にできます。'}</p><span class="text-link">${session.players.length<2?'プレイヤーを追加すると利用可能':'手動で設定 →'}</span></button><div class="mode-card static"><div class="mode-kicker">SINGLE</div><h3>1ゲームだけ遊ぶ</h3><p>${session.players.length===1?'1人向けゲームで自己ベストを狙えます。':'下の一覧から選択。先に5点取ったプレイヤーが勝ちです。'}</p></div></section>
  ${session.players.length>=2?`<section class="smart-party-home"><div><div class="eyebrow">SMART PARTY</div><h3>この${session.players.length}人に合わせて自動構成</h3><p>最近遊んだゲームを避け、人数・お気に入り・評価・Game Health・カテゴリの偏りを見て組みます。</p></div><div class="smart-round-buttons">${[3,6,9].map(n=>`<button class="btn ${n===3?'primary':'quiet'}" data-smart-rounds="${n}">${n}R</button>`).join('')}</div></section>`:''}
  ${!isStandalone()?`<section class="install-card"><div><div class="eyebrow">INSTALL</div><h3>ホーム画面から起動する</h3><p>${isIOS()?'Safariの共有ボタン →「ホーム画面に追加」で、アプリのように独立起動できます。':'対応ブラウザではParty Pocketを端末へインストールできます。'}</p></div><button class="btn quiet" id="installApp">${pwaInstallReady&&canPromptInstall()?'インストール':'追加方法'}</button></section>`:''}
  ${!isOnline()?'<div class="offline-banner">OFFLINE · キャッシュ済みゲームはそのまま遊べます</div>':''}
  ${pwaUpdateRegistration?'<section class="update-card"><div><div class="eyebrow">UPDATE READY</div><b>新しいParty Pocketがあります</b></div><button class="btn primary" id="applyUpdate">更新する</button></section>':''}
  ${session.players.length===1&&dailyGame?`<section class="solo-daily ${daily.cleared?'cleared':''}"><div><div class="eyebrow">DAILY SOLO</div><h3>${dailyGame.emoji} ${dailyGame.title}</h3><p>${daily.maxRounds}ラウンド以内に5点到達でクリア。</p><div class="solo-daily-meta"><span>${daily.cleared?'今日クリア済み':'今日の挑戦'}</span><span>連続 ${daily.streak}日</span><span>Solo完走 ${soloSummary.totalClears}回</span></div></div><button class="btn primary" id="dailySolo">${daily.cleared?'もう一度':'挑戦する'}</button></section><div class="section-head"><h2>Solo Progress</h2><span class="muted">自己ベスト</span></div><section class="solo-progress-list">${SOLO_GAME_IDS.map(id=>{const g=byId.get(id),p=soloProgress.game(id);return`<button class="solo-progress-row" data-game="${id}"><span class="recommend-symbol">${g?.emoji||''}</span><span><b>${esc(g?.title||id)}</b><small>最短 ${p?.bestRounds??'—'}ラウンド · 連続成功 ${p?.bestStreak||0} · 完走 ${p?.clears||0}回</small></span><span class="recommend-arrow">→</span></button>`}).join('')}</section>`:''}
  <section class="playtest-entry"><div><div class="eyebrow">PLAYTEST LAB</div><h3>24ゲームの弱点を見る</h3><p>面白さ・分かりやすさ・頭を使う度・再プレイ意向を端末内で集計します。</p></div><button class="btn quiet" id="playtestLab">評価を見る</button></section>
  <section class="playtest-entry stats-entry"><div><div class="eyebrow">LOCAL STATS</div><h3>プレイ履歴と勝率を見る</h3><p>Singleの完走とParty各ラウンドを記録し、プレイヤー別・ゲーム別に集計します。</p></div><button class="btn quiet" id="statsDashboard">成績を見る</button></section>
  <section class="playtest-entry health-entry"><div><div class="eyebrow">GAME HEALTH</div><h3>改善すべきゲームを自動検出</h3><p>プレイ回数・勝率・4軸評価を統合し、問題の種類と次の改善アクションを出します。</p></div><button class="btn quiet" id="gameHealth">分析を見る</button></section>
  <section class="playtest-entry data-entry"><div><div class="eyebrow">DATA VAULT</div><h3>端末データをバックアップ</h3><p>プレイヤー・履歴・評価・お気に入り・Solo進捗をJSONへ保存し、別端末でも復元できます。</p></div><button class="btn quiet" id="dataVault">管理する</button></section>
  <div class="section-head"><h2>For this group</h2><span class="muted">${session.players.length}人向け</span></div>
  <section class="recommend-grid" id="recommendGrid">${recommendedGames(games,session.players.length).map(recommendationHtml).join('')}</section>
  ${favoriteGames.length?`<div class="section-head"><h2>Favorites</h2><span class="muted">${favoriteGames.length} games</span></div><section class="library-list" id="favoriteList">${favoriteGames.map(libraryRowHtml).join('')}</section>`:''}
  ${recentGames.length?`<div class="section-head"><h2>Recent</h2><span class="muted">最近遊んだ</span></div><section class="library-list" id="recentList">${recentGames.map(libraryRowHtml).join('')}</section>`:''}
  <div class="section-head"><h2>Games</h2><span class="muted" id="catalogCount">${games.length} titles</span></div>
  <section class="catalog-tools"><input id="gameSearch" type="search" inputmode="search" placeholder="ゲーム名・特徴で検索" aria-label="ゲーム検索"><div class="catalog-chips">${CATEGORY_DEFS.map(c=>`<button class="catalog-chip ${c.id==='all'?'active':''}" data-catalog-category="${c.id}">${c.label}</button>`).join('')}</div><div class="smart-filter-grid"><label><span>難易度</span><select id="difficultyFilter"><option value="all">指定なし</option><option value="1">かるめ</option><option value="2">標準</option><option value="3">しっかり</option></select></label><label><span>時間</span><select id="timeFilter"><option value="all">指定なし</option><option value="3">3分以内</option><option value="5">5分以内</option><option value="8">8分以内</option><option value="10">10分以内</option></select></label></div><button class="catalog-chip active-fit" id="recommendedOnly" aria-pressed="true">この${session.players.length}人におすすめだけ</button><button class="btn primary full picker-button" id="pickOne">この条件で1本選ぶ</button><button class="btn quiet full" id="buildPartyFromFilter" ${session.players.length<2?'disabled':''}>この条件でSmart Party</button><div class="picker-result" id="pickerResult" hidden></div></section>
  <section class="games" id="gameCatalog"></section>
  <div class="catalog-empty" id="catalogEmpty" hidden>条件に合うゲームがありません。</div>
  <div class="footer">Party Pocket · local play on GitHub Pages</div>`;

  renderPlayers();
  app.querySelector('#addPlayer').onclick=()=>{if(draftPlayers.length>=8)return toast('最大8人です');draftPlayers.push(`プレイヤー${draftPlayers.length+1}`);renderPlayers()};
  app.querySelector('#savePlayers').onclick=()=>saveDraft();
  app.querySelector('#manageGroups').onclick=()=>{saveDraft({quiet:true});renderPlayerGroups()};
  app.querySelectorAll('[data-load-group]').forEach(button=>button.onclick=()=>{
    const group=playerGroups.get(button.dataset.loadGroup);if(!group)return;
    session.savePlayers(group.players);playerGroups.touch(group.id);renderHome();toast(group.name+'を呼び出しました');
  });
  app.querySelectorAll('[data-quick-group]').forEach(button=>button.onclick=()=>{
    const group=playerGroups.get(button.dataset.quickGroup);if(!group)return;
    session.savePlayers(group.players);playerGroups.touch(group.id);
    if(group.players.length===1){
      const gameId=soloProgress.daily().gameId;session.startSingle();return startGame(gameId);
    }
    return startSmartParty(3,{players:group.players});
  });
  app.querySelector('#partyMode').onclick=()=>{if(session.players.length<2)return toast('Partyは2人以上で遊べます');saveDraft({quiet:true});renderPartySetup()};
  app.querySelectorAll('[data-smart-rounds]').forEach(button=>button.onclick=()=>{saveDraft({quiet:true});startSmartParty(+button.dataset.smartRounds)});
  app.querySelector('#installApp')?.addEventListener('click',async()=>{
    if(canPromptInstall()){
      const accepted=await requestInstall();
      if(!accepted)toast('インストールはキャンセルされました');
      return;
    }
    if(isIOS())toast('Safariの共有ボタン → ホーム画面に追加');
    else toast('ブラウザのメニューから「アプリをインストール」を選んでください');
  });
  app.querySelector('#applyUpdate')?.addEventListener('click',()=>{
    const waiting=pwaUpdateRegistration?.waiting;
    if(waiting){toast('更新を適用します');waiting.postMessage({type:'SKIP_WAITING'})}
  });
  app.querySelector('#dailySolo')?.addEventListener('click',()=>renderGameDetail(daily.gameId));
  if(app.querySelector('.solo-progress-list'))bindGameLaunch(app.querySelector('.solo-progress-list'));
  app.querySelector('#playtestLab').onclick=renderPlaytestLab;
  app.querySelector('#statsDashboard').onclick=renderStatsDashboard;
  app.querySelector('#gameHealth').onclick=renderGameHealth;
  app.querySelector('#dataVault').onclick=renderDataVault;
  const catalogState={category:'all',query:'',difficulty:'all',maxMinutes:'all',playerCount:session.players.length,recommendedOnly:true};
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
  app.querySelector('#difficultyFilter').onchange=e=>{catalogState.difficulty=e.target.value;paintCatalog()};
  app.querySelector('#timeFilter').onchange=e=>{catalogState.maxMinutes=e.target.value;paintCatalog()};
  app.querySelectorAll('[data-catalog-category]').forEach(button=>button.onclick=()=>{catalogState.category=button.dataset.catalogCategory;paintCatalog()});
  app.querySelector('#recommendedOnly').onclick=e=>{
    catalogState.recommendedOnly=!catalogState.recommendedOnly;
    e.currentTarget.classList.toggle('active-fit',catalogState.recommendedOnly);
    e.currentTarget.setAttribute('aria-pressed',String(catalogState.recommendedOnly));
    paintCatalog();
  };
  app.querySelector('#buildPartyFromFilter').onclick=()=>{
    if(session.players.length<2)return toast('Partyは2人以上で遊べます');
    const allowed=filterGames(games,catalogState).map(g=>g.id);
    if(allowed.length<2)return toast('この条件ではPartyを組めません');
    const rounds=Math.min(6,Math.max(3,allowed.length));
    const plan=smartPartyPlan(rounds,{allowedGameIds:allowed});
    if(plan.length<2)return toast('この条件ではPartyを組めません');
    const info=summarizeSmartParty(plan),box=app.querySelector('#pickerResult');
    box.hidden=false;
    box.innerHTML=`<div><div class="eyebrow">SMART PARTY</div><b>${plan.map(g=>g.emoji+' '+g.title).join(' · ')}</b><small>${plan.length}R · 約${info.totalMinutes}分 · 条件内から自動構成</small></div><button class="btn primary" id="startFilteredParty">これで開始</button>`;
    box.querySelector('#startFilteredParty').onclick=()=>{session.startParty(plan.map(g=>g.id),plan.length);renderPartyIntermission(true)};
  };
  app.querySelector('#pickOne').onclick=()=>{
    const picked=pickGame(games,catalogState),box=app.querySelector('#pickerResult');
    if(!picked){box.hidden=true;return toast('この条件に合うゲームがありません')}
    const meta=gameMeta(picked.id);
    box.hidden=false;
    box.innerHTML=`<div><div class="eyebrow">SMART PICK</div><b>${picked.emoji} ${picked.title}</b><small>${difficultyLabel(meta.difficulty)} · 約${meta.minutes}分 · ${playerRangeLabel(meta)}推奨</small></div><button class="btn primary" data-game="${picked.id}">これで遊ぶ</button>`;
    bindGameLaunch(box);
  };
  bindGameLaunch(app.querySelector('#recommendGrid'));
  if(app.querySelector('#favoriteList'))bindGameLaunch(app.querySelector('#favoriteList'));
  if(app.querySelector('#recentList'))bindGameLaunch(app.querySelector('#recentList'));
  paintCatalog();
  app.querySelector('#resumeParty')?.addEventListener('click',()=>{if(session.resumeParty()){draftPlayers=[...session.players];renderPartyIntermission(false,null,true)}});
  app.querySelector('#discardParty')?.addEventListener('click',()=>{session.clearSavedParty();renderHome()});
}

function playtestStatus(row){
  if(row.responses<2)return{label:row.responses?'評価追加待ち':'未評価',tone:'muted'};
  if(row.qualityAverage<3.3)return{label:'改善優先',tone:'weak'};
  if(row.qualityAverage<4)return{label:'要観察',tone:'watch'};
  return{label:'好調',tone:'good'};
}

function weakestAxis(row){
  const axes=[['面白さ',row.fun.average],['分かりやすさ',row.clarity.average],['また遊びたい',row.replay.average]].filter(([,v])=>Number.isFinite(v));
  if(!axes.length)return'データなし';
  axes.sort((a,b)=>a[1]-b[1]);return `${axes[0][0]} ${oneDecimal(axes[0][1])}`;
}

function renderPlaytestLab(){
  disposeActiveGame();
  const games=listGames(),byId=new Map(games.map(g=>[g.id,g]));
  const report=playtests.report(games.map(g=>g.id)).map(row=>({...row,game:byId.get(row.gameId)}));
  const evaluated=report.filter(r=>r.responses>0).length;
  const stable=report.filter(r=>r.responses>=2);
  const weak=stable.filter(r=>r.qualityAverage<3.3).length;
  const ordered=[...report].sort((a,b)=>{
    const ag=a.responses>=2?0:a.responses?1:2,bg=b.responses>=2?0:b.responses?1:2;
    return ag-bg||(a.qualityAverage??99)-(b.qualityAverage??99)||b.responses-a.responses;
  });
  updateBadge('PLAYTEST LAB');
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="labBack">←</button><div><div class="eyebrow">PLAYTEST LAB</div><div class="screen-title">ゲーム品質を確認</div></div></div><section class="lab-summary"><div><b>${evaluated}</b><span>/ ${games.length} 評価済み</span></div><div><b>${stable.length}</b><span>2回以上</span></div><div><b>${weak}</b><span>改善優先</span></div></section><div class="lab-note">改善優先度は「面白さ・分かりやすさ・もう一度遊びたい」の平均で判定。頭を使う度はゲーム特性として別表示します。</div><section class="lab-list">${ordered.map(row=>{const s=playtestStatus(row),g=row.game;return`<button class="lab-row" data-game="${row.gameId}"><span class="lab-symbol">${g?.emoji||''}</span><span class="lab-main"><b>${esc(g?.title||row.gameId)}</b><small>${row.responses? `品質 ${oneDecimal(row.qualityAverage)} · 頭脳 ${oneDecimal(row.brain.average)} · ${row.responses}回`:row.legacyResponses?`新4軸評価なし · 旧評価 ${row.legacyResponses}件`:'まだ評価なし'}</small><small>${row.responses? `弱い軸: ${weakestAxis(row)}`:'プレイ後に4軸評価を記録してください'}</small></span><span class="lab-status ${s.tone}">${s.label}</span></button>`}).join('')}</section>`;
  app.querySelector('#labBack').onclick=renderHome;
  bindGameLaunch(app.querySelector('.lab-list'));
}

function percent(value){return `${Math.round((Number(value)||0)*100)}%`}
function formatPlayedAt(at){
  try{return new Date(at).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
  catch{return''}
}

function renderStatsDashboard(){
  disposeActiveGame();
  const games=listGames(),byId=new Map(games.map(g=>[g.id,g])),report=stats.report(games.map(g=>g.id));
  const gameRows=report.gameStats.map(row=>({...row,game:byId.get(row.gameId)}));
  const mostPlayed=gameRows[0];
  updateBadge('LOCAL STATS');
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="statsBack">←</button><div><div class="eyebrow">LOCAL STATS</div><div class="screen-title">プレイ履歴と勝率</div></div></div>
  <section class="lab-summary stats-summary"><div><b>${report.totalPlays}</b><span>記録試合</span></div><div><b>${report.gamesPlayed}</b><span>/ ${games.length} games</span></div><div><b>${report.playerStats.length}</b><span>players</span></div></section>
  <div class="lab-note">Singleは5点先取で完走した時に1試合、Partyは各ラウンド終了時に1試合として記録します。途中離脱は集計しません。</div>
  ${mostPlayed?`<section class="stat-highlight"><div class="eyebrow">MOST PLAYED</div><b>${mostPlayed.game?.emoji||''} ${esc(mostPlayed.game?.title||mostPlayed.gameId)}</b><span>${mostPlayed.plays}試合</span></section>`:''}
  <div class="section-head compact-head"><h2>Players</h2><span class="muted">勝利数 / 勝率</span></div>
  <section class="stats-list">${report.playerStats.length?report.playerStats.map((p,i)=>`<div class="stats-row"><span class="stats-rank">${String(i+1).padStart(2,'0')}</span><span><b>${esc(p.name)}</b><small>${p.plays}試合 · Single ${p.single} / Party ${p.party}</small></span><span class="stats-value"><b>${p.wins}勝</b><small>${percent(p.winRate)}</small></span></div>`).join(''):'<div class="catalog-empty">まだ完了した試合がありません。</div>'}</section>
  <div class="section-head compact-head"><h2>Games</h2><span class="muted">プレイ回数</span></div>
  <section class="stats-list">${gameRows.length?gameRows.map(row=>`<button class="stats-row game-stat-row" data-game="${row.gameId}"><span class="lab-symbol">${row.game?.emoji||''}</span><span><b>${esc(row.game?.title||row.gameId)}</b><small>Single ${row.single} · Party ${row.party}${row.leader?` ·最多勝 ${esc(row.leader.name)} ${row.leader.wins}勝`:''}</small></span><span class="stats-value"><b>${row.plays}</b><small>plays</small></span></button>`).join(''):'<div class="catalog-empty">ゲーム別データはまだありません。</div>'}</section>
  <div class="section-head compact-head"><h2>Recent results</h2><span class="muted">最大20件</span></div>
  <section class="history-list">${report.recent.length?report.recent.map(entry=>{const g=byId.get(entry.gameId),winnerNames=entry.winners.map(i=>entry.players[i]).filter(Boolean);return`<div class="history-row"><span class="history-symbol">${g?.emoji||''}</span><span><b>${esc(g?.title||entry.gameId)}</b><small>${entry.mode==='party'?'Party round':'Single'} · ${winnerNames.length?`勝者 ${winnerNames.map(esc).join(' & ')}`:'勝者なし'}</small></span><time>${formatPlayedAt(entry.at)}</time></div>`}).join(''):'<div class="catalog-empty">履歴はまだありません。</div>'}</section>`;
  app.querySelector('#statsBack').onclick=renderHome;
  app.querySelectorAll('.game-stat-row[data-game]').forEach(button=>button.onclick=()=>renderGameDetail(button.dataset.game));
}

function healthStatusLabel(status){
  return status==='action'?'改善優先':status==='watch'?'要観察':status==='data'?'データ収集中':'健全';
}

function renderGameHealth(){
  disposeActiveGame();
  const games=listGames(),ids=games.map(g=>g.id),byId=new Map(games.map(g=>[g.id,g]));
  const pRows=playtests.report(ids);
  const sReport=stats.report(ids);
  const report=buildHealthReport(ids,pRows,sReport.gameStats);
  updateBadge('GAME HEALTH');

  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="healthBack">←</button><div><div class="eyebrow">GAME HEALTH</div><div class="screen-title">改善対象を自動分析</div></div></div>
  <section class="health-summary"><div class="health-action"><b>${report.actionCount}</b><span>改善優先</span></div><div class="health-watch"><b>${report.watchCount}</b><span>要観察</span></div><div class="health-data"><b>${report.dataCount}</b><span>データ収集中</span></div><div class="health-good"><b>${report.healthyCount}</b><span>健全</span></div></section>
  <div class="lab-note">誤判定を避けるため、評価系は新4軸評価2件以上、勝率偏りは5試合以上かつ対象プレイヤー4試合以上・勝率75%以上でのみ警告します。</div>
  <section class="health-list">${report.priority.map(row=>{
    const game=byId.get(row.gameId),primary=row.issues[0];
    return`<article class="health-card ${row.status}"><button class="health-card-head" data-game="${row.gameId}"><span class="lab-symbol">${game?.emoji||''}</span><span><b>${esc(game?.title||row.gameId)}</b><small>${row.plays}試合 · 新4軸評価 ${row.reviews}件</small></span><span class="health-status ${row.status}">${healthStatusLabel(row.status)}</span></button>${row.issues.length?`<div class="health-issues">${row.issues.map(item=>`<div class="health-issue ${item.severity}"><div><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></div><p>${esc(item.action)}</p></div>`).join('')}</div>`:'<div class="health-issues"><div class="health-issue healthy"><div><b>明確な警告なし</b><small>現在の閾値では問題を検出していません。</small></div><p>データを継続して蓄積する</p></div></div>'}</article>`;
  }).join('')}</section>`;

  app.querySelector('#healthBack').onclick=renderHome;
  app.querySelectorAll('.health-card-head[data-game]').forEach(button=>button.onclick=()=>renderGameDetail(button.dataset.game));
}

function formatBytes(bytes){
  const value=Number(bytes)||0;
  if(value<1024)return value+' B';
  if(value<1024*1024)return (value/1024).toFixed(1)+' KB';
  return (value/(1024*1024)).toFixed(2)+' MB';
}

function formatBackupDate(value){
  if(!value)return'日時不明';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'日時不明':date.toLocaleString('ja-JP');
}

async function exportPartyPocketBackup(){
  const backup=createBackup(globalThis.localStorage,{appVersion:APP_VERSION}),textValue=stringifyBackup(backup);
  const filename=backupFilename(),blob=new Blob([textValue],{type:'application/json'});
  try{
    const file=new File([blob],filename,{type:'application/json'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      await navigator.share({files:[file],title:'Party Pocket Backup'});
      return;
    }
  }catch(error){
    if(error?.name==='AbortError')return;
  }
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('バックアップを書き出しました');
}

function renderDataVault(){
  disposeActiveGame();
  updateBadge('DATA VAULT');
  const current=createBackup(globalThis.localStorage,{appVersion:APP_VERSION}),summary=backupSummary(current);
  let pendingBackup=null;

  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="vaultBack">←</button><div><div class="eyebrow">DATA VAULT</div><div class="screen-title">バックアップと復元</div></div></div>
  <section class="vault-summary"><div><b>${summary.keyCount}</b><span>保存キー</span></div><div><b>${formatBytes(summary.bytes)}</b><span>バックアップ量</span></div><div><b>v${APP_VERSION}</b><span>現在版</span></div></section>
  <section class="panel vault-section"><div><div class="eyebrow">EXPORT</div><h3>この端末のデータを保存</h3><p>プレイヤー名、Party設定、履歴、評価、お気に入り、Solo進捗などParty PocketのlocalStorageを1つのJSONへまとめます。</p></div><button class="btn primary full" id="exportBackup">バックアップを書き出す</button></section>
  <section class="panel vault-section"><div><div class="eyebrow">RESTORE</div><h3>バックアップから復元</h3><p>JSONを検証してから内容を表示します。復元すると、現在のParty Pocketデータはバックアップ内容で置き換わります。</p></div><input id="restoreFile" class="vault-file-input" type="file" accept=".json,application/json"><button class="btn quiet full" id="chooseBackup">バックアップを選ぶ</button><div class="restore-preview" id="restorePreview" hidden></div></section>
  <section class="panel vault-section danger-zone"><div><div class="eyebrow">RESET</div><h3>端末データを初期化</h3><p>Party Pocketのユーザーデータだけを削除します。アプリ本体・Service Worker・オフラインキャッシュは残ります。</p></div><button class="btn danger full" id="clearData">端末データをすべて削除</button></section>
  <div class="vault-note">端末変更やSafariのサイトデータ削除前には、先にバックアップを書き出してください。</div>`;

  app.querySelector('#vaultBack').onclick=renderHome;
  app.querySelector('#exportBackup').onclick=exportPartyPocketBackup;
  const fileInput=app.querySelector('#restoreFile'),preview=app.querySelector('#restorePreview');
  app.querySelector('#chooseBackup').onclick=()=>fileInput.click();
  fileInput.onchange=async()=>{
    pendingBackup=null;
    const file=fileInput.files?.[0];
    if(!file)return;
    try{
      const parsed=parseBackupText(await file.text()),info=backupSummary(parsed);
      pendingBackup=parsed;
      preview.hidden=false;
      preview.innerHTML=`<div><div class="eyebrow">VALID BACKUP</div><b>${esc(file.name)}</b><small>作成: ${esc(formatBackupDate(info.exportedAt))}<br>App: ${esc(info.appVersion)} · ${info.keyCount} keys · ${formatBytes(info.bytes)}</small></div><button class="btn primary" id="confirmRestore">このデータを復元</button>`;
      preview.querySelector('#confirmRestore').onclick=()=>{
        if(!pendingBackup)return;
        if(!confirm('現在のParty Pocketデータを、このバックアップ内容で置き換えます。続けますか？'))return;
        try{restoreBackup(globalThis.localStorage,pendingBackup);location.reload()}
        catch{toast('復元に失敗しました')}
      };
    }catch(error){
      preview.hidden=false;
      preview.innerHTML=`<div class="restore-error"><b>読み込めませんでした</b><small>${esc(error?.message||'バックアップ形式を確認してください')}</small></div>`;
    }
  };
  app.querySelector('#clearData').onclick=()=>{
    if(!confirm('プレイヤー、履歴、評価、Solo進捗などParty Pocketの端末データをすべて削除します。元に戻せません。続けますか？'))return;
    clearPartyPocketData(globalThis.localStorage);location.reload();
  };
}

function renderPlayerGroups(){
  disposeActiveGame();
  const groups=playerGroups.recent();
  updateBadge('PLAYER GROUPS');
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="groupsBack">←</button><div><div class="eyebrow">PLAYER GROUPS</div><div class="screen-title">いつものメンバー</div></div></div>
  <section class="panel group-save-panel"><div><div class="eyebrow">SAVE CURRENT</div><h3>現在の${session.players.length}人を保存</h3><p>${session.players.map(esc).join(' · ')}</p></div><div class="group-save-form"><input id="groupName" maxlength="24" placeholder="例: 家族 / いつもの4人"><button class="btn primary" id="saveGroup">グループ保存</button></div><div class="helper">同じ名前で保存するとメンバーを上書きします。最大8グループ。</div></section>
  <div class="section-head"><h2>Saved Groups</h2><span class="muted">${groups.length} / 8</span></div>
  <section class="group-manager-list">${groups.length?groups.map(group=>`<article class="group-manager-row"><div><b>${esc(group.name)}</b><small>${group.players.length}人 · ${group.players.map(esc).join(' · ')}</small></div><div class="group-manager-actions"><button class="btn quiet" data-use-group="${group.id}">呼び出す</button><button class="icon-btn danger-icon" data-delete-group="${group.id}" aria-label="${esc(group.name)}を削除">×</button></div></article>`).join(''):'<div class="catalog-empty">まだ保存グループがありません。</div>'}</section>
  <div class="vault-note">グループ情報もData Vaultのバックアップに自動で含まれます。</div>`;

  app.querySelector('#groupsBack').onclick=renderHome;
  app.querySelector('#saveGroup').onclick=()=>{
    const name=app.querySelector('#groupName').value.trim();
    if(!name)return toast('グループ名を入力してください');
    try{playerGroups.save(name,session.players);renderPlayerGroups();toast(name+'を保存しました')}
    catch(error){toast(error?.message||'保存できませんでした')}
  };
  app.querySelectorAll('[data-use-group]').forEach(button=>button.onclick=()=>{
    const group=playerGroups.get(button.dataset.useGroup);if(!group)return;
    session.savePlayers(group.players);playerGroups.touch(group.id);renderHome();toast(group.name+'を呼び出しました');
  });
  app.querySelectorAll('[data-delete-group]').forEach(button=>button.onclick=()=>{
    const group=playerGroups.get(button.dataset.deleteGroup);if(!group)return;
    if(!confirm(group.name+'を削除しますか？'))return;
    playerGroups.remove(group.id);renderPlayerGroups();
  });
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
    <section class="panel setup-section smart-setup"><div><div class="eyebrow">SMART BUILD</div><div class="setup-label">自動で${state.rounds}本選ぶ</div><p class="helper">人数・履歴・お気に入り・評価・健全性・カテゴリ多様性から構成します。</p></div><button class="btn primary" id="smartBuild">Smart構成</button></section>
    <section class="panel setup-section"><div class="setup-label">プリセット</div><div class="preset-row"><button class="preset-btn" data-preset="all">バランス</button><button class="preset-btn" data-preset="brain">頭脳戦</button><button class="preset-btn" data-preset="strategy">戦略</button><button class="preset-btn" data-preset="foresight">先読み</button><button class="preset-btn" data-preset="perfect">完全情報</button><button class="preset-btn" data-preset="read">読み合い</button><button class="preset-btn" data-preset="talk">会話中心</button><button class="preset-btn" data-preset="quick">短時間</button></div></section>
    <section class="panel setup-section"><div class="setup-head"><div class="setup-label">ゲーム選択</div><span>${state.selected.size}/${games.length}</span></div><div class="select-games">${games.map((g,i)=>`<button class="select-game ${state.selected.has(g.id)?'selected':''}" data-select-game="${g.id}" aria-pressed="${state.selected.has(g.id)}"><span class="game-index">${String(i+1).padStart(2,'0')}</span><span class="select-title">${g.title}</span><span class="select-check">${state.selected.has(g.id)?'選択中':'除外'}</span></button>`).join('')}</div><p class="helper">2ゲーム以上を選択してください。ゲーム数よりラウンド数が多い場合は重複して登場します。</p></section>
    <button class="btn primary full" id="startParty">${state.rounds}ラウンドで開始</button>`;
    app.querySelector('#setupBack').onclick=renderHome;
    app.querySelectorAll('[data-rounds]').forEach(b=>b.onclick=()=>{state.rounds=+b.dataset.rounds;paint()});
    app.querySelector('#smartBuild').onclick=()=>{const plan=smartPartyPlan(state.rounds);state.selected=new Set(plan.map(g=>g.id));paint();toast('Smart構成を作りました')};
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
  disposeActiveGame();const game=getGame(id);if(!game)return renderHome();library.touchRecent(id);if(session.mode==='single')lastSingleGameId=id;
  if(session.mode==='single'&&session.players.length===1&&SOLO_GAME_IDS.includes(id)){soloRun={gameId:id,rounds:0,currentStreak:0,maxStreak:0,lastScore:0};lastSoloResult=null}else if(session.mode==='single'){soloRun=null;lastSoloResult=null}
  updateBadge(session.mode==='party'?`Round ${session.party.round+1}/${session.party.totalRounds}`:'First to 5');
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="backButton">←</button><div class="game-heading"><span class="game-symbol small">${game.emoji}</span><div><div class="eyebrow">${session.mode==='party'?'PARTY ROUND':'SINGLE GAME'}</div><div class="screen-title">${game.title}</div></div></div></div><div class="scorebar" data-scorebar></div><section class="stage" id="gameStage"></section>`;
  app.querySelector('#backButton').onclick=renderHome;renderScorebar();
  const ctx={root:app.querySelector('#gameStage'),session,esc,toast,renderScorebar,completeRound:restart=>completeRound(restart)};
  activeCleanup=game.mount(ctx)||null;
}

function completeRound(restart){
  renderScorebar();
  if(session.mode==='single'){
    if(soloRun&&soloRun.gameId===lastSingleGameId){
      soloRun.rounds++;
      const gain=(session.scores[0]||0)-soloRun.lastScore;
      soloRun.currentStreak=gain>0?soloRun.currentStreak+1:0;
      soloRun.maxStreak=Math.max(soloRun.maxStreak,soloRun.currentStreak);
      soloRun.lastScore=session.scores[0]||0;
    }
    if(Math.max(...session.scores)>=5){
      const winners=session.winnerIndexes(false);
      stats.record({gameId:lastSingleGameId,mode:'single',players:[...session.players],scores:[...session.scores],winners});
      if(soloRun){
        soloProgress.recordRun(lastSingleGameId,{rounds:soloRun.rounds,maxStreak:soloRun.maxStreak,completed:true});
        lastSoloResult={gameId:lastSingleGameId,rounds:soloRun.rounds,maxStreak:soloRun.maxStreak,game:soloProgress.game(lastSingleGameId),daily:soloProgress.daily()};
      }
      disposeActiveGame();return renderWinner(false,lastSingleGameId);
    }
    return restart();
  }
  const completedGameId=session.currentPartyGame(),result=session.finishPartyRound();
  stats.record({gameId:completedGameId,mode:'party',players:[...session.players],scores:[...result.awards],winners:winnerIndexesFromScores(result.awards)});
  disposeActiveGame();
  if(result.finished)return renderWinner(true,completedGameId);
  renderPartyIntermission(false,result,false,completedGameId);
}

function renderPartyIntermission(first=false,result=null,resuming=false,completedGameId=null){
  const nextId=session.currentPartyGame(),game=getGame(nextId),progress=session.party.round/session.party.totalRounds*100;
  updateBadge(`Round ${session.party.round+1}/${session.party.totalRounds}`);
  const awardHtml=result?`<section class="card result-card"><div class="eyebrow">ROUND RESULT</div><div class="result-list">${session.players.map((name,i)=>`<div class="result-row"><span>${esc(name)}</span><span>+${result.awards[i]} Party pt</span></div>`).join('')}</div></section>`:'';
  const resumeNote=resuming?'<div class="notice">保存地点から再開しました。途中だったラウンドは最初から始まります。</div>':'';
  app.innerHTML=`<section class="panel party-board"><div class="eyebrow">PARTY</div><div class="prompt compact">${first?'構成完了':resuming?'ゲームを再開':'次のラウンド'}</div><div class="party-progress"><span style="width:${progress}%"></span></div>${resumeNote}${awardHtml}${completedGameId?playtestPromptHtml(completedGameId):''}<div class="standings"><div class="setup-label">Standings</div><div class="result-list">${rankingHtml(session.partyScores,'Party pt')}</div></div><div class="next-game"><div class="game-card-top"><span class="game-index">${String(session.party.round+1).padStart(2,'0')} / ${String(session.party.totalRounds).padStart(2,'0')}</span><span class="game-symbol">${game.emoji}</span></div><h3>${game.title}</h3><p>${game.description}</p></div><button class="btn primary full" id="partyNext">${first?'開始する':resuming?'このラウンドを始める':'次へ'}</button></section>`;
  if(completedGameId)bindPlaytest(completedGameId);app.querySelector('#partyNext').onclick=()=>startGame(nextId);
}

function renderWinner(isParty,ratingGameId=null){
  disposeActiveGame();const winners=session.winnerIndexes(isParty),scores=isParty?session.partyScores:session.scores;
  updateBadge('RESULT');
  const soloResultHtml=!isParty&&lastSoloResult&&lastSoloResult.gameId===ratingGameId?`<section class="solo-result-card"><div class="eyebrow">SOLO RESULT</div><div class="solo-result-grid"><div><b>${lastSoloResult.rounds}</b><span>クリアラウンド</span></div><div><b>${lastSoloResult.game.bestRounds??'—'}</b><span>自己ベスト</span></div><div><b>${lastSoloResult.maxStreak}</b><span>連続成功</span></div></div>${lastSoloResult.daily.gameId===ratingGameId&&lastSoloResult.daily.cleared?`<div class="solo-daily-clear">DAILY CLEAR · ${lastSoloResult.daily.streak}日連続</div>`:''}</section>`:'';
  app.innerHTML=`<section class="panel winner"><div class="winner-mark">RESULT</div><div class="eyebrow">${isParty?'PARTY COMPLETE':'GAME COMPLETE'}</div><h2>${winners.map(i=>esc(session.players[i])).join(' & ')}</h2><p class="muted">${winners.length>1?'同点首位':'1位'}</p><div class="result-list">${rankingHtml(scores,isParty?'Party pt':'pt')}</div>${soloResultHtml}${ratingGameId?playtestPromptHtml(ratingGameId):''}<div class="actions"><button class="btn quiet" id="homeResult">ホーム</button><button class="btn primary" id="againResult">もう一度</button></div></section>`;
  if(ratingGameId)bindPlaytest(ratingGameId);
  app.querySelector('#homeResult').onclick=renderHome;
  app.querySelector('#againResult').onclick=()=>{
    if(isParty){const games=listGames(),settings=partySettings.load(games.map(g=>g.id));session.startParty(settings.gameIds,settings.rounds);return renderPartyIntermission(true)}
    if(lastSingleGameId){session.startSingle();return startGame(lastSingleGameId)}renderHome();
  };
}

function refreshHomeIfVisible(){if(app.querySelector('.hero'))renderHome()}
watchInstallPrompt(ready=>{pwaInstallReady=ready;refreshHomeIfVisible()});
watchConnectivity(()=>refreshHomeIfVisible());
registerPWA(registration=>{pwaUpdateRegistration=registration;refreshHomeIfVisible()});
navigator.serviceWorker?.addEventListener?.('controllerchange',()=>location.reload());

renderHome(););
    box.querySelector('#startFilteredParty').onclick=()=>{session.startParty(plan.map(g=>g.id),plan.length);renderPartyIntermission(true)};
  };
  app.querySelector('#pickOne').onclick=()=>{
    const picked=pickGame(games,catalogState),box=app.querySelector('#pickerResult');
    if(!picked){box.hidden=true;return toast('この条件に合うゲームがありません')}
    const meta=gameMeta(picked.id);
    box.hidden=false;
    box.innerHTML=`<div><div class="eyebrow">SMART PICK</div><b>${picked.emoji} ${picked.title}</b><small>${difficultyLabel(meta.difficulty)} · 約${meta.minutes}分 · ${playerRangeLabel(meta)}推奨</small></div><button class="btn primary" data-game="${picked.id}">これで遊ぶ</button>`;
    bindGameLaunch(box);
  };
  bindGameLaunch(app.querySelector('#recommendGrid'));
  if(app.querySelector('#favoriteList'))bindGameLaunch(app.querySelector('#favoriteList'));
  if(app.querySelector('#recentList'))bindGameLaunch(app.querySelector('#recentList'));
  paintCatalog();
  app.querySelector('#resumeParty')?.addEventListener('click',()=>{if(session.resumeParty()){draftPlayers=[...session.players];renderPartyIntermission(false,null,true)}});
  app.querySelector('#discardParty')?.addEventListener('click',()=>{session.clearSavedParty();renderHome()});
}

function playtestStatus(row){
  if(row.responses<2)return{label:row.responses?'評価追加待ち':'未評価',tone:'muted'};
  if(row.qualityAverage<3.3)return{label:'改善優先',tone:'weak'};
  if(row.qualityAverage<4)return{label:'要観察',tone:'watch'};
  return{label:'好調',tone:'good'};
}

function weakestAxis(row){
  const axes=[['面白さ',row.fun.average],['分かりやすさ',row.clarity.average],['また遊びたい',row.replay.average]].filter(([,v])=>Number.isFinite(v));
  if(!axes.length)return'データなし';
  axes.sort((a,b)=>a[1]-b[1]);return `${axes[0][0]} ${oneDecimal(axes[0][1])}`;
}

function renderPlaytestLab(){
  disposeActiveGame();
  const games=listGames(),byId=new Map(games.map(g=>[g.id,g]));
  const report=playtests.report(games.map(g=>g.id)).map(row=>({...row,game:byId.get(row.gameId)}));
  const evaluated=report.filter(r=>r.responses>0).length;
  const stable=report.filter(r=>r.responses>=2);
  const weak=stable.filter(r=>r.qualityAverage<3.3).length;
  const ordered=[...report].sort((a,b)=>{
    const ag=a.responses>=2?0:a.responses?1:2,bg=b.responses>=2?0:b.responses?1:2;
    return ag-bg||(a.qualityAverage??99)-(b.qualityAverage??99)||b.responses-a.responses;
  });
  updateBadge('PLAYTEST LAB');
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="labBack">←</button><div><div class="eyebrow">PLAYTEST LAB</div><div class="screen-title">ゲーム品質を確認</div></div></div><section class="lab-summary"><div><b>${evaluated}</b><span>/ ${games.length} 評価済み</span></div><div><b>${stable.length}</b><span>2回以上</span></div><div><b>${weak}</b><span>改善優先</span></div></section><div class="lab-note">改善優先度は「面白さ・分かりやすさ・もう一度遊びたい」の平均で判定。頭を使う度はゲーム特性として別表示します。</div><section class="lab-list">${ordered.map(row=>{const s=playtestStatus(row),g=row.game;return`<button class="lab-row" data-game="${row.gameId}"><span class="lab-symbol">${g?.emoji||''}</span><span class="lab-main"><b>${esc(g?.title||row.gameId)}</b><small>${row.responses? `品質 ${oneDecimal(row.qualityAverage)} · 頭脳 ${oneDecimal(row.brain.average)} · ${row.responses}回`:row.legacyResponses?`新4軸評価なし · 旧評価 ${row.legacyResponses}件`:'まだ評価なし'}</small><small>${row.responses? `弱い軸: ${weakestAxis(row)}`:'プレイ後に4軸評価を記録してください'}</small></span><span class="lab-status ${s.tone}">${s.label}</span></button>`}).join('')}</section>`;
  app.querySelector('#labBack').onclick=renderHome;
  bindGameLaunch(app.querySelector('.lab-list'));
}

function percent(value){return `${Math.round((Number(value)||0)*100)}%`}
function formatPlayedAt(at){
  try{return new Date(at).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
  catch{return''}
}

function renderStatsDashboard(){
  disposeActiveGame();
  const games=listGames(),byId=new Map(games.map(g=>[g.id,g])),report=stats.report(games.map(g=>g.id));
  const gameRows=report.gameStats.map(row=>({...row,game:byId.get(row.gameId)}));
  const mostPlayed=gameRows[0];
  updateBadge('LOCAL STATS');
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="statsBack">←</button><div><div class="eyebrow">LOCAL STATS</div><div class="screen-title">プレイ履歴と勝率</div></div></div>
  <section class="lab-summary stats-summary"><div><b>${report.totalPlays}</b><span>記録試合</span></div><div><b>${report.gamesPlayed}</b><span>/ ${games.length} games</span></div><div><b>${report.playerStats.length}</b><span>players</span></div></section>
  <div class="lab-note">Singleは5点先取で完走した時に1試合、Partyは各ラウンド終了時に1試合として記録します。途中離脱は集計しません。</div>
  ${mostPlayed?`<section class="stat-highlight"><div class="eyebrow">MOST PLAYED</div><b>${mostPlayed.game?.emoji||''} ${esc(mostPlayed.game?.title||mostPlayed.gameId)}</b><span>${mostPlayed.plays}試合</span></section>`:''}
  <div class="section-head compact-head"><h2>Players</h2><span class="muted">勝利数 / 勝率</span></div>
  <section class="stats-list">${report.playerStats.length?report.playerStats.map((p,i)=>`<div class="stats-row"><span class="stats-rank">${String(i+1).padStart(2,'0')}</span><span><b>${esc(p.name)}</b><small>${p.plays}試合 · Single ${p.single} / Party ${p.party}</small></span><span class="stats-value"><b>${p.wins}勝</b><small>${percent(p.winRate)}</small></span></div>`).join(''):'<div class="catalog-empty">まだ完了した試合がありません。</div>'}</section>
  <div class="section-head compact-head"><h2>Games</h2><span class="muted">プレイ回数</span></div>
  <section class="stats-list">${gameRows.length?gameRows.map(row=>`<button class="stats-row game-stat-row" data-game="${row.gameId}"><span class="lab-symbol">${row.game?.emoji||''}</span><span><b>${esc(row.game?.title||row.gameId)}</b><small>Single ${row.single} · Party ${row.party}${row.leader?` ·最多勝 ${esc(row.leader.name)} ${row.leader.wins}勝`:''}</small></span><span class="stats-value"><b>${row.plays}</b><small>plays</small></span></button>`).join(''):'<div class="catalog-empty">ゲーム別データはまだありません。</div>'}</section>
  <div class="section-head compact-head"><h2>Recent results</h2><span class="muted">最大20件</span></div>
  <section class="history-list">${report.recent.length?report.recent.map(entry=>{const g=byId.get(entry.gameId),winnerNames=entry.winners.map(i=>entry.players[i]).filter(Boolean);return`<div class="history-row"><span class="history-symbol">${g?.emoji||''}</span><span><b>${esc(g?.title||entry.gameId)}</b><small>${entry.mode==='party'?'Party round':'Single'} · ${winnerNames.length?`勝者 ${winnerNames.map(esc).join(' & ')}`:'勝者なし'}</small></span><time>${formatPlayedAt(entry.at)}</time></div>`}).join(''):'<div class="catalog-empty">履歴はまだありません。</div>'}</section>`;
  app.querySelector('#statsBack').onclick=renderHome;
  app.querySelectorAll('.game-stat-row[data-game]').forEach(button=>button.onclick=()=>renderGameDetail(button.dataset.game));
}

function healthStatusLabel(status){
  return status==='action'?'改善優先':status==='watch'?'要観察':status==='data'?'データ収集中':'健全';
}

function renderGameHealth(){
  disposeActiveGame();
  const games=listGames(),ids=games.map(g=>g.id),byId=new Map(games.map(g=>[g.id,g]));
  const pRows=playtests.report(ids);
  const sReport=stats.report(ids);
  const report=buildHealthReport(ids,pRows,sReport.gameStats);
  updateBadge('GAME HEALTH');

  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="healthBack">←</button><div><div class="eyebrow">GAME HEALTH</div><div class="screen-title">改善対象を自動分析</div></div></div>
  <section class="health-summary"><div class="health-action"><b>${report.actionCount}</b><span>改善優先</span></div><div class="health-watch"><b>${report.watchCount}</b><span>要観察</span></div><div class="health-data"><b>${report.dataCount}</b><span>データ収集中</span></div><div class="health-good"><b>${report.healthyCount}</b><span>健全</span></div></section>
  <div class="lab-note">誤判定を避けるため、評価系は新4軸評価2件以上、勝率偏りは5試合以上かつ対象プレイヤー4試合以上・勝率75%以上でのみ警告します。</div>
  <section class="health-list">${report.priority.map(row=>{
    const game=byId.get(row.gameId),primary=row.issues[0];
    return`<article class="health-card ${row.status}"><button class="health-card-head" data-game="${row.gameId}"><span class="lab-symbol">${game?.emoji||''}</span><span><b>${esc(game?.title||row.gameId)}</b><small>${row.plays}試合 · 新4軸評価 ${row.reviews}件</small></span><span class="health-status ${row.status}">${healthStatusLabel(row.status)}</span></button>${row.issues.length?`<div class="health-issues">${row.issues.map(item=>`<div class="health-issue ${item.severity}"><div><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></div><p>${esc(item.action)}</p></div>`).join('')}</div>`:'<div class="health-issues"><div class="health-issue healthy"><div><b>明確な警告なし</b><small>現在の閾値では問題を検出していません。</small></div><p>データを継続して蓄積する</p></div></div>'}</article>`;
  }).join('')}</section>`;

  app.querySelector('#healthBack').onclick=renderHome;
  app.querySelectorAll('.health-card-head[data-game]').forEach(button=>button.onclick=()=>renderGameDetail(button.dataset.game));
}

function formatBytes(bytes){
  const value=Number(bytes)||0;
  if(value<1024)return value+' B';
  if(value<1024*1024)return (value/1024).toFixed(1)+' KB';
  return (value/(1024*1024)).toFixed(2)+' MB';
}

function formatBackupDate(value){
  if(!value)return'日時不明';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'日時不明':date.toLocaleString('ja-JP');
}

async function exportPartyPocketBackup(){
  const backup=createBackup(globalThis.localStorage,{appVersion:APP_VERSION}),textValue=stringifyBackup(backup);
  const filename=backupFilename(),blob=new Blob([textValue],{type:'application/json'});
  try{
    const file=new File([blob],filename,{type:'application/json'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      await navigator.share({files:[file],title:'Party Pocket Backup'});
      return;
    }
  }catch(error){
    if(error?.name==='AbortError')return;
  }
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('バックアップを書き出しました');
}

function renderDataVault(){
  disposeActiveGame();
  updateBadge('DATA VAULT');
  const current=createBackup(globalThis.localStorage,{appVersion:APP_VERSION}),summary=backupSummary(current);
  let pendingBackup=null;

  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="vaultBack">←</button><div><div class="eyebrow">DATA VAULT</div><div class="screen-title">バックアップと復元</div></div></div>
  <section class="vault-summary"><div><b>${summary.keyCount}</b><span>保存キー</span></div><div><b>${formatBytes(summary.bytes)}</b><span>バックアップ量</span></div><div><b>v${APP_VERSION}</b><span>現在版</span></div></section>
  <section class="panel vault-section"><div><div class="eyebrow">EXPORT</div><h3>この端末のデータを保存</h3><p>プレイヤー名、Party設定、履歴、評価、お気に入り、Solo進捗などParty PocketのlocalStorageを1つのJSONへまとめます。</p></div><button class="btn primary full" id="exportBackup">バックアップを書き出す</button></section>
  <section class="panel vault-section"><div><div class="eyebrow">RESTORE</div><h3>バックアップから復元</h3><p>JSONを検証してから内容を表示します。復元すると、現在のParty Pocketデータはバックアップ内容で置き換わります。</p></div><input id="restoreFile" class="vault-file-input" type="file" accept=".json,application/json"><button class="btn quiet full" id="chooseBackup">バックアップを選ぶ</button><div class="restore-preview" id="restorePreview" hidden></div></section>
  <section class="panel vault-section danger-zone"><div><div class="eyebrow">RESET</div><h3>端末データを初期化</h3><p>Party Pocketのユーザーデータだけを削除します。アプリ本体・Service Worker・オフラインキャッシュは残ります。</p></div><button class="btn danger full" id="clearData">端末データをすべて削除</button></section>
  <div class="vault-note">端末変更やSafariのサイトデータ削除前には、先にバックアップを書き出してください。</div>`;

  app.querySelector('#vaultBack').onclick=renderHome;
  app.querySelector('#exportBackup').onclick=exportPartyPocketBackup;
  const fileInput=app.querySelector('#restoreFile'),preview=app.querySelector('#restorePreview');
  app.querySelector('#chooseBackup').onclick=()=>fileInput.click();
  fileInput.onchange=async()=>{
    pendingBackup=null;
    const file=fileInput.files?.[0];
    if(!file)return;
    try{
      const parsed=parseBackupText(await file.text()),info=backupSummary(parsed);
      pendingBackup=parsed;
      preview.hidden=false;
      preview.innerHTML=`<div><div class="eyebrow">VALID BACKUP</div><b>${esc(file.name)}</b><small>作成: ${esc(formatBackupDate(info.exportedAt))}<br>App: ${esc(info.appVersion)} · ${info.keyCount} keys · ${formatBytes(info.bytes)}</small></div><button class="btn primary" id="confirmRestore">このデータを復元</button>`;
      preview.querySelector('#confirmRestore').onclick=()=>{
        if(!pendingBackup)return;
        if(!confirm('現在のParty Pocketデータを、このバックアップ内容で置き換えます。続けますか？'))return;
        try{restoreBackup(globalThis.localStorage,pendingBackup);location.reload()}
        catch{toast('復元に失敗しました')}
      };
    }catch(error){
      preview.hidden=false;
      preview.innerHTML=`<div class="restore-error"><b>読み込めませんでした</b><small>${esc(error?.message||'バックアップ形式を確認してください')}</small></div>`;
    }
  };
  app.querySelector('#clearData').onclick=()=>{
    if(!confirm('プレイヤー、履歴、評価、Solo進捗などParty Pocketの端末データをすべて削除します。元に戻せません。続けますか？'))return;
    clearPartyPocketData(globalThis.localStorage);location.reload();
  };
}

function renderPlayerGroups(){
  disposeActiveGame();
  const groups=playerGroups.recent();
  updateBadge('PLAYER GROUPS');
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="groupsBack">←</button><div><div class="eyebrow">PLAYER GROUPS</div><div class="screen-title">いつものメンバー</div></div></div>
  <section class="panel group-save-panel"><div><div class="eyebrow">SAVE CURRENT</div><h3>現在の${session.players.length}人を保存</h3><p>${session.players.map(esc).join(' · ')}</p></div><div class="group-save-form"><input id="groupName" maxlength="24" placeholder="例: 家族 / いつもの4人"><button class="btn primary" id="saveGroup">グループ保存</button></div><div class="helper">同じ名前で保存するとメンバーを上書きします。最大8グループ。</div></section>
  <div class="section-head"><h2>Saved Groups</h2><span class="muted">${groups.length} / 8</span></div>
  <section class="group-manager-list">${groups.length?groups.map(group=>`<article class="group-manager-row"><div><b>${esc(group.name)}</b><small>${group.players.length}人 · ${group.players.map(esc).join(' · ')}</small></div><div class="group-manager-actions"><button class="btn quiet" data-use-group="${group.id}">呼び出す</button><button class="icon-btn danger-icon" data-delete-group="${group.id}" aria-label="${esc(group.name)}を削除">×</button></div></article>`).join(''):'<div class="catalog-empty">まだ保存グループがありません。</div>'}</section>
  <div class="vault-note">グループ情報もData Vaultのバックアップに自動で含まれます。</div>`;

  app.querySelector('#groupsBack').onclick=renderHome;
  app.querySelector('#saveGroup').onclick=()=>{
    const name=app.querySelector('#groupName').value.trim();
    if(!name)return toast('グループ名を入力してください');
    try{playerGroups.save(name,session.players);renderPlayerGroups();toast(name+'を保存しました')}
    catch(error){toast(error?.message||'保存できませんでした')}
  };
  app.querySelectorAll('[data-use-group]').forEach(button=>button.onclick=()=>{
    const group=playerGroups.get(button.dataset.useGroup);if(!group)return;
    session.savePlayers(group.players);playerGroups.touch(group.id);renderHome();toast(group.name+'を呼び出しました');
  });
  app.querySelectorAll('[data-delete-group]').forEach(button=>button.onclick=()=>{
    const group=playerGroups.get(button.dataset.deleteGroup);if(!group)return;
    if(!confirm(group.name+'を削除しますか？'))return;
    playerGroups.remove(group.id);renderPlayerGroups();
  });
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
    <section class="panel setup-section smart-setup"><div><div class="eyebrow">SMART BUILD</div><div class="setup-label">自動で${state.rounds}本選ぶ</div><p class="helper">人数・履歴・お気に入り・評価・健全性・カテゴリ多様性から構成します。</p></div><button class="btn primary" id="smartBuild">Smart構成</button></section>
    <section class="panel setup-section"><div class="setup-label">プリセット</div><div class="preset-row"><button class="preset-btn" data-preset="all">バランス</button><button class="preset-btn" data-preset="brain">頭脳戦</button><button class="preset-btn" data-preset="strategy">戦略</button><button class="preset-btn" data-preset="foresight">先読み</button><button class="preset-btn" data-preset="perfect">完全情報</button><button class="preset-btn" data-preset="read">読み合い</button><button class="preset-btn" data-preset="talk">会話中心</button><button class="preset-btn" data-preset="quick">短時間</button></div></section>
    <section class="panel setup-section"><div class="setup-head"><div class="setup-label">ゲーム選択</div><span>${state.selected.size}/${games.length}</span></div><div class="select-games">${games.map((g,i)=>`<button class="select-game ${state.selected.has(g.id)?'selected':''}" data-select-game="${g.id}" aria-pressed="${state.selected.has(g.id)}"><span class="game-index">${String(i+1).padStart(2,'0')}</span><span class="select-title">${g.title}</span><span class="select-check">${state.selected.has(g.id)?'選択中':'除外'}</span></button>`).join('')}</div><p class="helper">2ゲーム以上を選択してください。ゲーム数よりラウンド数が多い場合は重複して登場します。</p></section>
    <button class="btn primary full" id="startParty">${state.rounds}ラウンドで開始</button>`;
    app.querySelector('#setupBack').onclick=renderHome;
    app.querySelectorAll('[data-rounds]').forEach(b=>b.onclick=()=>{state.rounds=+b.dataset.rounds;paint()});
    app.querySelector('#smartBuild').onclick=()=>{const plan=smartPartyPlan(state.rounds);state.selected=new Set(plan.map(g=>g.id));paint();toast('Smart構成を作りました')};
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
  disposeActiveGame();const game=getGame(id);if(!game)return renderHome();library.touchRecent(id);if(session.mode==='single')lastSingleGameId=id;
  if(session.mode==='single'&&session.players.length===1&&SOLO_GAME_IDS.includes(id)){soloRun={gameId:id,rounds:0,currentStreak:0,maxStreak:0,lastScore:0};lastSoloResult=null}else if(session.mode==='single'){soloRun=null;lastSoloResult=null}
  updateBadge(session.mode==='party'?`Round ${session.party.round+1}/${session.party.totalRounds}`:'First to 5');
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="backButton">←</button><div class="game-heading"><span class="game-symbol small">${game.emoji}</span><div><div class="eyebrow">${session.mode==='party'?'PARTY ROUND':'SINGLE GAME'}</div><div class="screen-title">${game.title}</div></div></div></div><div class="scorebar" data-scorebar></div><section class="stage" id="gameStage"></section>`;
  app.querySelector('#backButton').onclick=renderHome;renderScorebar();
  const ctx={root:app.querySelector('#gameStage'),session,esc,toast,renderScorebar,completeRound:restart=>completeRound(restart)};
  activeCleanup=game.mount(ctx)||null;
}

function completeRound(restart){
  renderScorebar();
  if(session.mode==='single'){
    if(soloRun&&soloRun.gameId===lastSingleGameId){
      soloRun.rounds++;
      const gain=(session.scores[0]||0)-soloRun.lastScore;
      soloRun.currentStreak=gain>0?soloRun.currentStreak+1:0;
      soloRun.maxStreak=Math.max(soloRun.maxStreak,soloRun.currentStreak);
      soloRun.lastScore=session.scores[0]||0;
    }
    if(Math.max(...session.scores)>=5){
      const winners=session.winnerIndexes(false);
      stats.record({gameId:lastSingleGameId,mode:'single',players:[...session.players],scores:[...session.scores],winners});
      if(soloRun){
        soloProgress.recordRun(lastSingleGameId,{rounds:soloRun.rounds,maxStreak:soloRun.maxStreak,completed:true});
        lastSoloResult={gameId:lastSingleGameId,rounds:soloRun.rounds,maxStreak:soloRun.maxStreak,game:soloProgress.game(lastSingleGameId),daily:soloProgress.daily()};
      }
      disposeActiveGame();return renderWinner(false,lastSingleGameId);
    }
    return restart();
  }
  const completedGameId=session.currentPartyGame(),result=session.finishPartyRound();
  stats.record({gameId:completedGameId,mode:'party',players:[...session.players],scores:[...result.awards],winners:winnerIndexesFromScores(result.awards)});
  disposeActiveGame();
  if(result.finished)return renderWinner(true,completedGameId);
  renderPartyIntermission(false,result,false,completedGameId);
}

function renderPartyIntermission(first=false,result=null,resuming=false,completedGameId=null){
  const nextId=session.currentPartyGame(),game=getGame(nextId),progress=session.party.round/session.party.totalRounds*100;
  updateBadge(`Round ${session.party.round+1}/${session.party.totalRounds}`);
  const awardHtml=result?`<section class="card result-card"><div class="eyebrow">ROUND RESULT</div><div class="result-list">${session.players.map((name,i)=>`<div class="result-row"><span>${esc(name)}</span><span>+${result.awards[i]} Party pt</span></div>`).join('')}</div></section>`:'';
  const resumeNote=resuming?'<div class="notice">保存地点から再開しました。途中だったラウンドは最初から始まります。</div>':'';
  app.innerHTML=`<section class="panel party-board"><div class="eyebrow">PARTY</div><div class="prompt compact">${first?'構成完了':resuming?'ゲームを再開':'次のラウンド'}</div><div class="party-progress"><span style="width:${progress}%"></span></div>${resumeNote}${awardHtml}${completedGameId?playtestPromptHtml(completedGameId):''}<div class="standings"><div class="setup-label">Standings</div><div class="result-list">${rankingHtml(session.partyScores,'Party pt')}</div></div><div class="next-game"><div class="game-card-top"><span class="game-index">${String(session.party.round+1).padStart(2,'0')} / ${String(session.party.totalRounds).padStart(2,'0')}</span><span class="game-symbol">${game.emoji}</span></div><h3>${game.title}</h3><p>${game.description}</p></div><button class="btn primary full" id="partyNext">${first?'開始する':resuming?'このラウンドを始める':'次へ'}</button></section>`;
  if(completedGameId)bindPlaytest(completedGameId);app.querySelector('#partyNext').onclick=()=>startGame(nextId);
}

function renderWinner(isParty,ratingGameId=null){
  disposeActiveGame();const winners=session.winnerIndexes(isParty),scores=isParty?session.partyScores:session.scores;
  updateBadge('RESULT');
  const soloResultHtml=!isParty&&lastSoloResult&&lastSoloResult.gameId===ratingGameId?`<section class="solo-result-card"><div class="eyebrow">SOLO RESULT</div><div class="solo-result-grid"><div><b>${lastSoloResult.rounds}</b><span>クリアラウンド</span></div><div><b>${lastSoloResult.game.bestRounds??'—'}</b><span>自己ベスト</span></div><div><b>${lastSoloResult.maxStreak}</b><span>連続成功</span></div></div>${lastSoloResult.daily.gameId===ratingGameId&&lastSoloResult.daily.cleared?`<div class="solo-daily-clear">DAILY CLEAR · ${lastSoloResult.daily.streak}日連続</div>`:''}</section>`:'';
  app.innerHTML=`<section class="panel winner"><div class="winner-mark">RESULT</div><div class="eyebrow">${isParty?'PARTY COMPLETE':'GAME COMPLETE'}</div><h2>${winners.map(i=>esc(session.players[i])).join(' & ')}</h2><p class="muted">${winners.length>1?'同点首位':'1位'}</p><div class="result-list">${rankingHtml(scores,isParty?'Party pt':'pt')}</div>${soloResultHtml}${ratingGameId?playtestPromptHtml(ratingGameId):''}<div class="actions"><button class="btn quiet" id="homeResult">ホーム</button><button class="btn primary" id="againResult">もう一度</button></div></section>`;
  if(ratingGameId)bindPlaytest(ratingGameId);
  app.querySelector('#homeResult').onclick=renderHome;
  app.querySelector('#againResult').onclick=()=>{
    if(isParty){const games=listGames(),settings=partySettings.load(games.map(g=>g.id));session.startParty(settings.gameIds,settings.rounds);return renderPartyIntermission(true)}
    if(lastSingleGameId){session.startSingle();return startGame(lastSingleGameId)}renderHome();
  };
}

function refreshHomeIfVisible(){if(app.querySelector('.hero'))renderHome()}
watchInstallPrompt(ready=>{pwaInstallReady=ready;refreshHomeIfVisible()});
watchConnectivity(()=>refreshHomeIfVisible());
registerPWA(registration=>{pwaUpdateRegistration=registration;refreshHomeIfVisible()});
navigator.serviceWorker?.addEventListener?.('controllerchange',()=>location.reload());

renderHome();