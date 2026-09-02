import {createPlaytestFeedback} from './ui/playtest-feedback.js';
import {rankingHtml} from './ui/result-presentation.js';
import {createAppState} from './app/state.js';
import {createExperimentWorkflow} from './app/experiment-workflow.js';
import {createShareActions} from './app/share-actions.js';
import {createShellUi} from './app/shell-ui.js';
import {startPwaLifecycle} from './app/pwa-lifecycle.js';
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
const APP_VERSION='8.32.8';

const shellUi=createShellUi({badge,toastElement:toastEl,session});
const {toast,updateBadge}=shellUi;
const {sharePartyCard,shareProfileCard}=createShareActions({toast});
const renderRanking=(scores,unit)=>rankingHtml(scores,session.players,unit);

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
  rankingHtml:renderRanking,
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

function renderHome(){return homeScreen?.renderHome()}
function disposeActiveGame(){return partyPlayFlow?.disposeActiveGame()}
function startSmartParty(...args){return partyPlayFlow?.startSmartParty(...args)}
function startTrackedSchedule(...args){return partyPlayFlow?.startTrackedSchedule(...args)}
function renderSmartPartyPreview(...args){return partyPlayFlow?.renderSmartPartyPreview(...args)}
function renderPartySetup(...args){return partyPlayFlow?.renderPartySetup(...args)}
function startGame(...args){return partyPlayFlow?.startGame(...args)}
function renderGameDetail(...args){return gameDetailScreen?.renderGameDetail(...args)}
function renderPartyIntermission(...args){return partyPlayFlow?.renderPartyIntermission(...args)}

homeButton.onclick=()=>{disposeActiveGame();renderHome()};

startPwaLifecycle({homeScreen});

renderHome();
