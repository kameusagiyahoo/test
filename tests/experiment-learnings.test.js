import test from 'node:test';
import assert from 'node:assert/strict';
import {buildExperimentLearnings,experimentSourceLabel} from '../src/core/experiment-learnings.js';

const done=(overrides={})=>({
  id:'x',gameId:'code',title:'Experiment',status:'done',source:{kind:'manual'},
  completedAt:10,
  finalResult:{
    ready:true,outcome:'improved',qualityDelta:1,
    cohort:{label:'All reviews'},axes:[]
  },
  ...overrides
});

test('learning summary only counts evaluated DONE experiments',()=>{
  const rows=[
    done({id:'a',finalResult:{ready:true,outcome:'improved',qualityDelta:1,cohort:{label:'All reviews'},axes:[]}}),
    done({id:'b',finalResult:{ready:true,outcome:'flat',qualityDelta:0.1,cohort:{label:'All reviews'},axes:[]}}),
    done({id:'c',finalResult:{ready:true,outcome:'worse',qualityDelta:-0.8,cohort:{label:'All reviews'},axes:[]}}),
    done({id:'legacy',finalResult:null}),
    {id:'testing',gameId:'code',title:'T',status:'testing',source:{kind:'health'},finalResult:null}
  ];
  const report=buildExperimentLearnings(rows);
  assert.equal(report.completed,3);
  assert.equal(report.improved,1);
  assert.equal(report.flat,1);
  assert.equal(report.worse,1);
  assert.equal(report.successRate,1/3);
  assert.equal(report.averageQualityDelta,(1+0.1-0.8)/3);
  assert.equal(report.doneWithoutResult,1);
});

test('source aggregation separates Health Context and Manual',()=>{
  const rows=[
    done({id:'h1',source:{kind:'health'},finalResult:{ready:true,outcome:'improved',qualityDelta:0.8,cohort:{label:'All reviews'},axes:[]}}),
    done({id:'h2',source:{kind:'health'},finalResult:{ready:true,outcome:'worse',qualityDelta:-0.6,cohort:{label:'All reviews'},axes:[]}}),
    done({id:'c1',source:{kind:'context'},finalResult:{ready:true,outcome:'improved',qualityDelta:1.2,cohort:{label:'Party'},axes:[]}}),
    done({id:'m1',source:{kind:'manual'},finalResult:{ready:true,outcome:'flat',qualityDelta:0.2,cohort:{label:'All reviews'},axes:[]}})
  ];
  const report=buildExperimentLearnings(rows);
  const health=report.sources.find(row=>row.source==='health');
  const context=report.sources.find(row=>row.source==='context');
  const manual=report.sources.find(row=>row.source==='manual');
  assert.deepEqual({completed:health.completed,improved:health.improved,worse:health.worse},{completed:2,improved:1,worse:1});
  assert.equal(context.improved,1);
  assert.equal(manual.flat,1);
});

test('game aggregation ranks by improved count then average delta',()=>{
  const rows=[
    done({id:'a1',gameId:'code',finalResult:{ready:true,outcome:'improved',qualityDelta:0.6,cohort:{label:'All reviews'},axes:[]}}),
    done({id:'a2',gameId:'code',finalResult:{ready:true,outcome:'improved',qualityDelta:0.8,cohort:{label:'All reviews'},axes:[]}}),
    done({id:'b1',gameId:'gate',finalResult:{ready:true,outcome:'improved',qualityDelta:1.5,cohort:{label:'All reviews'},axes:[]}})
  ];
  const report=buildExperimentLearnings(rows);
  assert.equal(report.games[0].gameId,'code');
  assert.equal(report.games[0].improved,2);
  assert.equal(report.games[1].gameId,'gate');
});

test('worked and worse lists sort by strongest effect',()=>{
  const rows=[
    done({id:'w1',title:'small win',finalResult:{ready:true,outcome:'improved',qualityDelta:0.6,cohort:{label:'All reviews'},axes:[]}}),
    done({id:'w2',title:'big win',finalResult:{ready:true,outcome:'improved',qualityDelta:1.4,cohort:{label:'All reviews'},axes:[]}}),
    done({id:'l1',title:'small loss',finalResult:{ready:true,outcome:'worse',qualityDelta:-0.6,cohort:{label:'All reviews'},axes:[]}}),
    done({id:'l2',title:'big loss',finalResult:{ready:true,outcome:'worse',qualityDelta:-1.3,cohort:{label:'All reviews'},axes:[]}})
  ];
  const report=buildExperimentLearnings(rows);
  assert.equal(report.wins[0].title,'big win');
  assert.equal(report.misses[0].title,'big loss');
});

test('learning rows preserve cohort source note and final axis details',()=>{
  const item=done({
    source:{kind:'context'},
    note:'keep this',
    finalResult:{
      ready:true,outcome:'improved',qualityDelta:0.9,
      cohort:{label:'Hard'},axes:[{id:'replay',delta:1.2}]
    }
  });
  const row=buildExperimentLearnings([item]).wins[0];
  assert.equal(row.source,'context');
  assert.equal(row.cohort,'Hard');
  assert.equal(row.note,'keep this');
  assert.deepEqual(row.axes,[{id:'replay',delta:1.2}]);
});

test('empty learnings are safe and labels stay stable',()=>{
  const report=buildExperimentLearnings([]);
  assert.equal(report.completed,0);
  assert.equal(report.successRate,null);
  assert.equal(report.averageQualityDelta,null);
  assert.deepEqual(report.games,[]);
  assert.equal(experimentSourceLabel('health'),'Health');
  assert.equal(experimentSourceLabel('context'),'Context');
  assert.equal(experimentSourceLabel('manual'),'Manual');
});
