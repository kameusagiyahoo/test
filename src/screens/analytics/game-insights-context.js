export const GAME_INSIGHTS_STORE_KEYS=Object.freeze([
  'playtests',
  'playtestEvents',
  'stats',
  'soloProgress',
  'improvementQueue'
]);

export const GAME_INSIGHTS_ROUTE_KEYS=Object.freeze([
  'disposeActiveGame',
  'renderHome',
  'renderGameDetail',
  'renderPlayerProfile'
]);

export const GAME_INSIGHTS_SERVICE_KEYS=Object.freeze([
  'updateBadge',
  'toast',
  'soloDifficultyDetail'
]);

export const EXPERIMENT_WORKFLOW_METHODS=Object.freeze([
  'evaluation',
  'outcomeClass',
  'resultSummary',
  'advanceLabel',
  'advance'
]);

function pickRequired(source,keys,label,{functions=false}={}){
  const result={};
  for(const key of keys){
    const value=source?.[key];
    if(value==null)throw new Error(`missing Game Insights ${label}: ${key}`);
    if(functions&&typeof value!=='function'){
      throw new TypeError(`Game Insights ${label} must be a function: ${key}`);
    }
    result[key]=value;
  }
  return Object.freeze(result);
}

function validateExperimentWorkflow(workflow){
  if(!workflow)throw new Error('missing Game Insights service: experimentWorkflow');
  for(const method of EXPERIMENT_WORKFLOW_METHODS){
    if(typeof workflow[method]!=='function'){
      throw new TypeError(`Game Insights experimentWorkflow must expose: ${method}`);
    }
  }
  return workflow;
}

export function createGameInsightsContext({
  state,
  routes,
  experimentWorkflow,
  updateBadge,
  toast,
  soloDifficultyDetail
}){
  return Object.freeze({
    stores:pickRequired(state,GAME_INSIGHTS_STORE_KEYS,'store'),
    routes:pickRequired(routes,GAME_INSIGHTS_ROUTE_KEYS,'route',{functions:true}),
    services:Object.freeze({
      ...pickRequired(
        {updateBadge,toast,soloDifficultyDetail},
        GAME_INSIGHTS_SERVICE_KEYS,
        'service',
        {functions:true}
      ),
      experimentWorkflow:validateExperimentWorkflow(experimentWorkflow)
    })
  });
}
