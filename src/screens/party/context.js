export const PARTY_FLOW_STORE_KEYS=Object.freeze([
  'session',
  'partySettings',
  'library',
  'playtests',
  'stats',
  'soloProgress',
  'partyHistory',
  'savedParties'
]);

export const PARTY_FLOW_CALLBACK_KEYS=Object.freeze([
  'renderHome',
  'playtestPromptHtml',
  'bindPlaytest',
  'rankingHtml',
  'partyRecapHtml',
  'sharePartyCard',
  'soloDifficultyDetail'
]);

export const PARTY_FLOW_SERVICE_KEYS=Object.freeze([
  'updateBadge',
  'toast'
]);

function pickRequired(source,keys,label,{functions=false}={}){
  const result={};
  for(const key of keys){
    const value=source?.[key];
    if(value==null)throw new Error(`missing Party Flow ${label}: ${key}`);
    if(functions&&typeof value!=='function'){
      throw new TypeError(`Party Flow ${label} must be a function: ${key}`);
    }
    result[key]=value;
  }
  return Object.freeze(result);
}

export function createPartyFlowContext({
  state,
  callbacks,
  updateBadge,
  toast
}){
  return Object.freeze({
    stores:pickRequired(state,PARTY_FLOW_STORE_KEYS,'store'),
    callbacks:pickRequired(callbacks,PARTY_FLOW_CALLBACK_KEYS,'callback',{functions:true}),
    services:pickRequired(
      {updateBadge,toast},
      PARTY_FLOW_SERVICE_KEYS,
      'service',
      {functions:true}
    )
  });
}
