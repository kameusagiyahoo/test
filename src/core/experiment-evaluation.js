const AXES=['fun','clarity','brain','replay'];
const QUALITY_AXES=['fun','clarity','replay'];

function average(events,axis){
  if(!events.length)return null;
  return events.reduce((sum,event)=>sum+Number(event.scores?.[axis]||0),0)/events.length;
}

export function experimentCohort(source={}){
  if(source?.kind!=='context'||!source?.key)return{mode:null,difficulty:null,label:'All reviews'};
  const parts=String(source.key).split(':');
  if(parts[0]!=='context')return{mode:null,difficulty:null,label:'All reviews'};
  const type=parts[1],low=parts.at(-1);
  if(type==='mode'&&(low==='single'||low==='party')){
    return{mode:low,difficulty:null,label:low==='party'?'Party':'Single'};
  }
  if(type==='difficulty'&&['easy','normal','hard'].includes(low)){
    const label=low[0].toUpperCase()+low.slice(1);
    return{mode:'single',difficulty:low,label};
  }
  return{mode:null,difficulty:null,label:'All reviews'};
}

function matchCohort(event,cohort){
  if(cohort?.mode&&event.mode!==cohort.mode)return false;
  if(cohort?.difficulty&&event.difficulty!==cohort.difficulty)return false;
  return true;
}

function summarize(events=[]){
  const rows=Array.isArray(events)?events:[];
  return{
    count:rows.length,
    axes:Object.fromEntries(AXES.map(axis=>[axis,average(rows,axis)])),
    quality:rows.length?QUALITY_AXES.reduce((sum,axis)=>sum+average(rows,axis),0)/QUALITY_AXES.length:null
  };
}

export function buildExperimentBaseline(source,events=[],startedAt=Date.now(),{maxReviews=10}={}){
  const cohort=experimentCohort(source);
  const rows=(Array.isArray(events)?events:[])
    .filter(event=>Number(event?.at)<startedAt)
    .filter(event=>matchCohort(event,cohort))
    .sort((a,b)=>Number(b.at)-Number(a.at))
    .slice(0,Math.max(1,Number(maxReviews)||10));
  return{
    startedAt,
    cohort,
    ...summarize(rows)
  };
}

export function evaluateExperiment(experiment,events=[],{minBaseline=2,minAfter=3}={}){
  const baseline=experiment?.baseline||null;
  const startedAt=Number(experiment?.testingStartedAt)||Number(baseline?.startedAt)||0;
  const cohort=baseline?.cohort||experimentCohort(experiment?.source);
  const afterRows=(Array.isArray(events)?events:[])
    .filter(event=>Number(event?.at)>=startedAt)
    .filter(event=>matchCohort(event,cohort))
    .sort((a,b)=>Number(a.at)-Number(b.at));
  const after=summarize(afterRows);
  const baselineCount=Number(baseline?.count)||0;
  const ready=baselineCount>=minBaseline&&after.count>=minAfter;
  const axes=AXES.map(axis=>{
    const before=baseline?.axes?.[axis],current=after.axes[axis];
    return{
      id:axis,
      before:Number.isFinite(before)?before:null,
      after:Number.isFinite(current)?current:null,
      delta:Number.isFinite(before)&&Number.isFinite(current)?current-before:null
    };
  });
  const beforeQuality=Number.isFinite(baseline?.quality)?baseline.quality:null;
  const afterQuality=Number.isFinite(after.quality)?after.quality:null;
  const qualityDelta=Number.isFinite(beforeQuality)&&Number.isFinite(afterQuality)?afterQuality-beforeQuality:null;
  const outcome=!ready?'collecting':qualityDelta>=0.5?'improved':qualityDelta<=-0.5?'worse':'flat';
  return{
    ready,
    outcome,
    cohort,
    baselineCount,
    afterCount:after.count,
    beforeQuality,
    afterQuality,
    qualityDelta,
    axes
  };
}

export function experimentOutcomeLabel(value){
  return value==='improved'?'IMPROVED':value==='worse'?'WORSE':value==='flat'?'FLAT':'COLLECTING';
}
