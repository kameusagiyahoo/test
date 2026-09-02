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

export function createRouteTable(navigation,names=APP_ROUTE_NAMES){
  return Object.freeze(Object.fromEntries(
    names.map(name=>[name,navigation.route(name)])
  ));
}

export function createNavigationHub(names=APP_ROUTE_NAMES){
  const allowedNames=[...names];
  const allowed=new Set(allowedNames);
  const targets=new Map();

  function assertKnown(name){
    if(!allowed.has(name))throw new Error(`unknown app route: ${name}`);
  }

  function validateBinding(name,target){
    assertKnown(name);
    if(typeof target!=='function')throw new TypeError(`route target must be a function: ${name}`);
    if(targets.has(name))throw new Error(`app route already bound: ${name}`);
  }

  function bind(name,target){
    validateBinding(name,target);
    targets.set(name,target);
    return target;
  }

  function bindMany(bindings){
    const entries=Object.entries(bindings);
    entries.forEach(([name,target])=>validateBinding(name,target));
    entries.forEach(([name,target])=>targets.set(name,target));
    return bindings;
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

  function missingRoutes(){
    return allowedNames.filter(name=>!targets.has(name));
  }

  function assertAllBound(){
    const missing=missingRoutes();
    if(missing.length)throw new Error(`unbound app routes: ${missing.join(', ')}`);
    return true;
  }

  return{bind,bindMany,route,isBound,missingRoutes,assertAllBound};
}
