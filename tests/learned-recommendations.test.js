import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLearnedRecommendations,contextNeed,healthNeed,learnedRecommendationLabel
} from '../src/core/learned-recommendations.js';

function done({
  id='e1',gameId='code',kind='health',key='health:clarity',
  title='説明を短くする',outcome='improved',delta=.8,note=''
}={}){
  return{
    id,gameId,title,note,status:'done',
    source:{kind,key,detail:'detail',action:'action'},
    finalResult:{ready:true,outcome,qualityDelta:delta,cohort:{label:'All reviews'}}
  };
}

test('matching successful health experiment becomes a reuse recommendation',()=>{
  const need=healthNeed({type:'clarity',title:'分かりやすさ低下'});
  const report=buildLearnedRecommendations('gate',[need],[done()]);
  assert.equal(report.recommendations.length,1);
  assert.equal(report.recommendations[0].originId,'e1');
  assert.equal(report.recommendations[0].outcome,'improved');
  assert.equal(report.cautions.length,0);
});

test('worse matching experiment becomes an avoid caution instead of reuse',()=>{
  const need=healthNeed({type:'clarity'});
  const report=buildLearnedRecommendations('code',[need],[done({outcome:'worse',delta:-.9})]);
  assert.equal(report.recommendations.length,0);
  assert.equal(report.cautions.length,1);
  assert.match(learnedRecommendationLabel(report.cautions[0]),/過去に悪化/);
});

test('unrelated health types do not create recommendations',()=>{
  const need=healthNeed({type:'fun'});
  const report=buildLearnedRecommendations('gate',[need],[done({key:'health:clarity'})]);
  assert.deepEqual(report.recommendations,[]);
  assert.deepEqual(report.cautions,[]);
});

test('context recommendation can reuse same axis evidence across contexts',()=>{
  const need=contextNeed({type:'difficulty',axis:'replay',high:'easy',low:'hard'},'Hard replay low');
  const item=done({
    kind:'context',key:'context:mode:replay:single:party',
    title:'Party説明を短くする'
  });
  const report=buildLearnedRecommendations('gate',[need],[item]);
  assert.equal(report.recommendations.length,1);
  assert.equal(report.recommendations[0].matchedNeed.key,'context:difficulty:replay:easy:hard');
});

test('same-game evidence outranks equivalent cross-game evidence',()=>{
  const need=healthNeed({type:'clarity'});
  const rows=[
    done({id:'cross',gameId:'gate',delta:1.1}),
    done({id:'same',gameId:'code',delta:.6})
  ];
  const report=buildLearnedRecommendations('code',[need],rows);
  assert.equal(report.recommendations[0].originId,'same');
});

test('planned testing flat and unevaluated experiments are not recommended',()=>{
  const need=healthNeed({type:'clarity'});
  const planned={...done({id:'planned'}),status:'planned'};
  const testing={...done({id:'testing'}),status:'testing'};
  const flat=done({id:'flat',outcome:'flat',delta:.1});
  const noResult={...done({id:'none'}),finalResult:null};
  const report=buildLearnedRecommendations('code',[need],[planned,testing,flat,noResult]);
  assert.deepEqual(report.recommendations,[]);
  assert.deepEqual(report.cautions,[]);
  assert.equal(report.evidenceCount,1);
});

test('limit caps recommendations after relevance sorting',()=>{
  const need=healthNeed({type:'clarity'});
  const items=Array.from({length:6},(_,i)=>done({id:'e'+i,gameId:i%2?'gate':'code',delta:.5+i/10}));
  const report=buildLearnedRecommendations('code',[need],items,{limit:2});
  assert.equal(report.recommendations.length,2);
});

test('need helpers build source keys compatible with improvement queue',()=>{
  assert.equal(healthNeed({type:'replay'}).key,'health:replay');
  assert.equal(
    contextNeed({type:'mode',axis:'clarity',high:'single',low:'party'}).key,
    'context:mode:clarity:single:party'
  );
});
