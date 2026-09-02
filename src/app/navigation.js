export const APP_ROUTE_NAMES=Object.freeze([
  'renderHome',
  'disposeActiveGame',
  'startSmartParty',
  'startTrackedSchedule',
  'renderSmartPartyPreview',
  'renderPartySetup',
  'startGame',
  'renderGameDetail',
  'renderPartyIntermission',
  'renderPlayerGroups',
  'renderSavedParties',
  'renderPartyHistory',
  'renderPartyHistoryDetail',
  'renderPlaytestLab',
  'renderStatsDashboard',
  'renderSeasonBoard',
  'renderPlayerProfile',
  'renderAchievements',
  'renderGameHealth',
  'renderImprovementQueue',
  'renderExperimentLearnings',
  'renderDataVault',
  'renderGameInsights'
]);

export function createNavigationHub(names=APP_ROUTE_NAMES){
  const allowed=new Set(names);
  const targets=new Map();

  function assertKnown(name){
    if(!allowed.has(name))throw new Error(`unknown app route: ${name}`);
  }

  function bind(name,target){
    assertKnown(name);
    if(typeof target!=='function')throw new TypeError(`route target must be a function: ${name}`);
    if(targets.has(name))throw new Error(`app route already bound: ${name}`);
    targets.set(name,target);
    return target;
  }

  function route(name){
    assertKnown(name);
    return(...args)=>{
      const target=targets.get(name);
      if(!target)throw new Error(`app route not bound: ${name}`);
      return target(...args);
    };
  }

  function isBound(name){
    assertKnown(name);
    return targets.has(name);
  }

  return{bind,route,isBound};
}
