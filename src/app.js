import {rankScores} from './core/session.js';
import {getGame,listGames} from './core/registry.js';
import {CATEGORY_DEFS,categoriesFor,categoryLabel,difficultyLabel,filterGames,gameMeta,pickGame,playerRangeLabel,recommendedGames} from './core/catalog.js';
import {gameGuide} from './core/game-guide.js';
import {SOLO_GAME_IDS,SOLO_DIFFICULTIES,normalizeSoloDifficulty,soloDifficultyLabel} from './core/solo.js';
import {canPromptInstall,isIOS,isOnline,isStandalone,registerPWA,requestInstall,watchConnectivity,watchInstallPrompt} from './core/pwa.js';
import {samePlayers} from './core/groups.js';
import {buildPlayerProfiles} from './core/player-profile.js';
import {achievementSummary} from './core/achievements.js';
import {partyShareModel,profileShareModel,renderPartyShareSvg,renderProfileShareSvg,shareCardFilename,shareSvgCard} from './core/share-card.js';
import {buildSeasonView,currentSeasonKey} from './core/season.js';
import {gameInsightHeadline,trendLabel} from './core/game-insights.js';
import {buildExperimentLearnings} from './core/experiment-learnings.js';
import {summarizeSmartParty} from './core/recommender.js';
import {escapeHtml as esc,oneDecimal,scoreButtons} from './ui/presentation.js';
import {createAppState} from './app/state.js';
import {createExperimentWorkflow} from './app/experiment-workflow.js';
import {createDataVaultScreen} from './screens/data-vault.js';
import {createPlayerGroupsScreen} from './screens/player-groups.js';
import {createPartyHistoryScreens} from './screens/party-history.js';
import {createSavedPartiesScreen} from './screens/saved-parties.js';
import {createPartyPlayFlow} from './screens/party/play-flow.js';
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
let partyPlayFlow=null;
let pwaInstallReady=false;
let pwaUpdateRegistration=null;
const APP_VERSION='8.32.5';

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
function disposeActiveGame(){return partyPlayFlow?.disposeActiveGame()}
function startSmartParty(...args){return partyPlayFlow?.startSmartParty(...args)}
function startTrackedSchedule(...args){return partyPlayFlow?.startTrackedSchedule(...args)}
function refreshHomeIfVisible(){if(app.querySelector('.hero'))renderHome()}
watchInstallPrompt(ready=>{pwaInstallReady=ready;refreshHomeIfVisible()});
watchConnectivity(()=>refreshHomeIfVisible());
registerPWA(registration=>{pwaUpdateRegistration=registration;refreshHomeIfVisible()});
navigator.serviceWorker?.addEventListener?.('controllerchange',()=>location.reload());

renderHome();
