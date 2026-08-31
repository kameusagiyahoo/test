const KEY='partyPocketSavedPartiesV1';
const MAX_SAVED=8;

function readJson(storage,key,fallback){
  try{const raw=storage?.getItem?.(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}
function cleanSchedule(schedule){
  return Array.isArray(schedule)?schedule.map(String).filter(Boolean).slice(0,24):[];
}
function normalize(value){
  if(!value||typeof value!=='object')return null;
  const name=String(value.name||'').trim().slice(0,32);
  const schedule=cleanSchedule(value.schedule);
  if(!name||schedule.length<2)return null;
  return{
    id:String(value.id||name),
    name,
    schedule,
    createdAt:Number(value.createdAt)||0,
    updatedAt:Number(value.updatedAt)||0,
    lastUsedAt:Number(value.lastUsedAt)||0
  };
}

export class SavedPartyStore{
  constructor(storage=globalThis.localStorage,now=()=>Date.now()){this.storage=storage;this.now=now}
  all(validIds=[]){
    const valid=validIds.length?new Set(validIds):null;
    const raw=readJson(this.storage,KEY,[]);
    const seen=new Set(),result=[];
    for(const item of Array.isArray(raw)?raw:[]){
      const p=normalize(item);if(!p)continue;
      if(valid){
        p.schedule=p.schedule.filter(id=>valid.has(id));
        if(p.schedule.length<2)continue;
      }
      const key=p.name.toLocaleLowerCase('ja');
      if(seen.has(key))continue;
      seen.add(key);result.push(p);
    }
    return result.slice(0,MAX_SAVED);
  }
  save(name,schedule){
    const cleanName=String(name||'').trim().slice(0,32),clean=cleanSchedule(schedule);
    if(!cleanName)throw new Error('party name required');
    if(clean.length<2)throw new Error('party requires at least two games');
    const now=this.now(),items=this.all(),key=cleanName.toLocaleLowerCase('ja');
    const existing=items.find(p=>p.name.toLocaleLowerCase('ja')===key);
    const value={
      id:existing?.id||('party-'+now),
      name:cleanName,
      schedule:clean,
      createdAt:existing?.createdAt||now,
      updatedAt:now,
      lastUsedAt:existing?.lastUsedAt||0
    };
    const next=existing?items.map(p=>p.id===existing.id?value:p):[value,...items].slice(0,MAX_SAVED);
    this.storage?.setItem?.(KEY,JSON.stringify(next));
    return value;
  }
  get(id,validIds=[]){return this.all(validIds).find(p=>p.id===id)||null}
  touch(id){
    const now=this.now(),items=this.all();
    const next=items.map(p=>p.id===id?{...p,lastUsedAt:now}:p);
    this.storage?.setItem?.(KEY,JSON.stringify(next));
    return next.find(p=>p.id===id)||null;
  }
  remove(id){
    const next=this.all().filter(p=>p.id!==id);
    this.storage?.setItem?.(KEY,JSON.stringify(next));
    return next;
  }
  recent(validIds=[]){
    return [...this.all(validIds)].sort((a,b)=>b.lastUsedAt-a.lastUsedAt||b.updatedAt-a.updatedAt);
  }
}

export const SAVED_PARTY_LIMIT=MAX_SAVED;
