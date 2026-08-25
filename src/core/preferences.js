const RATING_KEY='partyPocketRatingsV1';
const PARTY_SETTINGS_KEY='partyPocketPartySettingsV1';

function readJson(storage,key,fallback){
  try{const raw=storage?.getItem?.(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}

export class RatingStore{
  constructor(storage=globalThis.localStorage){this.storage=storage}
  all(){const value=readJson(this.storage,RATING_KEY,{});return value&&typeof value==='object'?value:{}}
  get(gameId){
    const value=this.all()[gameId]||{};
    const good=Number(value.good)||0,neutral=Number(value.neutral)||0,bad=Number(value.bad)||0;
    return{good,neutral,bad,total:good+neutral+bad};
  }
  rate(gameId,value){
    if(!['good','neutral','bad'].includes(value))throw new Error('invalid rating');
    const all=this.all(),current=this.get(gameId);current[value]+=1;current.total+=1;
    all[gameId]={good:current.good,neutral:current.neutral,bad:current.bad};
    this.storage?.setItem?.(RATING_KEY,JSON.stringify(all));return current;
  }
}

export class PartySettingsStore{
  constructor(storage=globalThis.localStorage){this.storage=storage}
  load(validGameIds){
    const fallback={rounds:6,gameIds:[...validGameIds]};
    const raw=readJson(this.storage,PARTY_SETTINGS_KEY,fallback);
    const rounds=[3,6,9].includes(Number(raw?.rounds))?Number(raw.rounds):6;
    const gameIds=Array.isArray(raw?.gameIds)?raw.gameIds.filter(id=>validGameIds.includes(id)):[];
    return{rounds,gameIds:gameIds.length>=2?gameIds:[...validGameIds]};
  }
  save(settings,validGameIds){
    const rounds=[3,6,9].includes(Number(settings?.rounds))?Number(settings.rounds):6;
    const gameIds=[...new Set(Array.isArray(settings?.gameIds)?settings.gameIds:[])].filter(id=>validGameIds.includes(id));
    if(gameIds.length<2)throw new Error('select at least two games');
    const value={rounds,gameIds};this.storage?.setItem?.(PARTY_SETTINGS_KEY,JSON.stringify(value));return value;
  }
}
