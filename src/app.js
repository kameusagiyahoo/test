import {rankScores} from './core/session.js';
import {listGames} from './core/registry.js';
import {registerPWA,watchConnectivity,watchInstallPrompt} from './core/pwa.js';
import {partyShareModel,profileShareModel,renderPartyShareSvg,renderProfileShareSvg,shareCardFilename,shareSvgCard} from './core/share-card.js';
import {escapeHtml as esc} from './ui/presentation.js';
import {createPlaytestFeedback} from './ui/playtest-feedback.js';
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
import {createGameInsightsScreen} from './screens/analytics/game-insights.js';
import {createGameDetailScreen,soloDifficultyDetail} from './screens/game-detail/game-detail.js';
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
let gameDetailScreen=null;
let homeScreen=null;
const APP_VERSION='8.32.7';

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

const playtestFeedback=createPlaytestFeedback({
  app,
  session,
  ratings,
  playtests,
  playtestEvents
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
  playtestPromptHtml:playtestFeedback.promptHtml,
  bindPlaytest:playtestFeedback.bind,
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

gameDetailScreen=createGameDetailScreen({
  app,
  session,
  library,
  gameInsightData,
  disposeActiveGame,
  updateBadge,
  renderHome,
  renderGameInsights,
  startGame
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
function renderGameDetail(...args){return gameDetailScreen?.renderGameDetail(...args)}
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
homeButton.onclick=()=>{disposeActiveGame();renderHome()};

watchInstallPrompt(ready=>homeScreen?.setInstallReady(ready));
watchConnectivity(()=>homeScreen?.refreshIfVisible());
registerPWA(registration=>homeScreen?.setUpdateRegistration(registration));
navigator.serviceWorker?.addEventListener?.('controllerchange',()=>location.reload());

renderHome();
