import {createPlaytestFeedback} from '../ui/playtest-feedback.js';
import {rankingHtml} from '../ui/result-presentation.js';
import {createExperimentWorkflow} from './experiment-workflow.js';
import {createShareActions} from './share-actions.js';
import {createShellUi} from './shell-ui.js';
import {startPwaLifecycle} from './pwa-lifecycle.js';
import {createNavigationHub} from './navigation.js';
import {createDataVaultScreen} from '../screens/data-vault.js';
import {createPlayerGroupsScreen} from '../screens/player-groups.js';
import {createPartyHistoryScreens} from '../screens/party-history.js';
import {createSavedPartiesScreen} from '../screens/saved-parties.js';
import {createPartyPlayFlow} from '../screens/party/play-flow.js';
import {createHomeScreen} from '../screens/home/home.js';
import {createPlaytestLabScreen} from '../screens/analytics/playtest-lab.js';
import {createPlayerAnalyticsScreens} from '../screens/analytics/player-analytics.js';
import {createImprovementScreens} from '../screens/analytics/improvement.js';
import {createGameInsightsScreen} from '../screens/analytics/game-insights.js';
import {createGameDetailScreen,soloDifficultyDetail} from '../screens/game-detail/game-detail.js';

export function createAppRuntime({
  state,
  app,
  badge,
  homeButton,
  toastElement,
  appVersion
}){
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
  }=state;

  const navigation=createNavigationHub();
  const routes={
    renderHome:navigation.route('renderHome'),
    disposeActiveGame:navigation.route('disposeActiveGame'),
    startSmartParty:navigation.route('startSmartParty'),
    startTrackedSchedule:navigation.route('startTrackedSchedule'),
    renderSmartPartyPreview:navigation.route('renderSmartPartyPreview'),
    renderPartySetup:navigation.route('renderPartySetup'),
    startGame:navigation.route('startGame'),
    renderGameDetail:navigation.route('renderGameDetail'),
    renderPartyIntermission:navigation.route('renderPartyIntermission'),
    renderPlayerGroups:navigation.route('renderPlayerGroups'),
    renderSavedParties:navigation.route('renderSavedParties'),
    renderPartyHistory:navigation.route('renderPartyHistory'),
    renderPartyHistoryDetail:navigation.route('renderPartyHistoryDetail'),
    renderPlaytestLab:navigation.route('renderPlaytestLab'),
    renderStatsDashboard:navigation.route('renderStatsDashboard'),
    renderSeasonBoard:navigation.route('renderSeasonBoard'),
    renderPlayerProfile:navigation.route('renderPlayerProfile'),
    renderAchievements:navigation.route('renderAchievements'),
    renderGameHealth:navigation.route('renderGameHealth'),
    renderImprovementQueue:navigation.route('renderImprovementQueue'),
    renderExperimentLearnings:navigation.route('renderExperimentLearnings'),
    renderDataVault:navigation.route('renderDataVault'),
    renderGameInsights:navigation.route('renderGameInsights')
  };

  const {toast,updateBadge}=createShellUi({badge,toastElement,session});
  const {sharePartyCard,shareProfileCard}=createShareActions({toast});
  const renderRanking=(scores,unit)=>rankingHtml(scores,session.players,unit);

  navigation.bind('renderDataVault',createDataVaultScreen({
    app,
    appVersion,
    disposeActiveGame:routes.disposeActiveGame,
    updateBadge,
    toast,
    renderHome:routes.renderHome
  }));

  navigation.bind('renderPlayerGroups',createPlayerGroupsScreen({
    app,
    session,
    playerGroups,
    disposeActiveGame:routes.disposeActiveGame,
    updateBadge,
    toast,
    renderHome:routes.renderHome
  }));

  const {
    partyRecapHtml,
    renderPartyHistory,
    renderPartyHistoryDetail
  }=createPartyHistoryScreens({
    app,
    partyHistory,
    savedParties,
    disposeActiveGame:routes.disposeActiveGame,
    updateBadge,
    toast,
    renderHome:routes.renderHome,
    sharePartyCard,
    startTrackedSchedule:routes.startTrackedSchedule,
    renderPartyIntermission:routes.renderPartyIntermission
  });
  navigation.bind('renderPartyHistory',renderPartyHistory);
  navigation.bind('renderPartyHistoryDetail',renderPartyHistoryDetail);

  navigation.bind('renderSavedParties',createSavedPartiesScreen({
    app,
    savedParties,
    disposeActiveGame:routes.disposeActiveGame,
    updateBadge,
    renderHome:routes.renderHome,
    startTrackedSchedule:routes.startTrackedSchedule,
    renderPartyIntermission:routes.renderPartyIntermission
  }));

  const playtestFeedback=createPlaytestFeedback({
    app,
    session,
    ratings,
    playtests,
    playtestEvents
  });

  const partyPlayFlow=createPartyPlayFlow({
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
    renderHome:routes.renderHome,
    playtestPromptHtml:playtestFeedback.promptHtml,
    bindPlaytest:playtestFeedback.bind,
    rankingHtml:renderRanking,
    partyRecapHtml,
    sharePartyCard,
    soloDifficultyDetail
  });
  navigation.bind('disposeActiveGame',partyPlayFlow.disposeActiveGame);
  navigation.bind('startSmartParty',partyPlayFlow.startSmartParty);
  navigation.bind('startTrackedSchedule',partyPlayFlow.startTrackedSchedule);
  navigation.bind('renderSmartPartyPreview',partyPlayFlow.renderSmartPartyPreview);
  navigation.bind('renderPartySetup',partyPlayFlow.renderPartySetup);
  navigation.bind('startGame',partyPlayFlow.startGame);
  navigation.bind('renderPartyIntermission',partyPlayFlow.renderPartyIntermission);

  let homeScreen=null;
  navigation.bind('renderPlaytestLab',createPlaytestLabScreen({
    app,
    playtests,
    playtestEvents,
    disposeActiveGame:routes.disposeActiveGame,
    updateBadge,
    renderHome:routes.renderHome,
    openGameDetail:id=>{
      homeScreen?.saveDraft({quiet:true});
      routes.renderGameDetail(id);
    }
  }));

  const {
    renderSeasonBoard,
    renderStatsDashboard,
    renderPlayerProfile,
    renderAchievements
  }=createPlayerAnalyticsScreens({
    app,
    stats,
    partyHistory,
    disposeActiveGame:routes.disposeActiveGame,
    updateBadge,
    renderHome:routes.renderHome,
    renderGameDetail:routes.renderGameDetail,
    shareProfileCard,
    renderPartyHistoryDetail:routes.renderPartyHistoryDetail
  });
  navigation.bind('renderSeasonBoard',renderSeasonBoard);
  navigation.bind('renderStatsDashboard',renderStatsDashboard);
  navigation.bind('renderPlayerProfile',renderPlayerProfile);
  navigation.bind('renderAchievements',renderAchievements);

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
    disposeActiveGame:routes.disposeActiveGame,
    updateBadge,
    toast,
    renderHome:routes.renderHome,
    renderGameDetail:routes.renderGameDetail,
    renderPlayerProfile:routes.renderPlayerProfile,
    soloDifficultyDetail
  });
  navigation.bind('renderGameInsights',renderGameInsights);

  const gameDetailScreen=createGameDetailScreen({
    app,
    session,
    library,
    gameInsightData,
    disposeActiveGame:routes.disposeActiveGame,
    updateBadge,
    renderHome:routes.renderHome,
    renderGameInsights:routes.renderGameInsights,
    startGame:routes.startGame
  });
  navigation.bind('renderGameDetail',gameDetailScreen.renderGameDetail);

  const {
    renderGameHealth,
    renderExperimentLearnings,
    renderImprovementQueue
  }=createImprovementScreens({
    app,
    playtests,
    stats,
    improvementQueue,
    disposeActiveGame:routes.disposeActiveGame,
    updateBadge,
    renderHome:routes.renderHome,
    renderGameInsights:routes.renderGameInsights,
    experimentWorkflow
  });
  navigation.bind('renderGameHealth',renderGameHealth);
  navigation.bind('renderExperimentLearnings',renderExperimentLearnings);
  navigation.bind('renderImprovementQueue',renderImprovementQueue);

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
    disposeActiveGame:routes.disposeActiveGame,
    renderPlayerGroups:routes.renderPlayerGroups,
    renderSavedParties:routes.renderSavedParties,
    renderPartyHistory:routes.renderPartyHistory,
    renderPartyHistoryDetail:routes.renderPartyHistoryDetail,
    renderPartySetup:routes.renderPartySetup,
    startSmartParty:routes.startSmartParty,
    startTrackedSchedule:routes.startTrackedSchedule,
    renderPartyIntermission:routes.renderPartyIntermission,
    startGame:routes.startGame,
    renderGameDetail:routes.renderGameDetail,
    renderSmartPartyPreview:routes.renderSmartPartyPreview,
    renderPlaytestLab:routes.renderPlaytestLab,
    renderStatsDashboard:routes.renderStatsDashboard,
    renderSeasonBoard:routes.renderSeasonBoard,
    renderAchievements:routes.renderAchievements,
    renderGameHealth:routes.renderGameHealth,
    renderImprovementQueue:routes.renderImprovementQueue,
    renderExperimentLearnings:routes.renderExperimentLearnings,
    renderDataVault:routes.renderDataVault,
    soloDifficultyDetail
  });
  navigation.bind('renderHome',homeScreen.renderHome);

  homeButton.onclick=()=>{
    routes.disposeActiveGame();
    routes.renderHome();
  };

  function start(){
    startPwaLifecycle({homeScreen});
    routes.renderHome();
  }

  return{start,navigation};
}
