import {createRequiredPicker} from '../app/context-contract.js';

const pickRequired=createRequiredPicker('Party History');

export const PARTY_HISTORY_STORE_KEYS=Object.freeze([
  'partyHistory',
  'savedParties'
]);

export const PARTY_HISTORY_ROUTE_KEYS=Object.freeze([
  'disposeActiveGame',
  'renderHome',
  'startTrackedSchedule',
  'renderPartyIntermission'
]);

export const PARTY_HISTORY_SERVICE_KEYS=Object.freeze([
  'updateBadge',
  'toast',
  'sharePartyCard'
]);

export function createPartyHistoryContext({
  state,
  routes,
  updateBadge,
  toast,
  sharePartyCard
}){
  return Object.freeze({
    stores:pickRequired(state,PARTY_HISTORY_STORE_KEYS,'store'),
    routes:pickRequired(routes,PARTY_HISTORY_ROUTE_KEYS,'route',{functions:true}),
    services:pickRequired(
      {updateBadge,toast,sharePartyCard},
      PARTY_HISTORY_SERVICE_KEYS,
      'service',
      {functions:true}
    )
  });
}
