import {createRequiredPicker} from '../../app/context-contract.js';

const pickRequired=createRequiredPicker('Home');

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
