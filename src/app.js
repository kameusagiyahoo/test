import {rankScores} from './core/session.js';
import {getGame,listGames} from './core/registry.js';
import {difficultyLabel,gameMeta,playerRangeLabel} from './core/catalog.js';
import {gameGuide} from './core/game-guide.js';
import {SOLO_GAME_IDS,SOLO_DIFFICULTIES,normalizeSoloDifficulty,soloDifficultyLabel} from './core/solo.js';
import {registerPWA,watchConnectivity,watchInstallPrompt} from './core/pwa.js';
import {partyShareModel,profileShareModel,renderPartyShareSvg,renderProfileShareSvg,shareCardFilename,shareSvgCard} from './core/share-card.js';
import {gameInsightHeadline,trendLabel} from './core/game-insights.js';
import {escapeHtml as esc,oneDecimal,scoreButtons} from './ui/presentation.js';
import {createAppState} from './app/state.js';
import {createExperimentWorkflow} from './app/experiment-workflow.js';
import {createDataVaultScreen} from './screens/data-vault.js';
import {createPlayerGroupsScreen} from './screens/player-groups.js';
import {createPartyHistoryScreens} from './screens/party-history.js';
import {createSavedPartiesScreen} from './screens/saved-parties.js';
import {createPartyPlayFlow} from './screens/party/play-flow.js';
import {createHomeScreen} from './screens/home/home.js';
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
let partyPlayFlow=null;
let homeScreen=null;
const APP_VERSION='8.32.6';

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

partyPlayFlow=createPartyPlayFlow({
  app,
  session,
  partySettings,
  library,
  playtests,
  stats,
  soloProgress,
  partyHistory,
  savedParties,
  updateBadge,
  toast,
  renderHome,
  playtestPromptHtml,
  bindPlaytest,
  rankingHtml,
  partyRecapHtml,
  sharePartyCard,
  soloDifficultyDetail
});

const renderPlaytestLab=createPlaytestLabScreen({
  app,
  playtests,
  playtestEvents,
  disposeActiveGame,
  updateBadge,
  renderHome,
  openGameDetail:id=>{homeScreen?.saveDraft({quiet:true});renderGameDetail(id)}
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

homeScreen=createHomeScreen({
  app,
  session,
  ratings,
  library,
  playtests,
  stats,
  soloProgress,
  playerGroups,
  savedParties,
  partyHistory,
  improvementQueue,
  updateBadge,
  toast,
  disposeActiveGame,
  renderPlayerGroups,
  renderSavedParties,
  renderPartyHistory,
  renderPartyHistoryDetail,
  renderPartySetup,
  startSmartParty,
  startTrackedSchedule,
  renderPartyIntermission,
  startGame,
  renderGameDetail,
  renderSmartPartyPreview,
  renderPlaytestLab,
  renderStatsDashboard,
  renderSeasonBoard,
  renderAchievements,
  renderGameHealth,
  renderImprovementQueue,
  renderExperimentLearnings,
  renderDataVault,
  soloDifficultyDetail
});

function toast(text){toastEl.textContent=text;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),1500)}
function updateBadge(text){badge.textContent=text||`${session.players.length}人`}
function renderHome(){return homeScreen?.renderHome()}
function disposeActiveGame(){return partyPlayFlow?.disposeActiveGame()}
function startSmartParty(...args){return partyPlayFlow?.startSmartParty(...args)}
function startTrackedSchedule(...args){return partyPlayFlow?.startTrackedSchedule(...args)}
function renderSmartPartyPreview(...args){return partyPlayFlow?.renderSmartPartyPreview(...args)}
function renderPartySetup(...args){return partyPlayFlow?.renderPartySetup(...args)}
function startGame(...args){return partyPlayFlow?.startGame(...args)}
function renderPartyIntermission(...args){return partyPlayFlow?.renderPartyIntermission(...args)}

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
function playtestPromptHtml(gameId){
  const game=getGame(gameId);if(!game)return'';const p=playtests.get(gameId);
  return `<section class="feedback playtest-card" data-playtest-game="${gameId}"><div><div class="eyebrow">PLAYTEST NOTE</div><strong>${esc(game.title)}を4軸で評価</strong><div class="feedback-history">${p.responses?`新評価 ${p.responses}回 · 面白さ ${oneDecimal(p.fun.average)} · 分かりやすさ ${oneDecimal(p.clarity.average)}`:p.legacyResponses?`旧「また遊びたい」評価 ${p.legacyResponses}件を引き継ぎ済み`:'この端末だけに記録します'}</div></div><div class="playtest-fields"><div class="playtest-row"><span>面白さ</span><div class="score-choices">${scoreButtons('fun')}</div></div><div class="playtest-row"><span>分かりやすさ</span><div class="score-choices">${scoreButtons('clarity')}</div></div><div class="playtest-row"><span>頭を使う度</span><div class="score-choices">${scoreButtons('brain')}</div></div><div class="playtest-row"><span>もう一度遊びたい</span><div class="score-choices">${scoreButtons('replay')}</div></div></div><button class="btn primary full playtest-save" disabled>4項目を記録</button></section>`;
}
function bindPlaytest(gameId,{mode=session.mode==='party'?'party':'single',playerCount=session.players.length,difficulty=null}={}){
  const wrap=app.querySelector(`[data-playtest-game="${gameId}"]`);if(!wrap)return;
  const scores={};const save=wrap.querySelector('.playtest-save');
  wrap.querySelectorAll('[data-axis][data-score]').forEach(button=>button.onclick=()=>{
    const axis=button.dataset.axis,score=Number(button.dataset.score);scores[axis]=score;
    wrap.querySelectorAll(`[data-axis="${axis}"]`).forEach(choice=>{const selected=Number(choice.dataset.score)===score;choice.classList.toggle('selected',selected);choice.setAttribute('aria-pressed',String(selected))});
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

watchInstallPrompt(ready=>homeScreen?.setInstallReady(ready));
watchConnectivity(()=>homeScreen?.refreshIfVisible());
registerPWA(registration=>homeScreen?.setUpdateRegistration(registration));
navigator.serviceWorker?.addEventListener?.('controllerchange',()=>location.reload());

renderHome();
