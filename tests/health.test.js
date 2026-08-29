import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeGameHealth,buildHealthReport,HEALTH_THRESHOLDS} from '../src/core/health.js';

function playtest({responses=0,fun=null,clarity=null,replay=null,brain=null}={}){
  const axis=value=>({average:value});
  return{responses,fun:axis(fun),clarity:axis(clarity),replay:axis(replay),brain:axis(brain)};
}

test('health flags low clarity only after minimum review evidence',()=>{
  const weak=analyzeGameHealth({
    gameId:'code',
    playtest:playtest({responses:2,fun:4,clarity:3,replay:4}),
    stats:{plays:2,leader:null}
  });
  assert.equal(weak.status,'action');
  assert.ok(weak.issues.some(i=>i.type==='clarity'));

  const early=analyzeGameHealth({
    gameId:'code',
    playtest:playtest({responses:1,fun:2,clarity:2,replay:2}),
    stats:{plays:1,leader:null}
  });
  assert.ok(!early.issues.some(i=>['clarity','fun','replay'].includes(i.type)));
});

test('popular low replay intent is high severity',()=>{
  const row=analyzeGameHealth({
    gameId:'auction',
    playtest:playtest({responses:3,fun:4,clarity:4,replay:3}),
    stats:{plays:6,leader:null}
  });
  const issue=row.issues.find(i=>i.type==='replay');
  assert.equal(issue.severity,'high');
  assert.equal(row.status,'action');
});

test('dominance requires enough games player appearances and 75 percent win rate',()=>{
  const flagged=analyzeGameHealth({
    gameId:'gate',
    playtest:playtest(),
    stats:{plays:6,leader:{name:'A',plays:4,wins:3,winRate:.75}}
  });
  assert.ok(flagged.issues.some(i=>i.type==='dominance'));
  assert.equal(flagged.status,'watch');

  const small=analyzeGameHealth({
    gameId:'gate',
    playtest:playtest(),
    stats:{plays:4,leader:{name:'A',plays:4,wins:4,winRate:1}}
  });
  assert.ok(!small.issues.some(i=>i.type==='dominance'));
});

test('frequently played games with too few new reviews ask for more evidence',()=>{
  const row=analyzeGameHealth({
    gameId:'sync',
    playtest:playtest({responses:1}),
    stats:{plays:HEALTH_THRESHOLDS.minPopularityPlays,leader:null}
  });
  assert.ok(row.issues.some(i=>i.type==='evidence'));
  assert.equal(row.status,'data');
});

test('unplayed games are data collection targets',()=>{
  const row=analyzeGameHealth({gameId:'triad',playtest:playtest(),stats:{plays:0,leader:null}});
  assert.equal(row.status,'data');
  assert.ok(row.issues.some(i=>i.type==='untested'));
});

test('health report sorts action before watch before data before healthy',()=>{
  const ids=['healthy','data','watch','action'];
  const pRows=[
    {gameId:'healthy',...playtest({responses:2,fun:4.5,clarity:4.5,replay:4.5})},
    {gameId:'data',...playtest()},
    {gameId:'watch',...playtest({responses:2,fun:4,clarity:4,replay:4})},
    {gameId:'action',...playtest({responses:2,fun:2,clarity:4,replay:4})}
  ];
  const sRows=[
    {gameId:'healthy',plays:2,leader:null},
    {gameId:'data',plays:0,leader:null},
    {gameId:'watch',plays:5,leader:{name:'A',plays:4,wins:3,winRate:.75}},
    {gameId:'action',plays:2,leader:null}
  ];
  const report=buildHealthReport(ids,pRows,sRows);
  assert.deepEqual(report.priority.map(r=>r.gameId),['action','watch','data','healthy']);
  assert.equal(report.actionCount,1);
  assert.equal(report.watchCount,1);
  assert.equal(report.dataCount,1);
  assert.equal(report.healthyCount,1);
});
