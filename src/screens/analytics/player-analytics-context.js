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

function pickRequired(source,keys,label,{functions=false}={}){
  const result={};
  for(const key of keys){
    const value=source?.[key];
    if(value==null)throw new Error(`missing Player Analytics ${label}: ${key}`);
    if(functions&&typeof value!=='function'){
      throw new TypeError(`Player Analytics ${label} must be a function: ${key}`);
    }
    result[key]=value;
  }
  return Object.freeze(result);
}

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
