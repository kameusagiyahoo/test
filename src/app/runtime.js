import {createPlaytestFeedback} from '../ui/playtest-feedback.js';
import {rankingHtml} from '../ui/result-presentation.js';
import {createExperimentWorkflow} from './experiment-workflow.js';
import {createShareActions} from './share-actions.js';
import {createShellUi} from './shell-ui.js';
import {startPwaLifecycle} from './pwa-lifecycle.js';
import {createNavigationHub,createRouteTable} from './navigation.js';
import {createDataVaultScreen} from '../screens/data-vault.js';
import {createDataVaultContext} from '../screens/data-vault-context.js';
import {createPlayerGroupsScreen} from '../screens/player-groups.js';
import {createPlayerGroupsContext} from '../screens/player-groups-context.js';
import {createPartyHistoryScreens} from '../screens/party-history.js';
import {createPartyHistoryContext} from '../screens/party-history-context.js';
import {createSavedPartiesScreen} from '../screens/saved-parties.js';
import {createSavedPartiesContext} from '../screens/saved-parties-context.js';
import {createPartyPlayFlow} from '../screens/party/play-flow.js';
import {createPartyFlowContext} from '../screens/party/context.js';
import {createHomeScreen} from '../screens/home/home.js';
import {createHomeContext} from '../screens/home/context.js';
import {createPlaytestLabScreen} from '../screens/analytics/playtest-lab.js';
import {createPlaytestLabContext} from '../screens/analytics/playtest-lab-context.js';
import {createPlayerAnalyticsScreens} from '../screens/analytics/player-analytics.js';
import {createPlayerAnalyticsContext} from '../screens/analytics/player-analytics-context.js';
import {createImprovementScreens} from '../screens/analytics/improvement.js';
import {createImprovementContext} from '../screens/analytics/improvement-context.js';
import {createGameInsightsScreen} from '../screens/analytics/game-insights.js';
import {createGameInsightsContext} from '../screens/analytics/game-insights-context.js';
import {createGameDetailScreen,soloDifficultyDetail} from '../screens/game-detail/game-detail.js';
import {createGameDetailContext} from '../screens/game-detail/context.js';

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
  const routes=createRouteTable(navigation);

  const {toast,updateBadge}=createShellUi({badge,toastElement,session});
  const {sharePartyCard,shareProfileCard}=createShareActions({toast});
  const renderRanking=(scores,unit)=>rankingHtml(scores,session.players,unit);

  navigation.bind('renderDataVault',createDataVaultScreen({
    app,
    context:createDataVaultContext({
      routes,
      updateBadge,
      toast,
      appVersion
    })
  }));

  navigation.bind('renderPlayerGroups',createPlayerGroupsScreen({
    app,
    context:createPlayerGroupsContext({
      state,
      routes,
      updateBadge,
      toast
    })
  }));

  const {
    partyRecapHtml,
    renderPartyHistory,
    renderPartyHistoryDetail
  }=createPartyHistoryScreens({
    app,
    context:createPartyHistoryContext({
      state,
      routes,
      updateBadge,
      toast,
      sharePartyCard
    })
  });
  navigation.bindMany({
    renderPartyHistory,
    renderPartyHistoryDetail
  });

  navigation.bind('renderSavedParties',createSavedPartiesScreen({
    app,
    context:createSavedPartiesContext({
      state,
      routes,
      updateBadge
    })
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
    context:createPartyFlowContext({
      state,
      callbacks:{
        renderHome:routes.renderHome,
        playtestPromptHtml:playtestFeedback.promptHtml,
        bindPlaytest:playtestFeedback.bind,
        rankingHtml:renderRanking,
        partyRecapHtml,
        sharePartyCard,
        soloDifficultyDetail
      },
      updateBadge,
      toast
    })
  });
  navigation.bindMany({
    disposeActiveGame:partyPlayFlow.disposeActiveGame,
    startSmartParty:partyPlayFlow.startSmartParty,
    startTrackedSchedule:partyPlayFlow.startTrackedSchedule,
    renderSmartPartyPreview:partyPlayFlow.renderSmartPartyPreview,
    renderPartySetup:partyPlayFlow.renderPartySetup,
    startGame:partyPlayFlow.startGame,
    renderPartyIntermission:partyPlayFlow.renderPartyIntermission
  });

  let homeScreen=null;
  navigation.bind('renderPlaytestLab',createPlaytestLabScreen({
    app,
    context:createPlaytestLabContext({
      state,
      routes,
      updateBadge,
      openGameDetail:id=>{
        homeScreen?.saveDraft({quiet:true});
        routes.renderGameDetail(id);
      }
    })
  }));

  const {
    renderSeasonBoard,
    renderStatsDashboard,
    renderPlayerProfile,
    renderAchievements
  }=createPlayerAnalyticsScreens({
    app,
    context:createPlayerAnalyticsContext({
      state,
      routes,
      updateBadge,
      shareProfileCard
    })
  });
  navigation.bindMany({
    renderSeasonBoard,
    renderStatsDashboard,
    renderPlayerProfile,
    renderAchievements
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
    context:createGameInsightsContext({
      state,
      routes,
      experimentWorkflow,
      updateBadge,
      toast,
      soloDifficultyDetail
    })
  });
  navigation.bind('renderGameInsights',renderGameInsights);

  const gameDetailScreen=createGameDetailScreen({
    app,
    context:createGameDetailContext({
      state,
      routes,
      updateBadge,
      gameInsightData
    })
  });
  navigation.bind('renderGameDetail',gameDetailScreen.renderGameDetail);

  const {
    renderGameHealth,
    renderExperimentLearnings,
    renderImprovementQueue
  }=createImprovementScreens({
    app,
    context:createImprovementContext({
      state,
      routes,
      updateBadge,
      experimentWorkflow
    })
  });
  navigation.bindMany({
    renderGameHealth,
    renderExperimentLearnings,
    renderImprovementQueue
  });

  homeScreen=createHomeScreen({
    app,
    context:createHomeContext({
      state,
      routes,
      updateBadge,
      toast,
      soloDifficultyDetail
    })
  });
  navigation.bind('renderHome',homeScreen.renderHome);

  homeButton.onclick=()=>{
    routes.disposeActiveGame();
    routes.renderHome();
  };

  function start(){
    navigation.assertAllBound();
    startPwaLifecycle({homeScreen});
    routes.renderHome();
  }

  return{start,navigation};
}
