import {createRequiredPicker} from '../app/context-contract.js';

const pickRequired=createRequiredPicker('Saved Parties');

export const SAVED_PARTIES_STORE_KEYS=Object.freeze([
  'savedParties'
]);

export const SAVED_PARTIES_ROUTE_KEYS=Object.freeze([
  'disposeActiveGame',
  'renderHome',
  'startTrackedSchedule',
  'renderPartyIntermission'
]);

export const SAVED_PARTIES_SERVICE_KEYS=Object.freeze([
  'updateBadge'
]);

export function createSavedPartiesContext({
  state,
  routes,
  updateBadge
}){
  return Object.freeze({
    stores:pickRequired(state,SAVED_PARTIES_STORE_KEYS,'store'),
    routes:pickRequired(routes,SAVED_PARTIES_ROUTE_KEYS,'route',{functions:true}),
    services:pickRequired(
      {updateBadge},
      SAVED_PARTIES_SERVICE_KEYS,
      'service',
      {functions:true}
    )
  });
}
