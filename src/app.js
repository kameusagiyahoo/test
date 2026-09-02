import {rankScores} from './core/session.js';
import {getGame,listGames} from './core/registry.js';
import {CATEGORY_DEFS,categoriesFor,categoryLabel,difficultyLabel,filterGames,gameMeta,pickGame,playerRangeLabel,recommendedGames} from './core/catalog.js';
import {gameGuide} from './core/game-guide.js';
import {winnerIndexesFromScores} from './core/stats.js';
import {buildHealthReport} from './core/health.js';
import {SOLO_GAME_IDS,SOLO_DIFFICULTIES,normalizeSoloDifficulty,soloDifficultyLabel} from './core/solo.js';
import {canPromptInstall,isIOS,isOnline,isStandalone,registerPWA,requestInstall,watchConnectivity,watchInstallPrompt} from './core/pwa.js';
import {samePlayers} from './core/groups.js';
import {buildPlayerProfiles} from './core/player-profile.js';
import {achievementSummary} from './core/achievements.js';
import {partyShareModel,profileShareModel,renderPartyShareSvg,renderProfileShareSvg,shareCardFilename,shareSvgCard} from './core/share-card.js';
import {buildSeasonView,currentSeasonKey} from './core/season.js';
import {gameInsightHeadline,trendLabel} from './core/game-insights.js';
import {buildExperimentLearnings} from './core/experiment-learnings.js';
import {buildSmartParty,buildSmartPartyWithLocks,recentGameIdsForPlayers,replaceSmartPartyGame,smartPartyReasons,summarizeSmartParty} from './core/recommender.js';
import {escapeHtml as esc,oneDecimal,scoreButtons} from './ui/presentation.js';
import {createAppState} from './app/state.js';
import {createExperimentWorkflow} from './app/experiment-workflow.js';
import {createDataVaultScreen} from './screens/data-vault.js';
import {createPlayerGroupsScreen} from './screens/player-groups.js';
import {createPartyHistoryScreens} from './screens/party-history.js';
import {createSavedPartiesScreen} from './screens/saved-parties.js';
import {createPlaytestLabScreen} from './screens/analytics/playtest-lab.js';
import {createPlayerAnalyticsScreens} from './screens/analytics/player-analytics.js';
import {createImprovementScreens} from './screens/analytics/improvement.js';
import {createGameInsightsScreen,healthStatusLabel} from './screens/analytics/game-insights.js';
const {
  session,
  ratings,
  partySettings,
  library,
  playtests,
  playtestEvents,
  stats,
  soloProgress,
  playerGroups,
  savedParties,
  partyHistory,
  improvementQueue
}=createAppState();
const app=document.querySelector('#app');
const badge=document.querySelector('#sessionBadge');
const homeButton=document.querySelector('#homeButton');
const toastEl=document.querySelector('#toast');
let draftPlayers=[...session.players];
let activeCleanup=null;
let lastSingleGameId=null;
let soloRun=null;
let lastSoloResult=null;
let lastPartyRecap=null;
let pwaInstallReady=false;
let pwaUpdateRegistration=null;
const APP_VERSION='8.32.4';

const renderDataVault=createDataVaultScreen({
  app,
  appVersion:APP_VERSION,
  disposeActiveGame,
  updateBadge,
  toast,
  renderHome
});
const renderPlayerGroups=createPlayerGroupsScreen({
  app,
  session,
  playerGroups,
  disposeActiveGame,
  updateBadge,
  toast,
  renderHome
});
const {
  partyRecapHtml,
  renderPartyHistory,
  renderPartyHistoryDetail
}=createPartyHistoryScreens({
  app,
  partyHistory,
  savedParties,
  disposeActiveGame,
  updateBadge,
  toast,
  renderHome,
  sharePartyCard,
  startTrackedSchedule,
  renderPartyIntermission
});
const renderSavedParties=createSavedPartiesScreen({
  app,
  savedParties,
  disposeActiveGame,
  updateBadge,
  renderHome,
  startTrackedSchedule,
  renderPartyIntermission
});

const renderPlaytestLab=createPlaytestLabScreen({
  app,
  playtests,
  playtestEvents,
  disposeActiveGame,
  updateBadge,
  renderHome,
  openGameDetail:id=>{saveDraft({quiet:true});renderGameDetail(id)}
});

const {
  renderSeasonBoard,
  renderStatsDashboard,
  renderPlayerProfile,
  renderAchievements
}=createPlayerAnalyticsScreens({
  app,
  stats,
  partyHistory,
  disposeActiveGame,
  updateBadge,
  renderHome,
  renderGameDetail,
  shareProfileCard,
  renderPartyHistoryDetail
});

const experimentWorkflow=createExperimentWorkflow({
  improvementQueue,
  playtestEvents,
  toast
});

const {
  gameInsightData,
  renderGameInsights
}=createGameInsightsScreen({
  app,
  playtests,
  playtestEvents,
  stats,
  soloProgress,
  improvementQueue,
  experimentWorkflow,
  disposeActiveGame,
  updateBadge,
  toast,
  renderHome,
  renderGameDetail,
  renderPlayerProfile,
  soloDifficultyDetail
});

const {
  renderGameHealth,
  renderExperimentLearnings,
  renderImprovementQueue
}=createImprovementScreens({
  app,
  playtests,
  stats,
  improvementQueue,
  disposeActiveGame,
  updateBadge,
  renderHome,
  renderGameInsights,
  experimentWorkflow
});

function toast(text){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),1500)}
function updateBadge(text){badge.textContent=text||`${session.players.length}人`}
function pwaStatusLabel(){return isStandalone()?'APP':isOnline()?'ONLINE':'OFFLINE'}
function smartPartyInputs(players=session.players,allowedGameIds=null){
  const games=listGames(),ids=games.map(g=>g.id),pRows=playtests.report(ids),sReport=stats.report(ids);
  const health=buildHealthReport(ids,pRows,sReport.gameStats);
  return{
    games,
    options:{
      playerCount:players.length,
      favoriteIds:library.favorites(ids),
      recentIds:recentGameIdsForPlayers(stats.history(),players,8),
      playtestRows:pRows,
      healthRows:health.games,
      allowedGameIds
    }
  };
}
function smartPartyPlan(rounds,{players=session.players,allowedGameIds=null}={}){
  const {games,options}=smartPartyInputs(players,allowedGameIds);
  return buildSmartParty(games,{...options,rounds});
}
function startSmartParty(rounds,{players=session.players,allowedGameIds=null}={}){
  if(players.length<2)return toast('Smart Partyは2人以上で遊べます');
  if(!samePlayers(players,session.players))session.savePlayers(players);
  renderSmartPartyPreview(rounds,{players:[...players],allowedGameIds});
}
function startTrackedParty(gameIds,totalRounds){
  session.startParty(gameIds,totalRounds);
  partyHistory.begin({players:[...session.players],schedule:[...session.party.schedule]});
  lastPartyRecap=null;
}
function startTrackedSchedule(schedule){
  session.startPartySchedule(schedule);
  partyHistory.begin({players:[...session.players],schedule:[...session.party.schedule]});
  lastPartyRecap=null;
}
function disposeActiveGame(){try{activeCleanup?.()}finally{activeCleanup=null}}
function gameNameMap(){
  return Object.fromEntries(listGames().map(game=>[game.id,game.title]));
}
async function sharePartyCard(entry){
  if(!entry)return toast('共有できるParty結果がありません');
  try{
    const model=partyShareModel(entry,{gameNames:gameNameMap()});
    const svg=renderPartyShareSvg(model);
    const label=entry.winners?.length?entry.winners.map(i=>entry.players[i]).filter(Boolean).join('-'):'party';
    const result=await shareSvgCard(svg,{filename:shareCardFilename('party',label),title:'Party Pocket · Party Result'});
    if(result==='downloaded')toast('結果画像を保存しました');
  }catch(error){toast(error?.message||'画像を共有できませんでした')}
}
async function shareProfileCard(profile,achievements=[]){
  if(!profile)return toast('共有できるプロフィールがありません');
  try{
    const model=profileShareModel(profile,{gameNames:gameNameMap(),achievements});
    const svg=renderProfileShareSvg(model);
    const result=await shareSvgCard(svg,{filename:shareCardFilename('profile',profile.name),title:'Party Pocket · Player Profile'});
    if(result==='downloaded')toast('プロフィール画像を保存しました');
  }catch(error){toast(error?.message||'画像を共有できませんでした')}
}
function rankingHtml(scores,unit){return rankScores(scores).map(row=>`<div class="result-row"><span>${row.rank}. ${esc(session.players[row.index])}</span><span>${row.score} ${unit}</span></div>`).join('')}
function ratingSummary(gameId){
  const p=playtests.get(gameId);
  if(p.responses)return `評価 ${p.responses}回 · 面白さ ${oneDecimal(p.fun.average)}`;
  const r=ratings.get(gameId);return r.total?`旧評価 ${r.total}回`:'';
}
function playtestPromptHtml(gameId){
  const game=getGame(gameId);if(!game)return'';const p=playtests.get(gameId);
  return `<section class="feedback playtest-card" data-playtest-game="${gameId}"><div><div class="eyebrow">PLAYTEST NOTE</div><strong>${esc(game.title)}を4軸で評価</strong><div class="feedback-history">${p.responses?`新評価 ${p.responses}回 · 面白さ ${oneDecimal(p.fun.average)} · 分かりやすさ ${oneDecimal(p.clarity.average)}`:p.legacyResponses?`旧「また遊びたい」評価 ${p.legacyResponses}件を引き継ぎ済み`:'この端末だけに記録します'}</div></div><div class="playtest-fields"><div class="playtest-row"><span>面白さ</span><div class="score-choices">${scoreButtons('fun')}</div></div><div class="playtest-row"><span>分かりやすさ</span><div class="score-choices">${scoreButtons('clarity')}</div></div><div class="playtest-row"><span>頭を使う度</span><div class="score-choices">${scoreButtons('brain')}</div></div><div class="playtest-row"><span>もう一度遊びたい</span><div class="score-choices">${scoreButtons('replay')}</div></div></div><button class="btn primary full playtest-save" disabled>4項目を記録</button></section>`;
}
function bindPlaytest(gameId,{mode=session.mode==='party'?'party':'single',playerCount=session.players.length,difficulty=null}={}){
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
    playtestEvents.record(gameId,scores,{mode,playerCount,difficulty});
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

function soloDifficultyDetail(gameId,difficulty){
  const level=normalizeSoloDifficulty(difficulty);
  const details={
    memory:{easy:'5桁 · 約3.2秒',normal:'6〜7桁 · 約2.5秒',hard:'8〜9桁 · 約1.8秒'},
    route:{easy:'3マス · 数字1〜6',normal:'4マス · 数字1〜8',hard:'5マス · 数字1〜9'},
    pattern:{easy:'加算・減算',normal:'交互・差分',hard:'等比・複合規則'}
  };
  return details[gameId]?.[level]||soloDifficultyLabel(level);
}

function renderGameDetail(id,difficulty='normal'){
  disposeActiveGame();
  const game=getGame(id);if(!game)return renderHome();
  const soloEligible=session.players.length===1&&SOLO_GAME_IDS.includes(id),soloDifficulty=soloEligible?normalizeSoloDifficulty(difficulty):'normal';
  const meta=gameMeta(id),guide=gameGuide(id),favorite=library.isFavorite(id),insight=gameInsightData(id);
  updateBadge('GAME GUIDE');
  const soloDifficultyHtml=soloEligible?`<section class="solo-difficulty-picker"><div><div class="eyebrow">SOLO DIFFICULTY</div><h3>${soloDifficultyLabel(soloDifficulty)}</h3><p>${soloDifficultyDetail(id,soloDifficulty)}</p></div><div class="solo-difficulty-buttons">${SOLO_DIFFICULTIES.map(level=>`<button class="solo-difficulty-button ${level===soloDifficulty?'active':''}" data-solo-difficulty="${level}"><b>${soloDifficultyLabel(level)}</b><small>${soloDifficultyDetail(id,level)}</small></button>`).join('')}</div></section>`:'';
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="detailBack">←</button><div class="game-heading"><span class="game-symbol small">${game.emoji}</span><div><div class="eyebrow">GAME GUIDE</div><div class="screen-title">${game.title}</div></div></div></div>
  <section class="panel game-detail"><div class="detail-facts"><span>${difficultyLabel(meta.difficulty)}</span><span>約${meta.minutes}分</span><span>${playerRangeLabel(meta)}推奨</span></div>${soloDifficultyHtml}<button class="game-insight-preview ${insight.health.status}" id="detailInsights"><span><span class="eyebrow">GAME INSIGHTS</span><b>${insight.plays} plays · ${healthStatusLabel(insight.health.status)}</b><small>${gameInsightHeadline(insight)} · 30日差 ${trendLabel(insight)}</small></span><span class="recommend-arrow">→</span></button><div class="detail-section"><div class="eyebrow">OBJECTIVE</div><h3>${esc(guide.objective)}</h3></div><div class="detail-section"><div class="eyebrow">HOW TO PLAY</div><ol class="rule-steps">${guide.rules.map(rule=>`<li>${esc(rule)}</li>`).join('')}</ol></div><div class="detail-grid"><div class="detail-note"><div class="eyebrow">WIN / SCORE</div><p>${esc(guide.scoring)}</p></div><div class="detail-note"><div class="eyebrow">EXAMPLE</div><p>${esc(guide.example)}</p></div></div><div class="detail-actions"><button class="btn quiet favorite-button ${favorite?'active':''}" id="favoriteToggle">${favorite?'★ お気に入り済み':'☆ お気に入り'}</button><button class="btn primary" id="detailStart">${soloEligible?`${soloDifficultyLabel(soloDifficulty)}で始める`:'このゲームを始める'}</button></div></section>`;
  app.querySelector('#detailBack').onclick=renderHome;
  app.querySelector('#favoriteToggle').onclick=()=>{library.toggleFavorite(id);renderGameDetail(id)};
  app.querySelector('#detailInsights').onclick=()=>renderGameInsights(id);
  app.querySelectorAll('[data-solo-difficulty]').forEach(button=>button.onclick=()=>renderGameDetail(id,button.dataset.soloDifficulty));
  app.querySelector('#detailStart').onclick=()=>{session.startSingle();startGame(id,{difficulty:soloDifficulty})};
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
  const partyPresets=savedParties.recent(validIds);
  const recentParties=partyHistory.history(validIds).slice(0,3);
  const statEntries=stats.history().filter(e=>validIds.includes(e.gameId)),partyEntries=partyHistory.history(validIds);
  const profileRows=buildPlayerProfiles(statEntries,partyEntries);
  const achievementData=achievementSummary(profileRows);
  const currentSeason=buildSeasonView(currentSeasonKey(),statEntries,partyEntries);
  const improvementRows=improvementQueue.all(validIds),improvementSummary=improvementQueue.summary(validIds),learningSummary=buildExperimentLearnings(improvementRows);
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
  ${partyPresets.length?`<div class="section-head"><h2>Saved Parties</h2><button class="section-action" id="manageSavedParties">管理</button></div><section class="saved-party-list">${partyPresets.map(preset=>{const games=preset.schedule.map(id=>byId.get(id)).filter(Boolean),info=summarizeSmartParty(games);return`<article class="saved-party-card"><div><div class="eyebrow">FIXED ORDER</div><h3>${esc(preset.name)}</h3><p>${games.map(g=>g.emoji+' '+g.title).join(' → ')}</p><small>${preset.schedule.length}R · 約${info.totalMinutes}分</small></div><button class="btn primary" data-start-saved-party="${preset.id}">同じ順番で開始</button></article>`}).join('')}</section>`:''}
  ${recentParties.length?`<div class="section-head"><h2>Recent Parties</h2><button class="section-action" id="partyHistory">履歴を見る</button></div><section class="party-history-home">${recentParties.map(entry=>{const winners=entry.winners.map(i=>entry.players[i]).filter(Boolean),games=entry.schedule.map(id=>byId.get(id)).filter(Boolean);return`<button class="party-history-home-row" data-party-history="${entry.id}"><span><b>${winners.length?winners.map(esc).join(' & ')+' 勝利':'Party結果'}</b><small>${entry.players.map(esc).join(' · ')} · ${entry.schedule.length}R</small><small>${games.slice(0,4).map(g=>g.emoji).join(' ')}${games.length>4?' …':''}</small></span><span class="recommend-arrow">→</span></button>`}).join('')}</section>`:''}
  ${!isStandalone()?`<section class="install-card"><div><div class="eyebrow">INSTALL</div><h3>ホーム画面から起動する</h3><p>${isIOS()?'Safariの共有ボタン →「ホーム画面に追加」で、アプリのように独立起動できます。':'対応ブラウザではParty Pocketを端末へインストールできます。'}</p></div><button class="btn quiet" id="installApp">${pwaInstallReady&&canPromptInstall()?'インストール':'追加方法'}</button></section>`:''}
  ${!isOnline()?'<div class="offline-banner">OFFLINE · キャッシュ済みゲームはそのまま遊べます</div>':''}
  ${pwaUpdateRegistration?'<section class="update-card"><div><div class="eyebrow">UPDATE READY</div><b>新しいParty Pocketがあります</b></div><button class="btn primary" id="applyUpdate">更新する</button></section>':''}
  ${session.players.length===1&&dailyGame?`<section class="solo-daily ${daily.cleared?'cleared':''}"><div><div class="eyebrow">DAILY SOLO · ${soloDifficultyLabel(daily.difficulty).toUpperCase()}</div><h3>${dailyGame.emoji} ${dailyGame.title}</h3><p>${soloDifficultyLabel(daily.difficulty)} · ${soloDifficultyDetail(daily.gameId,daily.difficulty)}。 ${daily.maxRounds}ラウンド以内に5点到達でクリア。</p><div class="solo-daily-meta"><span>${daily.cleared?'今日クリア済み':'今日の挑戦'}</span><span>連続 ${daily.streak}日</span><span>Solo完走 ${soloSummary.totalClears}回</span></div></div><button class="btn primary" id="dailySolo">${daily.cleared?'もう一度':'挑戦する'}</button></section><div class="section-head"><h2>Solo Progress</h2><span class="muted">難易度別ベスト</span></div><section class="solo-progress-list">${SOLO_GAME_IDS.map(id=>{const g=byId.get(id),p=soloProgress.game(id),e=p?.difficulties?.easy,n=p?.difficulties?.normal,h=p?.difficulties?.hard;return`<button class="solo-progress-row" data-game="${id}"><span class="recommend-symbol">${g?.emoji||''}</span><span><b>${esc(g?.title||id)}</b><small>E ${e?.bestRounds??'—'}R · N ${n?.bestRounds??'—'}R · H ${h?.bestRounds??'—'}R · 完走 ${p?.clears||0}回</small></span><span class="recommend-arrow">→</span></button>`}).join('')}</section>`:''}
  <section class="playtest-entry"><div><div class="eyebrow">PLAYTEST LAB</div><h3>24ゲームの弱点を見る</h3><p>面白さ・分かりやすさ・頭を使う度・再プレイ意向を端末内で集計します。</p></div><button class="btn quiet" id="playtestLab">評価を見る</button></section>
  <section class="playtest-entry stats-entry"><div><div class="eyebrow">LOCAL STATS</div><h3>プレイ履歴と勝率を見る</h3><p>Singleの完走とParty各ラウンドを記録し、プレイヤー別・ゲーム別に集計します。</p></div><button class="btn quiet" id="statsDashboard">成績を見る</button></section>
  <section class="playtest-entry season-entry"><div><div class="eyebrow">SEASON BOARD · ${esc(currentSeason.label)}</div><h3>${currentSeason.rows.length?`${esc(currentSeason.rows[0].name)}が${currentSeason.rows[0].wins}勝で首位`:'今月のランキングを始める'}</h3><p>${currentSeason.totalPlays}試合 · ${currentSeason.partySessions} Party · ${currentSeason.players} players。前月との差も自動比較します。</p></div><button class="btn quiet" id="seasonBoard">月間順位</button></section>
  <section class="playtest-entry achievement-entry"><div><div class="eyebrow">ACHIEVEMENTS</div><h3>${achievementData.unlocked} badges unlocked</h3><p>${achievementData.players?`${achievementData.players}人の実績を履歴から自動判定。${achievementData.leader?` 現在トップは${esc(achievementData.leader.name)}の${achievementData.leader.unlocked}個。`:''}`:'プレイすると実績と次のMilestoneが自動で増えていきます。'}</p></div><button class="btn quiet" id="achievements">実績を見る</button></section>
  <section class="playtest-entry health-entry"><div><div class="eyebrow">GAME HEALTH</div><h3>改善すべきゲームを自動検出</h3><p>プレイ回数・勝率・4軸評価を統合し、問題の種類と次の改善アクションを出します。</p></div><button class="btn quiet" id="gameHealth">分析を見る</button></section>
  <section class="playtest-entry improvement-entry"><div><div class="eyebrow">IMPROVEMENT QUEUE</div><h3>${improvementSummary.testing} testing · ${improvementSummary.planned} planned</h3><p>HealthやContext Signalから改善実験を作り、PLANNED → TESTING → DONEまで追跡します。</p></div><button class="btn quiet" id="improvementQueue">実験を見る</button></section>
  <section class="playtest-entry learning-entry"><div><div class="eyebrow">EXPERIMENT LEARNINGS</div><h3>${learningSummary.completed?`${learningSummary.improved}/${learningSummary.completed} improved`:'完了実験から学びを蓄積'}</h3><p>${learningSummary.completed?`改善率 ${Math.round((learningSummary.successRate||0)*100)}% · 平均Quality差 ${Number.isFinite(learningSummary.averageQualityDelta)?(learningSummary.averageQualityDelta>0?'+':'')+learningSummary.averageQualityDelta.toFixed(1):'—'}`:'Before/After評価が完了すると、効いた改善と失敗した改善を横断比較できます。'}</p></div><button class="btn quiet" id="experimentLearnings">学びを見る</button></section>
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
      const daily=soloProgress.daily();session.startSingle();return startGame(daily.gameId,{difficulty:daily.difficulty});
    }
    return startSmartParty(3,{players:group.players});
  });
  app.querySelector('#partyMode').onclick=()=>{if(session.players.length<2)return toast('Partyは2人以上で遊べます');saveDraft({quiet:true});renderPartySetup()};
  app.querySelectorAll('[data-smart-rounds]').forEach(button=>button.onclick=()=>{saveDraft({quiet:true});startSmartParty(+button.dataset.smartRounds)});
  app.querySelector('#manageSavedParties')?.addEventListener('click',renderSavedParties);
  app.querySelector('#partyHistory')?.addEventListener('click',renderPartyHistory);
  app.querySelectorAll('[data-party-history]').forEach(button=>button.onclick=()=>renderPartyHistoryDetail(button.dataset.partyHistory));
  app.querySelectorAll('[data-start-saved-party]').forEach(button=>button.onclick=()=>{const preset=savedParties.get(button.dataset.startSavedParty,validIds);if(!preset)return;savedParties.touch(preset.id);startTrackedSchedule(preset.schedule);renderPartyIntermission(true)});
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
  app.querySelector('#dailySolo')?.addEventListener('click',()=>renderGameDetail(daily.gameId,daily.difficulty));
  if(app.querySelector('.solo-progress-list'))bindGameLaunch(app.querySelector('.solo-progress-list'));
  app.querySelector('#playtestLab').onclick=renderPlaytestLab;
  app.querySelector('#statsDashboard').onclick=renderStatsDashboard;
  app.querySelector('#seasonBoard').onclick=()=>renderSeasonBoard(currentSeasonKey());
  app.querySelector('#achievements').onclick=renderAchievements;
  app.querySelector('#gameHealth').onclick=renderGameHealth;
  app.querySelector('#improvementQueue').onclick=renderImprovementQueue;
  app.querySelector('#experimentLearnings').onclick=renderExperimentLearnings;
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
    renderSmartPartyPreview(rounds,{allowedGameIds:allowed});
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
  app.querySelector('#discardParty')?.addEventListener('click',()=>{session.clearSavedParty();partyHistory.abandon();renderHome()});
}

function renderSmartPartyPreview(rounds,{players=session.players,allowedGameIds=null}={}){
  disposeActiveGame();
  if(players.length<2)return renderHome();
  if(!samePlayers(players,session.players))session.savePlayers(players);

  const {games,options}=smartPartyInputs(players,allowedGameIds);
  const byId=new Map(games.map(g=>[g.id,g]));
  const initial=buildSmartParty(games,{...options,rounds});
  if(initial.length<2){toast('Smart Partyを組めませんでした');return renderHome()}

  const state={plan:initial,locked:new Set()};

  function paint(){
    const info=summarizeSmartParty(state.plan);
    updateBadge('SMART PARTY');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="smartBack">←</button><div><div class="eyebrow">SMART PARTY PREVIEW</div><div class="screen-title">${state.plan.length}ラウンドを確認</div></div></div>
    <section class="smart-preview-summary"><div><b>${state.plan.length}</b><span>rounds</span></div><div><b>約${info.totalMinutes}</b><span>minutes</span></div><div><b>${info.categories.length}</b><span>categories</span></div></section>
    <div class="lab-note">Lockしたゲームは「全部組み直す」でも残ります。↑↓で実際のプレイ順を変更できます。</div>
    <section class="smart-preview-list">${state.plan.map((game,index)=>{
      const meta=gameMeta(game.id);
      const rawReasons=smartPartyReasons(game,options).filter(reason=>reason!=='最近プレイ済み');
      const reasons=rawReasons.length?rawReasons:['全体バランス'];
      return`<article class="smart-preview-row ${state.locked.has(game.id)?'locked':''}">
        <div class="smart-order">${String(index+1).padStart(2,'0')}</div>
        <div class="smart-preview-main"><div class="smart-preview-title"><span>${game.emoji}</span><b>${esc(game.title)}</b></div><small>${difficultyLabel(meta.difficulty)} · 約${meta.minutes}分 · ${playerRangeLabel(meta)}推奨</small><div class="smart-reasons">${reasons.slice(0,3).map(reason=>`<span>${esc(reason)}</span>`).join('')}</div></div>
        <div class="smart-preview-actions"><button class="mini-btn" data-move-up="${game.id}" ${index===0?'disabled':''}>↑</button><button class="mini-btn" data-move-down="${game.id}" ${index===state.plan.length-1?'disabled':''}>↓</button><button class="mini-btn ${state.locked.has(game.id)?'active':''}" data-lock-game="${game.id}">${state.locked.has(game.id)?'LOCKED':'LOCK'}</button><button class="mini-btn" data-reroll-game="${game.id}" ${state.locked.has(game.id)?'disabled':''}>入替</button></div>
      </article>`;
    }).join('')}</section>
    <section class="smart-preview-footer"><div class="smart-preview-categories">${info.categories.map(id=>`<span>${esc(categoryLabel(id))}</span>`).join('')}</div><div class="smart-preview-buttons"><button class="btn quiet" id="rebuildSmart" ${state.locked.size===state.plan.length?'disabled':''}>全部組み直す</button><button class="btn primary" id="confirmSmart">この順番で開始</button></div></section>`;

    app.querySelector('#smartBack').onclick=renderHome;
    app.querySelectorAll('[data-lock-game]').forEach(button=>button.onclick=()=>{
      const id=button.dataset.lockGame;
      state.locked.has(id)?state.locked.delete(id):state.locked.add(id);
      paint();
    });
    app.querySelectorAll('[data-move-up]').forEach(button=>button.onclick=()=>{
      const index=state.plan.findIndex(g=>g.id===button.dataset.moveUp);
      if(index<=0)return;
      [state.plan[index-1],state.plan[index]]=[state.plan[index],state.plan[index-1]];
      paint();
    });
    app.querySelectorAll('[data-move-down]').forEach(button=>button.onclick=()=>{
      const index=state.plan.findIndex(g=>g.id===button.dataset.moveDown);
      if(index<0||index>=state.plan.length-1)return;
      [state.plan[index+1],state.plan[index]]=[state.plan[index],state.plan[index+1]];
      paint();
    });
    app.querySelectorAll('[data-reroll-game]').forEach(button=>button.onclick=()=>{
      const id=button.dataset.rerollGame;
      if(state.locked.has(id))return;
      const replacement=replaceSmartPartyGame(games,state.plan.map(g=>g.id),id,options);
      if(!replacement)return toast('これ以上候補がありません');
      const index=state.plan.findIndex(g=>g.id===id);
      state.plan[index]=replacement;
      paint();
    });
    app.querySelector('#rebuildSmart').onclick=()=>{
      const lockedIds=state.plan.filter(g=>state.locked.has(g.id)).map(g=>g.id);
      const rebuilt=buildSmartPartyWithLocks(games,{...options,rounds:state.plan.length,lockedIds});
      const unlocked=rebuilt.filter(g=>!state.locked.has(g.id));
      let cursor=0;
      state.plan=state.plan.map(game=>state.locked.has(game.id)?game:unlocked[cursor++]).filter(Boolean);
      paint();
    };
    app.querySelector('#confirmSmart').onclick=()=>{
      startTrackedSchedule(state.plan.map(g=>g.id));
      renderPartyIntermission(true);
    };
  }

  paint();
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
      startTrackedParty(selected,state.rounds);renderPartyIntermission(true);
    };
  }
  paint();
}

function renderScorebar(current=-1){
  document.querySelectorAll('[data-scorebar]').forEach(bar=>bar.innerHTML=session.players.map((name,i)=>`<div class="score ${i===current?'current':''}"><span>${esc(name)}</span><b>${session.scores[i]||0}</b></div>`).join(''));
}

function startGame(id,{difficulty='normal'}={}){
  disposeActiveGame();const game=getGame(id);if(!game)return renderHome();library.touchRecent(id);if(session.mode==='single')lastSingleGameId=id;
  const soloDifficulty=normalizeSoloDifficulty(difficulty);
  if(session.mode==='single'&&session.players.length===1&&SOLO_GAME_IDS.includes(id)){soloRun={gameId:id,difficulty:soloDifficulty,rounds:0,currentStreak:0,maxStreak:0,lastScore:0};lastSoloResult=null}else if(session.mode==='single'){soloRun=null;lastSoloResult=null}
  updateBadge(session.mode==='party'?`Round ${session.party.round+1}/${session.party.totalRounds}`:soloRun?`Solo · ${soloDifficultyLabel(soloDifficulty)}`:'First to 5');
  app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="backButton">←</button><div class="game-heading"><span class="game-symbol small">${game.emoji}</span><div><div class="eyebrow">${session.mode==='party'?'PARTY ROUND':soloRun?`SINGLE GAME · ${soloDifficultyLabel(soloRun.difficulty).toUpperCase()}`:'SINGLE GAME'}</div><div class="screen-title">${game.title}</div></div></div></div><div class="scorebar" data-scorebar></div><section class="stage" id="gameStage"></section>`;
  app.querySelector('#backButton').onclick=renderHome;renderScorebar();
  const ctx={root:app.querySelector('#gameStage'),session,esc,toast,renderScorebar,soloDifficulty:soloRun?.difficulty||'normal',completeRound:restart=>completeRound(restart)};
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
      stats.record({gameId:lastSingleGameId,mode:'single',players:[...session.players],scores:[...session.scores],winners,difficulty:soloRun?.difficulty||null,clearRounds:soloRun?.rounds||null});
      if(soloRun){
        soloProgress.recordRun(lastSingleGameId,{difficulty:soloRun.difficulty,rounds:soloRun.rounds,maxStreak:soloRun.maxStreak,completed:true});
        lastSoloResult={gameId:lastSingleGameId,difficulty:soloRun.difficulty,rounds:soloRun.rounds,maxStreak:soloRun.maxStreak,game:soloProgress.game(lastSingleGameId,soloRun.difficulty),daily:soloProgress.daily()};
      }
      disposeActiveGame();return renderWinner(false,lastSingleGameId);
    }
    return restart();
  }
  const completedGameId=session.currentPartyGame(),result=session.finishPartyRound();
  const roundWinners=winnerIndexesFromScores(result.awards);
  stats.record({gameId:completedGameId,mode:'party',players:[...session.players],scores:[...result.awards],winners:roundWinners});
  partyHistory.recordRound({
    players:[...session.players],
    schedule:[...session.party.schedule],
    gameId:completedGameId,
    gameScores:[...result.gameScores],
    awards:[...result.awards],
    cumulativeScores:[...session.partyScores],
    winners:roundWinners
  });
  disposeActiveGame();
  if(result.finished){
    lastPartyRecap=partyHistory.complete({finalScores:[...session.partyScores],winners:session.winnerIndexes(true)});
    return renderWinner(true,completedGameId);
  }
  renderPartyIntermission(false,result,false,completedGameId);
}

function renderPartyIntermission(first=false,result=null,resuming=false,completedGameId=null){
  const nextId=session.currentPartyGame(),game=getGame(nextId),progress=session.party.round/session.party.totalRounds*100;
  updateBadge(`Round ${session.party.round+1}/${session.party.totalRounds}`);
  const awardHtml=result?`<section class="card result-card"><div class="eyebrow">ROUND RESULT</div><div class="result-list">${session.players.map((name,i)=>`<div class="result-row"><span>${esc(name)}</span><span>+${result.awards[i]} Party pt</span></div>`).join('')}</div></section>`:'';
  const resumeNote=resuming?'<div class="notice">保存地点から再開しました。途中だったラウンドは最初から始まります。</div>':'';
  app.innerHTML=`<section class="panel party-board"><div class="eyebrow">PARTY</div><div class="prompt compact">${first?'構成完了':resuming?'ゲームを再開':'次のラウンド'}</div><div class="party-progress"><span style="width:${progress}%"></span></div>${resumeNote}${awardHtml}${completedGameId?playtestPromptHtml(completedGameId):''}<div class="standings"><div class="setup-label">Standings</div><div class="result-list">${rankingHtml(session.partyScores,'Party pt')}</div></div><div class="next-game"><div class="game-card-top"><span class="game-index">${String(session.party.round+1).padStart(2,'0')} / ${String(session.party.totalRounds).padStart(2,'0')}</span><span class="game-symbol">${game.emoji}</span></div><h3>${game.title}</h3><p>${game.description}</p></div><button class="btn primary full" id="partyNext">${first?'開始する':resuming?'このラウンドを始める':'次へ'}</button></section>`;
  if(completedGameId)bindPlaytest(completedGameId,{mode:'party',playerCount:session.players.length});app.querySelector('#partyNext').onclick=()=>startGame(nextId);
}

function renderWinner(isParty,ratingGameId=null){
  disposeActiveGame();const winners=session.winnerIndexes(isParty),scores=isParty?session.partyScores:session.scores;
  const completedSchedule=isParty?[...session.party.schedule]:[];
  updateBadge('RESULT');
  const soloResultHtml=!isParty&&lastSoloResult&&lastSoloResult.gameId===ratingGameId?`<section class="solo-result-card"><div class="eyebrow">SOLO RESULT · ${soloDifficultyLabel(lastSoloResult.difficulty).toUpperCase()}</div><div class="solo-result-difficulty">${soloDifficultyLabel(lastSoloResult.difficulty)} · ${soloDifficultyDetail(lastSoloResult.gameId,lastSoloResult.difficulty)}</div><div class="solo-result-grid"><div><b>${lastSoloResult.rounds}</b><span>クリアラウンド</span></div><div><b>${lastSoloResult.game.bestRounds??'—'}</b><span>この難易度のベスト</span></div><div><b>${lastSoloResult.maxStreak}</b><span>連続成功</span></div></div>${lastSoloResult.daily.gameId===ratingGameId&&lastSoloResult.daily.difficulty===lastSoloResult.difficulty&&lastSoloResult.daily.cleared?`<div class="solo-daily-clear">DAILY CLEAR · ${lastSoloResult.daily.streak}日連続</div>`:''}</section>`:'';
  const recapHtml=isParty&&lastPartyRecap?partyRecapHtml(lastPartyRecap,{compact:true}):'';
  const savePartyHtml=isParty?`<section class="party-save-card"><div><div class="eyebrow">SAVE THIS PARTY</div><b>この${completedSchedule.length}ラウンド構成を保存</b><small>ゲーム順もそのまま保存します。</small></div><div class="party-save-form"><input id="partyPresetName" maxlength="32" placeholder="例: 定番3本 / 頭脳戦ベスト"><button class="btn quiet" id="savePartyPreset">構成を保存</button></div></section>`:'';
  app.innerHTML=`<section class="panel winner"><div class="winner-mark">RESULT</div><div class="eyebrow">${isParty?'PARTY COMPLETE':'GAME COMPLETE'}</div><h2>${winners.map(i=>esc(session.players[i])).join(' & ')}</h2><p class="muted">${winners.length>1?'同点首位':'1位'}</p><div class="result-list">${rankingHtml(scores,isParty?'Party pt':'pt')}</div>${recapHtml}${isParty&&lastPartyRecap?'<div class="result-share-row"><button class="btn quiet full" id="sharePartyResult">Party結果を画像で共有</button></div>':''}${savePartyHtml}${soloResultHtml}${ratingGameId?playtestPromptHtml(ratingGameId):''}<div class="actions"><button class="btn quiet" id="homeResult">ホーム</button><button class="btn primary" id="againResult">もう一度</button></div></section>`;
  if(ratingGameId)bindPlaytest(ratingGameId,{mode:isParty?'party':'single',playerCount:session.players.length,difficulty:!isParty?lastSoloResult?.difficulty||null:null});
  app.querySelector('#sharePartyResult')?.addEventListener('click',()=>sharePartyCard(lastPartyRecap));
  app.querySelector('#savePartyPreset')?.addEventListener('click',()=>{const name=app.querySelector('#partyPresetName').value.trim();if(!name)return toast('構成名を入力してください');try{savedParties.save(name,completedSchedule);toast(name+'を保存しました');app.querySelector('#savePartyPreset').textContent='保存済み'}catch(error){toast(error?.message||'保存できませんでした')}});
  app.querySelector('#homeResult').onclick=renderHome;
  app.querySelector('#againResult').onclick=()=>{
    if(isParty){startTrackedSchedule(completedSchedule);return renderPartyIntermission(true)}
    if(lastSingleGameId){const difficulty=lastSoloResult?.difficulty||'normal';session.startSingle();return startGame(lastSingleGameId,{difficulty})}renderHome();
  };
}

function refreshHomeIfVisible(){if(app.querySelector('.hero'))renderHome()}
watchInstallPrompt(ready=>{pwaInstallReady=ready;refreshHomeIfVisible()});
watchConnectivity(()=>refreshHomeIfVisible());
registerPWA(registration=>{pwaUpdateRegistration=registration;refreshHomeIfVisible()});
navigator.serviceWorker?.addEventListener?.('controllerchange',()=>location.reload());

renderHome();
