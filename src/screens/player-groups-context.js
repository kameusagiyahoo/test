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

function pickRequired(source,keys,label,{functions=false}={}){
  const result={};
  for(const key of keys){
    const value=source?.[key];
    if(value==null)throw new Error(`missing Player Groups ${label}: ${key}`);
    if(functions&&typeof value!=='function'){
      throw new TypeError(`Player Groups ${label} must be a function: ${key}`);
    }
    result[key]=value;
  }
  return Object.freeze(result);
}

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
