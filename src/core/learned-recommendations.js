function safeDelta(value){return Number.isFinite(Number(value))?Number(value):null}

function parseSource(source={}){
  const kind=source?.kind||'manual',key=String(source?.key||'');
  if(kind==='health'){
    const parts=key.split(':');
    return{kind,key,type:parts[1]||'',axis:parts[1]||'',high:'',low:''};
  }
  if(kind==='context'){
    const parts=key.split(':');
    return{kind,key,type:parts[1]||'',axis:parts[2]||'',high:parts[3]||'',low:parts[4]||''};
  }
  return{kind,key,type:'',axis:'',high:'',low:''};
}

function completedOutcome(item){
  const result=item?.finalResult;
  if(item?.status!=='done'||!result?.ready)return null;
  return['improved','flat','worse'].includes(result.outcome)?result.outcome:null;
}

function similarity(need,item){
  const a=parseSource(need),b=parseSource(item?.source);
  let score=0;
  if(a.key&&b.key&&a.key===b.key)score+=10;
  if(a.kind===b.kind)score+=2;
  if(a.kind==='health'&&b.kind==='health'&&a.type&&a.type===b.type)score+=4;
  if(a.kind==='context'&&b.kind==='context'){
    if(a.type&&a.type===b.type)score+=2;
    if(a.axis&&a.axis===b.axis)score+=5;
    if(a.low&&a.low===b.low)score+=2;
    if(a.high&&a.high===b.high)score+=1;
  }
  return score;
}

function evidence(item,need,gameId){
  const delta=safeDelta(item?.finalResult?.qualityDelta),base=similarity(need,item);
  const sameGame=item?.gameId===gameId;
  const score=base+(sameGame?3:0)+(Number.isFinite(delta)?Math.min(3,Math.abs(delta)*2):0);
  return{
    originId:item.id,
    originGameId:item.gameId,
    title:item.title,
    note:item.note||'',
    source:item.source||{},
    matchedNeed:need,
    outcome:item.finalResult.outcome,
    qualityDelta:delta,
    cohort:item.finalResult?.cohort?.label||'All reviews',
    sameGame,
    score
  };
}

export function healthNeed(issue={}){
  const type=issue.type||issue.title||'unknown';
  return{
    kind:'health',
    key:'health:'+type,
    title:issue.title||String(type),
    detail:issue.detail||'',
    action:issue.action||''
  };
}

export function contextNeed(signal={},title=''){
  return{
    kind:'context',
    key:['context',signal.type,signal.axis,signal.high,signal.low].join(':'),
    title:title||signal.axis||'Context signal',
    detail:title||'',
    action:'該当コンテキストのルール・説明・難易度を調整して再評価する'
  };
}

export function buildLearnedRecommendations(gameId,needs=[],items=[],{limit=3,minSimilarity=5}={}){
  const validNeeds=(Array.isArray(needs)?needs:[]).filter(need=>need?.kind&&need?.key);
  const completed=(Array.isArray(items)?items:[]).filter(item=>completedOutcome(item));
  const rows=[];
  for(const need of validNeeds){
    for(const item of completed){
      const base=similarity(need,item);
      if(base<minSimilarity)continue;
      rows.push(evidence(item,need,gameId));
    }
  }

  const dedupe=rows=>{
    const seen=new Set();
    return rows.filter(row=>{
      const key=row.originId+'|'+row.matchedNeed.key;
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
  };

  const recommendations=dedupe(rows.filter(row=>row.outcome==='improved'))
    .sort((a,b)=>b.score-a.score||(b.qualityDelta??-Infinity)-(a.qualityDelta??-Infinity))
    .slice(0,limit);
  const cautions=dedupe(rows.filter(row=>row.outcome==='worse'))
    .sort((a,b)=>b.score-a.score||(a.qualityDelta??Infinity)-(b.qualityDelta??Infinity))
    .slice(0,limit);

  return{
    gameId,
    needs:validNeeds,
    recommendations,
    cautions,
    evidenceCount:completed.length
  };
}

export function learnedRecommendationLabel(row){
  const delta=Number.isFinite(row?.qualityDelta)?(row.qualityDelta>0?'+':'')+row.qualityDelta.toFixed(1):'—';
  return row?.outcome==='worse'?'過去に悪化 · Quality '+delta:'過去に改善 · Quality '+delta;
}
