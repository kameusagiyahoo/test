const KEY='partyPocketImprovementQueueV1';
const MAX_PER_GAME=5;
export const IMPROVEMENT_STATUSES=['planned','testing','done'];

function readJson(storage,key,fallback){
  try{const raw=storage?.getItem?.(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}
function cleanText(value,max=240){return String(value||'').trim().slice(0,max)}
function normalizeSource(source={}){
  const kind=['health','context','manual'].includes(source?.kind)?source.kind:'manual';
  return{
    kind,
    key:cleanText(source?.key,120),
    detail:cleanText(source?.detail,240),
    action:cleanText(source?.action,240)
  };
}
function normalize(item){
  if(!item||typeof item!=='object'||!item.gameId)return null;
  const title=cleanText(item.title,80);if(!title)return null;
  const status=IMPROVEMENT_STATUSES.includes(item.status)?item.status:'planned';
  const createdAt=Number(item.createdAt)||0,updatedAt=Number(item.updatedAt)||createdAt;
  return{
    id:cleanText(item.id,120)||('experiment-'+createdAt),
    gameId:cleanText(item.gameId,80),
    title,
    note:cleanText(item.note,500),
    source:normalizeSource(item.source),
    status,
    createdAt,
    updatedAt,
    completedAt:status==='done'?(Number(item.completedAt)||updatedAt):0
  };
}

export class ImprovementQueueStore{
  constructor(storage=globalThis.localStorage,now=()=>Date.now()){this.storage=storage;this.now=now}
  all(validGameIds=[]){
    const allowed=validGameIds.length?new Set(validGameIds):null;
    return (Array.isArray(readJson(this.storage,KEY,[]))?readJson(this.storage,KEY,[]):[])
      .map(normalize).filter(Boolean)
      .filter(item=>!allowed||allowed.has(item.gameId))
      .sort((a,b)=>{
        const order={testing:0,planned:1,done:2};
        return order[a.status]-order[b.status]||b.updatedAt-a.updatedAt;
      });
  }
  save(items){
    const normalized=(Array.isArray(items)?items:[]).map(normalize).filter(Boolean);
    this.storage?.setItem?.(KEY,JSON.stringify(normalized));
    return normalized;
  }
  forGame(gameId){return this.all().filter(item=>item.gameId===gameId)}
  add({gameId,title,note='',source={kind:'manual'}}){
    const now=this.now(),all=this.all(),existing=this.forGame(gameId);
    const normalizedSource=normalizeSource(source);
    if(normalizedSource.key){
      const duplicate=existing.find(item=>item.source.kind===normalizedSource.kind&&item.source.key===normalizedSource.key);
      if(duplicate)return{item:duplicate,created:false};
    }
    const item=normalize({
      id:'experiment-'+now+'-'+Math.random().toString(36).slice(2,7),
      gameId,title,note,source:normalizedSource,status:'planned',createdAt:now,updatedAt:now
    });
    if(!item)throw new Error('invalid improvement experiment');
    const sameGame=all.filter(row=>row.gameId===gameId);
    let next=all;
    if(sameGame.length>=MAX_PER_GAME){
      const removable=[...sameGame].sort((a,b)=>{
        if(a.status==='done'&&b.status!=='done')return-1;
        if(b.status==='done'&&a.status!=='done')return 1;
        return a.updatedAt-b.updatedAt;
      })[0];
      next=all.filter(row=>row.id!==removable.id);
    }
    this.save([item,...next]);
    return{item,created:true};
  }
  update(id,patch={}){
    const now=this.now();let updated=null;
    const next=this.all().map(item=>{
      if(item.id!==id)return item;
      const status=IMPROVEMENT_STATUSES.includes(patch.status)?patch.status:item.status;
      updated=normalize({
        ...item,
        title:patch.title??item.title,
        note:patch.note??item.note,
        status,
        updatedAt:now,
        completedAt:status==='done'?(item.completedAt||now):0
      });
      return updated;
    });
    this.save(next);
    return updated;
  }
  cycle(id){
    const item=this.all().find(row=>row.id===id);if(!item)return null;
    const index=IMPROVEMENT_STATUSES.indexOf(item.status);
    return this.update(id,{status:IMPROVEMENT_STATUSES[(index+1)%IMPROVEMENT_STATUSES.length]});
  }
  remove(id){
    const next=this.all().filter(item=>item.id!==id);
    this.save(next);return next;
  }
  summary(validGameIds=[]){
    const rows=this.all(validGameIds);
    return{
      total:rows.length,
      planned:rows.filter(row=>row.status==='planned').length,
      testing:rows.filter(row=>row.status==='testing').length,
      done:rows.filter(row=>row.status==='done').length,
      games:new Set(rows.map(row=>row.gameId)).size
    };
  }
}

export function experimentStatusLabel(status){
  return status==='testing'?'TESTING':status==='done'?'DONE':'PLANNED';
}

export const IMPROVEMENT_LIMIT_PER_GAME=MAX_PER_GAME;
