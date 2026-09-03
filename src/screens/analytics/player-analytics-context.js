import {createRequiredPicker} from '../../app/context-contract.js';

const pickRequired=createRequiredPicker('Player Analytics');

export const PLAYER_ANALYTICS_STORE_KEYS=Object.freeze([
  'stats',
  'partyHistory'
]);

export const PLAYER_ANALYTICS_ROUTE_KEYS=Object.freeze([
  'disposeActiveGame',
  'renderHome',
  'renderGameDetail',
  'renderPartyHistoryDetail'
]);

export const PLAYER_ANALYTICS_SERVICE_KEYS=Object.freeze([
  'updateBadge',
  'shareProfileCard'
]);

export function createPlayerAnalyticsContext({
  state,
  routes,
  updateBadge,
  shareProfileCard
}){
  return Object.freeze({
    stores:pickRequired(state,PLAYER_ANALYTICS_STORE_KEYS,'store'),
    routes:pickRequired(routes,PLAYER_ANALYTICS_ROUTE_KEYS,'route',{functions:true}),
    services:pickRequired(
      {updateBadge,shareProfileCard},
      PLAYER_ANALYTICS_SERVICE_KEYS,
      'service',
      {functions:true}
    )
  });
}
