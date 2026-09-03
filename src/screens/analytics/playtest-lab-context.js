import {createRequiredPicker} from '../../app/context-contract.js';

const pickRequired=createRequiredPicker('Playtest Lab');

export const PLAYTEST_LAB_STORE_KEYS=Object.freeze([
  'playtests',
  'playtestEvents'
]);

export const PLAYTEST_LAB_ROUTE_KEYS=Object.freeze([
  'disposeActiveGame',
  'renderHome'
]);

export const PLAYTEST_LAB_SERVICE_KEYS=Object.freeze([
  'updateBadge',
  'openGameDetail'
]);

export function createPlaytestLabContext({
  state,
  routes,
  updateBadge,
  openGameDetail
}){
  return Object.freeze({
    stores:pickRequired(state,PLAYTEST_LAB_STORE_KEYS,'store'),
    routes:pickRequired(routes,PLAYTEST_LAB_ROUTE_KEYS,'route',{functions:true}),
    services:pickRequired(
      {updateBadge,openGameDetail},
      PLAYTEST_LAB_SERVICE_KEYS,
      'service',
      {functions:true}
    )
  });
}
