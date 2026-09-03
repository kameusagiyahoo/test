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

function pickRequired(source,keys,label,{functions=false}={}){
  const result={};
  for(const key of keys){
    const value=source?.[key];
    if(value==null)throw new Error(`missing Party History ${label}: ${key}`);
    if(functions&&typeof value!=='function'){
      throw new TypeError(`Party History ${label} must be a function: ${key}`);
    }
    result[key]=value;
  }
  return Object.freeze(result);
}

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
