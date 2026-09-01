const KEY='partyPocketPlaytestEventsV1';
const MAX_EVENTS=300;
const AXES=['fun','clarity','brain','replay'];
const DIFFICULTIES=['easy','normal','hard'];

function readJson(storage,key,fallback){
  try{const raw=storage?.getItem?.(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}
function normalizeScores(scores){
  const value={};
  for(const axis of AXES){
    const n=Number(scores?.[axis]);
    if(!Number.isInteger(n)||n<1||n>5)return null;
    value[axis]=n;
  }
  return value;
}
function normalizeEvent(event){
  if(!event||typeof event!=='object'||!event.gameId)return null;
  const scores=normalizeScores(event.scores);if(!scores)return null;
  const playerCount=Math.max(1,Math.min(8,Number(event.playerCount)||1));
  return{
    gameId:String(event.gameId),
    scores,
    mode:event.mode==='party'?'party':'single',
    playerCount,
    difficulty:DIFFICULTIES.includes(event.difficulty)?event.difficulty:null,
    at:Number(event.at)||Date.now()
  };
}
function average(events,axis){
  if(!events.length)return null;
  return events.reduce((sum,event)=>sum+event.scores[axis],0)/events.length;
}

export class PlaytestEventStore{
  constructor(storage=globalThis.localStorage,now=()=>Date.now()){this.storage=storage;this.now=now}
  all(validGameIds=[]){
    const allowed=validGameIds.length?new Set(validGameIds):null;
    const raw=readJson(this.storage,KEY,[]);
    return (Array.isArray(raw)?raw:[])
      .map(normalizeEvent)
      .filter(Boolean)
      .filter(event=>!allowed||allowed.has(event.gameId))
      .sort((a,b)=>b.at-a.at)
      .slice(0,MAX_EVENTS);
  }
  record(gameId,scores,{mode='single',playerCount=1,difficulty=null,at}={}){
    const event=normalizeEvent({gameId,scores,mode,playerCount,difficulty,at:at??this.now()});
    if(!event)throw new Error('invalid playtest event');
    const next=[event,...this.all()].slice(0,MAX_EVENTS);
    this.storage?.setItem?.(KEY,JSON.stringify(next));
    return event;
  }
  forGame(gameId){return this.all().filter(event=>event.gameId===gameId)}
  clear(){this.storage?.setItem?.(KEY,'[]')}
}

export function buildPlaytestTimeline(gameId,events=[],{
  now=Date.now(),
  windowDays=30
}={}){
  const day=86400000,window=Math.max(1,Number(windowDays)||30)*day;
  const rows=(Array.isArray(events)?events:[])
    .map(normalizeEvent)
    .filter(Boolean)
    .filter(event=>event.gameId===gameId)
    .sort((a,b)=>b.at-a.at);
  const current=rows.filter(event=>event.at>=now-window&&event.at<=now);
  const previous=rows.filter(event=>event.at>=now-window*2&&event.at<now-window);
  const axes=AXES.map(id=>{
    const currentAverage=average(current,id),previousAverage=average(previous,id);
    return{
      id,
      currentAverage,
      previousAverage,
      delta:Number.isFinite(currentAverage)&&Number.isFinite(previousAverage)?currentAverage-previousAverage:null
    };
  });
  const modes={
    single:rows.filter(event=>event.mode==='single').length,
    party:rows.filter(event=>event.mode==='party').length
  };
  const counts=new Map();
  for(const event of rows)counts.set(event.playerCount,(counts.get(event.playerCount)||0)+1);
  return{
    gameId,
    total:rows.length,
    currentCount:current.length,
    previousCount:previous.length,
    axes,
    modes,
    playerCounts:[...counts.entries()].map(([playerCount,count])=>({playerCount,count})).sort((a,b)=>a.playerCount-b.playerCount),
    recent:rows.slice(0,8)
  };
}

function aggregateSegment(id,label,events=[]){
  const rows=Array.isArray(events)?events:[];
  return{
    id,label,count:rows.length,
    axes:AXES.map(axis=>({id:axis,average:average(rows,axis)}))
  };
}

export function buildPlaytestSegments(gameId,events=[]){
  const rows=(Array.isArray(events)?events:[])
    .map(normalizeEvent)
    .filter(Boolean)
    .filter(event=>event.gameId===gameId);

  const modeSegments=[
    aggregateSegment('single','Single',rows.filter(event=>event.mode==='single')),
    aggregateSegment('party','Party',rows.filter(event=>event.mode==='party'))
  ];

  const difficultySegments=DIFFICULTIES.map(level=>
    aggregateSegment(level,level[0].toUpperCase()+level.slice(1),rows.filter(event=>event.difficulty===level))
  );

  return{gameId,total:rows.length,modeSegments,difficultySegments};
}

function axisValue(segment,axis){
  return segment?.axes?.find(row=>row.id===axis)?.average;
}

export function contextualPlaytestSignals(segments,{minCount=2,minGap=1}={}){
  const signals=[];
  const modeEligible=(segments?.modeSegments||[]).filter(segment=>segment.count>=minCount);
  if(modeEligible.length===2){
    for(const axis of AXES){
      const a=modeEligible[0],b=modeEligible[1],av=axisValue(a,axis),bv=axisValue(b,axis);
      if(Number.isFinite(av)&&Number.isFinite(bv)&&Math.abs(av-bv)>=minGap){
        const high=av>bv?a:b,low=av>bv?b:a;
        signals.push({type:'mode',axis,high:high.id,low:low.id,gap:Math.abs(av-bv),highAverage:axisValue(high,axis),lowAverage:axisValue(low,axis)});
      }
    }
  }

  const difficultyEligible=(segments?.difficultySegments||[]).filter(segment=>segment.count>=minCount);
  if(difficultyEligible.length>=2){
    for(const axis of AXES){
      const values=difficultyEligible.map(segment=>({segment,value:axisValue(segment,axis)})).filter(row=>Number.isFinite(row.value));
      if(values.length<2)continue;
      values.sort((a,b)=>b.value-a.value);
      const high=values[0],low=values.at(-1),gap=high.value-low.value;
      if(gap>=minGap)signals.push({type:'difficulty',axis,high:high.segment.id,low:low.segment.id,gap,highAverage:high.value,lowAverage:low.value});
    }
  }
  return signals.sort((a,b)=>b.gap-a.gap);
}

export function timelineAxisTrend(timeline,axis){
  const row=timeline?.axes?.find(item=>item.id===axis);
  if(!row||!Number.isFinite(row.delta))return null;
  return row.delta;
}

export const PLAYTEST_EVENT_LIMIT=MAX_EVENTS;
