import {createRequiredPicker} from '../../app/context-contract.js';

const pickRequired=createRequiredPicker('Game Detail');

export const GAME_DETAIL_STORE_KEYS=Object.freeze([
  'session',
  'library'
]);

export const GAME_DETAIL_ROUTE_KEYS=Object.freeze([
  'disposeActiveGame',
  'renderHome',
  'renderGameInsights',
  'startGame'
]);

export const GAME_DETAIL_SERVICE_KEYS=Object.freeze([
  'updateBadge',
  'gameInsightData'
]);

export function createGameDetailContext({
  state,
  routes,
  updateBadge,
  gameInsightData
}){
  return Object.freeze({
    stores:pickRequired(state,GAME_DETAIL_STORE_KEYS,'store'),
    routes:pickRequired(routes,GAME_DETAIL_ROUTE_KEYS,'route',{functions:true}),
    services:pickRequired(
      {updateBadge,gameInsightData},
      GAME_DETAIL_SERVICE_KEYS,
      'service',
      {functions:true}
    )
  });
}
