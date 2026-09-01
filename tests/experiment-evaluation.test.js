import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExperimentBaseline,evaluateExperiment,experimentCohort,experimentOutcomeLabel
} from '../src/core/experiment-evaluation.js';

const scores=(fun,clarity,brain,replay)=>({fun,clarity,brain,replay});

test('context experiment tracks the lower-rated mode only',()=>{
  assert.deepEqual(
    experimentCohort({kind:'context',key:'context:mode:clarity:single:party'}),
    {mode:'party',difficulty:null,label:'Party'}
  );
  assert.deepEqual(
    experimentCohort({kind:'context',key:'context:difficulty:replay:easy:hard'}),
    {mode:'single',difficulty:'hard',label:'Hard'}
  );
  assert.deepEqual(
    experimentCohort({kind:'health',key:'health:clarity'}),
    {mode:null,difficulty:null,label:'All reviews'}
  );
});

test('baseline uses only pre-start matching reviews and keeps at most ten newest',()=>{
  const events=[];
  for(let i=1;i<=12;i++){
    events.push({gameId:'code',mode:'party',playerCount:4,scores:scores(3,3,4,3),at:i});
  }
  events.push({gameId:'code',mode:'single',playerCount:2,scores:scores(5,5,2,5),at:11});
  events.push({gameId:'code',mode:'party',playerCount:4,scores:scores(5,5,4,5),at:20});
  const baseline=buildExperimentBaseline(
    {kind:'context',key:'context:mode:clarity:single:party'},
    events,
    15
  );
  assert.equal(baseline.count,10);
  assert.equal(baseline.cohort.mode,'party');
  assert.equal(baseline.axes.fun,3);
  assert.equal(baseline.quality,3);
});

test('experiment becomes improved with two baseline and three after reviews',()=>{
  const source={kind:'health',key:'health:clarity'};
  const before=[
    {mode:'single',scores:scores(3,2,5,3),at:1},
    {mode:'party',scores:scores(3,2,5,3),at:2}
  ];
  const baseline=buildExperimentBaseline(source,before,10);
  const experiment={source,testingStartedAt:10,baseline};
  const after=[
    {mode:'single',scores:scores(4,4,1,4),at:10},
    {mode:'party',scores:scores(4,4,1,4),at:11},
    {mode:'single',scores:scores(4,4,1,4),at:12}
  ];
  const result=evaluateExperiment(experiment,[...before,...after]);
  assert.equal(result.ready,true);
  assert.equal(result.outcome,'improved');
  assert.equal(result.baselineCount,2);
  assert.equal(result.afterCount,3);
  assert.equal(result.qualityDelta,4-(8/3));
  assert.equal(result.axes.find(a=>a.id==='brain').delta,-4);
});

test('brain load does not affect quality outcome',()=>{
  const source={kind:'manual'};
  const before=[
    {mode:'single',scores:scores(4,4,1,4),at:1},
    {mode:'single',scores:scores(4,4,1,4),at:2}
  ];
  const baseline=buildExperimentBaseline(source,before,10);
  const after=[
    {mode:'single',scores:scores(4,4,5,4),at:10},
    {mode:'single',scores:scores(4,4,5,4),at:11},
    {mode:'single',scores:scores(4,4,5,4),at:12}
  ];
  const result=evaluateExperiment({source,testingStartedAt:10,baseline},[...before,...after]);
  assert.equal(result.qualityDelta,0);
  assert.equal(result.outcome,'flat');
  assert.equal(result.axes.find(a=>a.id==='brain').delta,4);
});

test('context evaluation excludes unrelated after reviews',()=>{
  const source={kind:'context',key:'context:difficulty:replay:easy:hard'};
  const before=[
    {mode:'single',difficulty:'hard',scores:scores(3,3,5,2),at:1},
    {mode:'single',difficulty:'hard',scores:scores(3,3,5,2),at:2}
  ];
  const baseline=buildExperimentBaseline(source,before,10);
  const after=[
    {mode:'single',difficulty:'hard',scores:scores(4,4,5,4),at:10},
    {mode:'single',difficulty:'hard',scores:scores(4,4,5,4),at:11},
    {mode:'single',difficulty:'hard',scores:scores(4,4,5,4),at:12},
    {mode:'single',difficulty:'easy',scores:scores(1,1,1,1),at:13},
    {mode:'party',difficulty:null,scores:scores(1,1,1,1),at:14}
  ];
  const result=evaluateExperiment({source,testingStartedAt:10,baseline},[...before,...after]);
  assert.equal(result.afterCount,3);
  assert.equal(result.outcome,'improved');
  assert.equal(result.cohort.difficulty,'hard');
});

test('insufficient evidence stays collecting rather than guessing',()=>{
  const source={kind:'manual'};
  const baseline=buildExperimentBaseline(source,[
    {mode:'single',scores:scores(3,3,3,3),at:1}
  ],10);
  const result=evaluateExperiment({source,testingStartedAt:10,baseline},[
    {mode:'single',scores:scores(3,3,3,3),at:1},
    {mode:'single',scores:scores(5,5,5,5),at:10},
    {mode:'single',scores:scores(5,5,5,5),at:11}
  ]);
  assert.equal(result.ready,false);
  assert.equal(result.outcome,'collecting');
  assert.equal(result.baselineCount,1);
  assert.equal(result.afterCount,2);
});

test('quality thresholds classify worse and flat at half-point boundaries',()=>{
  const base={source:{kind:'manual'},testingStartedAt:10,baseline:{
    startedAt:10,cohort:{mode:null,difficulty:null,label:'All reviews'},count:2,
    axes:{fun:4,clarity:4,brain:3,replay:4},quality:4
  }};
  const worse=evaluateExperiment(base,[
    {mode:'single',scores:scores(3,3,3,3),at:10},
    {mode:'single',scores:scores(3,3,3,3),at:11},
    {mode:'single',scores:scores(3,3,3,3),at:12}
  ]);
  assert.equal(worse.outcome,'worse');
  const flat=evaluateExperiment(base,[
    {mode:'single',scores:scores(4,4,3,3),at:10},
    {mode:'single',scores:scores(4,4,3,3),at:11},
    {mode:'single',scores:scores(4,4,3,3),at:12}
  ]);
  assert.equal(flat.outcome,'flat');
});

test('outcome labels are stable',()=>{
  assert.equal(experimentOutcomeLabel('improved'),'IMPROVED');
  assert.equal(experimentOutcomeLabel('worse'),'WORSE');
  assert.equal(experimentOutcomeLabel('flat'),'FLAT');
  assert.equal(experimentOutcomeLabel('collecting'),'COLLECTING');
});

test('exact plus and minus half quality deltas hit improved and worse boundaries',()=>{
  const baseline={
    startedAt:10,
    cohort:{mode:null,difficulty:null,label:'All reviews'},
    count:2,
    axes:{fun:3,clarity:3,brain:3,replay:3},
    quality:3
  };
  const experiment={source:{kind:'manual'},testingStartedAt:10,baseline};
  const improved=[
    event(11,scores(3.5,3.5,3,3.5)),
    event(12,scores(3.5,3.5,3,3.5)),
    event(13,scores(3.5,3.5,3,3.5))
  ];
  const worse=[
    event(11,scores(2.5,2.5,3,2.5)),
    event(12,scores(2.5,2.5,3,2.5)),
    event(13,scores(2.5,2.5,3,2.5))
  ];
  assert.equal(evaluateExperiment(experiment,improved).outcome,'improved');
  assert.equal(evaluateExperiment(experiment,worse).outcome,'worse');
});
