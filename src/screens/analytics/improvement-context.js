export const IMPROVEMENT_STORE_KEYS=Object.freeze([
  'playtests',
  'stats',
  'improvementQueue'
]);

export const IMPROVEMENT_ROUTE_KEYS=Object.freeze([
  'disposeActiveGame',
  'renderHome',
  'renderGameInsights'
]);

export const IMPROVEMENT_SERVICE_KEYS=Object.freeze([
  'updateBadge'
]);

export const IMPROVEMENT_WORKFLOW_METHODS=Object.freeze([
  'evaluation',
  'outcomeClass',
  'advanceLabel',
  'advance'
]);

function pickRequired(source,keys,label,{functions=false}={}){
  const result={};
  for(const key of keys){
    const value=source?.[key];
    if(value==null)throw new Error(`missing Improvement ${label}: ${key}`);
    if(functions&&typeof value!=='function'){
      throw new TypeError(`Improvement ${label} must be a function: ${key}`);
    }
    result[key]=value;
  }
  return Object.freeze(result);
}

function validateExperimentWorkflow(workflow){
  if(!workflow)throw new Error('missing Improvement service: experimentWorkflow');
  for(const method of IMPROVEMENT_WORKFLOW_METHODS){
    if(typeof workflow[method]!=='function'){
      throw new TypeError(`Improvement experimentWorkflow must expose: ${method}`);
    }
  }
  return workflow;
}

export function createImprovementContext({
  state,
  routes,
  updateBadge,
  experimentWorkflow
}){
  return Object.freeze({
    stores:pickRequired(state,IMPROVEMENT_STORE_KEYS,'store'),
    routes:pickRequired(routes,IMPROVEMENT_ROUTE_KEYS,'route',{functions:true}),
    services:Object.freeze({
      ...pickRequired(
        {updateBadge},
        IMPROVEMENT_SERVICE_KEYS,
        'service',
        {functions:true}
      ),
      experimentWorkflow:validateExperimentWorkflow(experimentWorkflow)
    })
  });
}
