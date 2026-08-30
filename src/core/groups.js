const GROUPS_KEY='partyPocketPlayerGroupsV1';
const MAX_GROUPS=8;

function readJson(storage,key,fallback){
  try{const raw=storage?.getItem?.(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}

function normalizePlayers(players){
  if(!Array.isArray(players))return[];
  return players.map((name,i)=>String(name||'').trim()||('プレイヤー'+(i+1))).slice(0,8);
}

function normalizeGroup(group){
  if(!group||typeof group!=='object')return null;
  const name=String(group.name||'').trim().slice(0,24),players=normalizePlayers(group.players);
  if(!name||!players.length)return null;
  return{
    id:String(group.id||name),
    name,
    players,
    lastUsedAt:Number(group.lastUsedAt)||0,
    updatedAt:Number(group.updatedAt)||0
  };
}

export class PlayerGroupStore{
  constructor(storage=globalThis.localStorage,now=()=>Date.now()){this.storage=storage;this.now=now}
  all(){
    const raw=readJson(this.storage,GROUPS_KEY,[]);
    const values=(Array.isArray(raw)?raw:[]).map(normalizeGroup).filter(Boolean);
    const seen=new Set(),result=[];
    for(const group of values){
      const key=group.name.toLocaleLowerCase('ja');
      if(seen.has(key))continue;
      seen.add(key);result.push(group);
    }
    return result.slice(0,MAX_GROUPS);
  }
  save(name,players){
    const cleanName=String(name||'').trim().slice(0,24),cleanPlayers=normalizePlayers(players);
    if(!cleanName)throw new Error('group name required');
    if(!cleanPlayers.length)throw new Error('players required');
    const now=this.now(),groups=this.all(),key=cleanName.toLocaleLowerCase('ja');
    const existing=groups.find(g=>g.name.toLocaleLowerCase('ja')===key);
    const value={
      id:existing?.id||('group-'+now),
      name:cleanName,
      players:cleanPlayers,
      lastUsedAt:existing?.lastUsedAt||0,
      updatedAt:now
    };
    const next=existing
      ?groups.map(g=>g.id===existing.id?value:g)
      :[value,...groups].slice(0,MAX_GROUPS);
    this.storage?.setItem?.(GROUPS_KEY,JSON.stringify(next));
    return value;
  }
  remove(id){
    const groups=this.all().filter(g=>g.id!==id);
    this.storage?.setItem?.(GROUPS_KEY,JSON.stringify(groups));
    return groups;
  }
  touch(id){
    const now=this.now(),groups=this.all();
    const next=groups.map(g=>g.id===id?{...g,lastUsedAt:now}:g);
    this.storage?.setItem?.(GROUPS_KEY,JSON.stringify(next));
    return next.find(g=>g.id===id)||null;
  }
  get(id){return this.all().find(g=>g.id===id)||null}
  recent(){
    return [...this.all()].sort((a,b)=>b.lastUsedAt-a.lastUsedAt||b.updatedAt-a.updatedAt);
  }
}

export function samePlayers(a,b){
  const aa=normalizePlayers(a),bb=normalizePlayers(b);
  return aa.length===bb.length&&aa.every((name,i)=>name===bb[i]);
}

export const PLAYER_GROUP_LIMIT=MAX_GROUPS;
