export const HOME_STATE_KEYS=Object.freeze([
  'session',
  'ratings',
  'library',
  'playtests',
  'stats',
  'soloProgress',
  'playerGroups',
  'savedParties',
  'partyHistory',
  'improvementQueue'
]);

export const HOME_ROUTE_KEYS=Object.freeze([
  'disposeActiveGame',
  'renderPlayerGroups',
  'renderSavedParties',
  'renderPartyHistory',
  'renderPartyHistoryDetail',
  'renderPartySetup',
  'startSmartParty',
  'startTrackedSchedule',
  'renderPartyIntermission',
  'startGame',
  'renderGameDetail',
  'renderSmartPartyPreview',
  'renderPlaytestLab',
  'renderStatsDashboard',
  'renderSeasonBoard',
  'renderAchievements',
  'renderGameHealth',
  'renderImprovementQueue',
  'renderExperimentLearnings',
  'renderDataVault'
]);

function pickRequired(source,keys,label,{functions=false}={}){
  const result={};
  for(const key of keys){
    const value=source?.[key];
    if(value==null)throw new Error(`missing Home ${label}: ${key}`);
    if(functions&&typeof value!=='function')throw new TypeError(`Home ${label} must be a function: ${key}`);
    result[key]=value;
  }
  return Object.freeze(result);
}

export function createHomeContext({
  state,
  routes,
  updateBadge,
  toast,
  soloDifficultyDetail
}){
  if(typeof updateBadge!=='function')throw new TypeError('Home service must be a function: updateBadge');
  if(typeof toast!=='function')throw new TypeError('Home service must be a function: toast');
  if(typeof soloDifficultyDetail!=='function')throw new TypeError('Home service must be a function: soloDifficultyDetail');

  return Object.freeze({
    stores:pickRequired(state,HOME_STATE_KEYS,'store'),
    routes:pickRequired(routes,HOME_ROUTE_KEYS,'route',{functions:true}),
    services:Object.freeze({
      updateBadge,
      toast,
      soloDifficultyDetail
    })
  });
}
