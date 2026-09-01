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
function normalizeAxes(raw={}){
  const axes={};
  for(const id of ['fun','clarity','brain','replay']){
    const value=Number(raw?.[id]);
    axes[id]=Number.isFinite(value)?value:null;
  }
  return axes;
}
function normalizeCohort(raw={}){
  const mode=raw?.mode==='single'||raw?.mode==='party'?raw.mode:null;
  const difficulty=['easy','normal','hard'].includes(raw?.difficulty)?raw.difficulty:null;
  return{mode,difficulty,label:cleanText(raw?.label,40)||'All reviews'};
}
function normalizeBaseline(raw){
  if(!raw||typeof raw!=='object')return null;
  const startedAt=Number(raw.startedAt)||0,count=Math.max(0,Number(raw.count)||0);
  return{
    startedAt,
    cohort:normalizeCohort(raw.cohort),
    count,
    axes:normalizeAxes(raw.axes),
    quality:Number.isFinite(Number(raw.quality))?Number(raw.quality):null
  };
}
function normalizeResult(raw){
  if(!raw||typeof raw!=='object')return null;
  const outcome=['collecting','improved','flat','worse'].includes(raw.outcome)?raw.outcome:'collecting';
  return{
    outcome,
    ready:Boolean(raw.ready),
    cohort:normalizeCohort(raw.cohort),
    baselineCount:Math.max(0,Number(raw.baselineCount)||0),
    afterCount:Math.max(0,Number(raw.afterCount)||0),
    beforeQuality:Number.isFinite(Number(raw.beforeQuality))?Number(raw.beforeQuality):null,
    afterQuality:Number.isFinite(Number(raw.afterQuality))?Number(raw.afterQuality):null,
    qualityDelta:Number.isFinite(Number(raw.qualityDelta))?Number(raw.qualityDelta):null,
    axes:Array.isArray(raw.axes)?raw.axes.map(row=>({
      id:cleanText(row?.id,20),
      before:Number.isFinite(Number(row?.before))?Number(row.before):null,
      after:Number.isFinite(Number(row?.after))?Number(row.after):null,
      delta:Number.isFinite(Number(row?.delta))?Number(row.delta):null
    })).filter(row=>row.id):[]
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
    testingStartedAt:status==='planned'?0:(Number(item.testingStartedAt)||0),
    baseline:status==='planned'?null:normalizeBaseline(item.baseline),
    finalResult:status==='done'?normalizeResult(item.finalResult):null,
    completedAt:status==='done'?(Number(item.completedAt)||updatedAt):0
  };
}

export class ImprovementQueueStore{
  constructor(storage=globalThis.localStorage,now=()=>Date.now()){this.storage=storage;this.now=now}
  all(validGameIds=[]){
    const allowed=validGameIds.length?new Set(validGameIds):null;
    const raw=readJson(this.storage,KEY,[]);
    return (Array.isArray(raw)?raw:[])
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
      updated=normalize({
        ...item,
        title:patch.title??item.title,
        note:patch.note??item.note,
        status:patch.status??item.status,
        testingStartedAt:patch.testingStartedAt??item.testingStartedAt,
        baseline:patch.baseline??item.baseline,
        finalResult:patch.finalResult??item.finalResult,
        updatedAt:now,
        completedAt:patch.completedAt??item.completedAt
      });
      return updated;
    });
    this.save(next);
    return updated;
  }
  startTesting(id,baseline){
    const now=this.now();
    return this.update(id,{
      status:'testing',
      testingStartedAt:Number(baseline?.startedAt)||now,
      baseline,
      finalResult:null,
      completedAt:0
    });
  }
  complete(id,result){
    const now=this.now();
    return this.update(id,{status:'done',finalResult:result,completedAt:now});
  }
  reset(id){
    return this.update(id,{status:'planned',testingStartedAt:0,baseline:null,finalResult:null,completedAt:0});
  }
  cycle(id){
    const item=this.all().find(row=>row.id===id);if(!item)return null;
    if(item.status==='planned')return this.update(id,{status:'testing',testingStartedAt:this.now()});
    if(item.status==='testing')return this.complete(id,null);
    return this.reset(id);
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
