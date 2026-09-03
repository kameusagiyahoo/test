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

function pickRequired(source,keys,label,{functions=false}={}){
  const result={};
  for(const key of keys){
    const value=source?.[key];
    if(value==null)throw new Error(`missing Playtest Lab ${label}: ${key}`);
    if(functions&&typeof value!=='function'){
      throw new TypeError(`Playtest Lab ${label} must be a function: ${key}`);
    }
    result[key]=value;
  }
  return Object.freeze(result);
}

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
