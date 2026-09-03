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

function pickRequired(source,keys,label,{functions=false}={}){
  const result={};
  for(const key of keys){
    const value=source?.[key];
    if(value==null)throw new Error(`missing Saved Parties ${label}: ${key}`);
    if(functions&&typeof value!=='function'){
      throw new TypeError(`Saved Parties ${label} must be a function: ${key}`);
    }
    result[key]=value;
  }
  return Object.freeze(result);
}

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
