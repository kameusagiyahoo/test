const RATING_KEY='partyPocketRatingsV1';
const PARTY_SETTINGS_KEY='partyPocketPartySettingsV1';
const LIBRARY_KEY='partyPocketLibraryV1';
const PLAYTEST_KEY='partyPocketPlaytestV1';

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

export class LibraryStore{
  constructor(storage=globalThis.localStorage){this.storage=storage}
  state(){
    const raw=readJson(this.storage,LIBRARY_KEY,{favorites:[],recent:[]});
    return{
      favorites:Array.isArray(raw?.favorites)?[...new Set(raw.favorites.filter(Boolean))]:[],
      recent:Array.isArray(raw?.recent)?[...new Set(raw.recent.filter(Boolean))].slice(0,8):[]
    };
  }
  save(value){
    const state={
      favorites:[...new Set(value?.favorites||[])],
      recent:[...new Set(value?.recent||[])].slice(0,8)
    };
    this.storage?.setItem?.(LIBRARY_KEY,JSON.stringify(state));
    return state;
  }
  isFavorite(gameId){return this.state().favorites.includes(gameId)}
  toggleFavorite(gameId){
    const state=this.state();
    const favorites=state.favorites.includes(gameId)
      ?state.favorites.filter(id=>id!==gameId)
      :[gameId,...state.favorites];
    return this.save({...state,favorites});
  }
  touchRecent(gameId){
    const state=this.state();
    return this.save({...state,recent:[gameId,...state.recent.filter(id=>id!==gameId)]});
  }
  favorites(validIds=[]){
    const ids=this.state().favorites;
    return validIds.length?ids.filter(id=>validIds.includes(id)):ids;
  }
  recent(validIds=[]){
    const ids=this.state().recent;
    return validIds.length?ids.filter(id=>validIds.includes(id)):ids;
  }
}

function axis(value){
  const sum=Number(value?.sum)||0,count=Number(value?.count)||0;
  return{sum,count,average:count?sum/count:null};
}

function legacyReplaySeed(storage){
  const legacy=readJson(storage,RATING_KEY,{});
  const result={};
  if(!legacy||typeof legacy!=='object')return result;
  for(const [gameId,value] of Object.entries(legacy)){
    const good=Number(value?.good)||0,neutral=Number(value?.neutral)||0,bad=Number(value?.bad)||0;
    const count=good+neutral+bad;
    if(!count)continue;
    result[gameId]={
      responses:0,
      legacyResponses:count,
      fun:{sum:0,count:0},
      clarity:{sum:0,count:0},
      brain:{sum:0,count:0},
      replay:{sum:good*5+neutral*3+bad,count}
    };
  }
  return result;
}

export class PlaytestStore{
  constructor(storage=globalThis.localStorage){this.storage=storage}
  all(){
    const existing=readJson(this.storage,PLAYTEST_KEY,null);
    if(existing&&typeof existing==='object')return existing;
    const seeded=legacyReplaySeed(this.storage);
    this.storage?.setItem?.(PLAYTEST_KEY,JSON.stringify(seeded));
    return seeded;
  }
  normalized(gameId){
    const raw=this.all()[gameId]||{};
    return{
      responses:Number(raw.responses)||0,
      legacyResponses:Number(raw.legacyResponses)||0,
      fun:axis(raw.fun),
      clarity:axis(raw.clarity),
      brain:axis(raw.brain),
      replay:axis(raw.replay)
    };
  }
  get(gameId){
    const value=this.normalized(gameId);
    const qualityValues=[value.fun.average,value.clarity.average,value.replay.average].filter(Number.isFinite);
    return{
      ...value,
      qualityAverage:qualityValues.length?qualityValues.reduce((a,b)=>a+b,0)/qualityValues.length:null,
      totalEvidence:Math.max(value.responses,value.legacyResponses)
    };
  }
  submit(gameId,scores){
    const fields=['fun','clarity','brain','replay'];
    for(const field of fields){
      const n=Number(scores?.[field]);
      if(!Number.isInteger(n)||n<1||n>5)throw new Error('playtest scores must be 1-5');
    }
    const all=this.all(),current=this.normalized(gameId);
    for(const field of fields){
      current[field]={sum:current[field].sum+Number(scores[field]),count:current[field].count+1};
    }
    current.responses+=1;
    all[gameId]={
      responses:current.responses,
      legacyResponses:current.legacyResponses,
      fun:{sum:current.fun.sum,count:current.fun.count},
      clarity:{sum:current.clarity.sum,count:current.clarity.count},
      brain:{sum:current.brain.sum,count:current.brain.count},
      replay:{sum:current.replay.sum,count:current.replay.count}
    };
    this.storage?.setItem?.(PLAYTEST_KEY,JSON.stringify(all));
    return this.get(gameId);
  }
  report(validGameIds=[]){
    return validGameIds.map(gameId=>({gameId,...this.get(gameId)}));
  }
}
