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

function pickRequired(source,keys,label,{functions=false}={}){
  const result={};
  for(const key of keys){
    const value=source?.[key];
    if(value==null)throw new Error(`missing Game Detail ${label}: ${key}`);
    if(functions&&typeof value!=='function'){
      throw new TypeError(`Game Detail ${label} must be a function: ${key}`);
    }
    result[key]=value;
  }
  return Object.freeze(result);
}

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
