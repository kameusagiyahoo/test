const SOURCES=['health','context','manual'];
const OUTCOMES=['improved','flat','worse'];

function safeDelta(value){return Number.isFinite(Number(value))?Number(value):null}

function outcomeOf(item){
  const result=item?.finalResult;
  return item?.status==='done'&&result?.ready&&OUTCOMES.includes(result.outcome)?result.outcome:null;
}

function sourceOf(item){return SOURCES.includes(item?.source?.kind)?item.source.kind:'manual'}

function aggregateRows(rows=[]){
  const completed=rows.filter(item=>outcomeOf(item));
  const improved=completed.filter(item=>outcomeOf(item)==='improved').length;
  const flat=completed.filter(item=>outcomeOf(item)==='flat').length;
  const worse=completed.filter(item=>outcomeOf(item)==='worse').length;
  const deltas=completed.map(item=>safeDelta(item.finalResult?.qualityDelta)).filter(Number.isFinite);
  return{
    completed:completed.length,
    improved,flat,worse,
    successRate:completed.length?improved/completed.length:null,
    averageQualityDelta:deltas.length?deltas.reduce((sum,value)=>sum+value,0)/deltas.length:null
  };
}

export function buildExperimentLearnings(items=[]){
  const rows=(Array.isArray(items)?items:[]).filter(item=>item&&item.gameId);
  const completed=rows.filter(item=>outcomeOf(item));

  const games=[...new Set(completed.map(item=>item.gameId))].map(gameId=>{
    const gameRows=completed.filter(item=>item.gameId===gameId);
    return{gameId,...aggregateRows(gameRows)};
  }).sort((a,b)=>
    b.improved-a.improved||
    (b.averageQualityDelta??-Infinity)-(a.averageQualityDelta??-Infinity)||
    b.completed-a.completed||
    a.gameId.localeCompare(b.gameId)
  );

  const sources=SOURCES.map(source=>{
    const sourceRows=completed.filter(item=>sourceOf(item)===source);
    return{source,...aggregateRows(sourceRows)};
  });

  const ready=completed.map(item=>({
    id:item.id,
    gameId:item.gameId,
    title:item.title,
    source:sourceOf(item),
    cohort:item.finalResult?.cohort?.label||'All reviews',
    outcome:item.finalResult.outcome,
    qualityDelta:safeDelta(item.finalResult.qualityDelta),
    completedAt:Number(item.completedAt)||0,
    axes:Array.isArray(item.finalResult?.axes)?item.finalResult.axes:[],
    note:item.note||''
  }));

  const wins=ready.filter(row=>row.outcome==='improved')
    .sort((a,b)=>(b.qualityDelta??-Infinity)-(a.qualityDelta??-Infinity)||b.completedAt-a.completedAt);
  const misses=ready.filter(row=>row.outcome==='worse')
    .sort((a,b)=>(a.qualityDelta??Infinity)-(b.qualityDelta??Infinity)||b.completedAt-a.completedAt);
  const flats=ready.filter(row=>row.outcome==='flat')
    .sort((a,b)=>b.completedAt-a.completedAt);

  return{
    ...aggregateRows(completed),
    games,
    sources,
    wins,
    misses,
    flats,
    totalQueue:rows.length,
    doneWithoutResult:rows.filter(item=>item.status==='done'&&!outcomeOf(item)).length
  };
}

export function experimentSourceLabel(source){
  return source==='health'?'Health':source==='context'?'Context':'Manual';
}
