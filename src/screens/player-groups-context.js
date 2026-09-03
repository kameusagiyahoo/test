import {createRequiredPicker} from '../app/context-contract.js';

const pickRequired=createRequiredPicker('Player Groups');

export const PLAYER_GROUPS_STORE_KEYS=Object.freeze([
  'session',
  'playerGroups'
]);

export const PLAYER_GROUPS_ROUTE_KEYS=Object.freeze([
  'disposeActiveGame',
  'renderHome'
]);

export const PLAYER_GROUPS_SERVICE_KEYS=Object.freeze([
  'updateBadge',
  'toast'
]);

export function createPlayerGroupsContext({
  state,
  routes,
  updateBadge,
  toast
}){
  return Object.freeze({
    stores:pickRequired(state,PLAYER_GROUPS_STORE_KEYS,'store'),
    routes:pickRequired(routes,PLAYER_GROUPS_ROUTE_KEYS,'route',{functions:true}),
    services:pickRequired(
      {updateBadge,toast},
      PLAYER_GROUPS_SERVICE_KEYS,
      'service',
      {functions:true}
    )
  });
}
