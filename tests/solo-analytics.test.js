import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSoloDifficultyAnalytics} from '../src/core/solo-analytics.js';

const progress={
  difficulties:{
    easy:{clears:2,bestRounds:3,bestStreak:2},
    normal:{clears:4,bestRounds:3,bestStreak:4},
    hard:{clears:1,bestRounds:5,bestStreak:2}
  }
};

test('solo analytics separates recorded runs by difficulty',()=>{
  const entries=[
    {gameId:'memory',mode:'single',players:['A'],scores:[6],winners:[0],difficulty:'easy',clearRounds:3},
    {gameId:'memory',mode:'single',players:['A'],scores:[5],winners:[0],difficulty:'easy',clearRounds:4},
    {gameId:'memory',mode:'single',players:['A'],scores:[6],winners:[0],difficulty:'hard',clearRounds:5},
    {gameId:'memory',mode:'party',players:['A','B'],scores:[3,2],winners:[0],difficulty:'hard',clearRounds:1},
    {gameId:'route',mode:'single',players:['A'],scores:[5],winners:[0],difficulty:'easy',clearRounds:3}
  ];
  const report=buildSoloDifficultyAnalytics('memory',entries,progress);
  assert.equal(report.rows.find(r=>r.difficulty==='easy').trackedRuns,2);
  assert.equal(report.rows.find(r=>r.difficulty==='hard').trackedRuns,1);
  assert.equal(report.rows.find(r=>r.difficulty==='normal').trackedRuns,0);
});

test('legacy one-player solo stats count as Normal but do not invent round metrics',()=>{
  const entries=[
    {gameId:'memory',mode:'single',players:['A'],scores:[5],winners:[0]},
    {gameId:'memory',mode:'single',players:['A'],scores:[6],winners:[0],difficulty:null,clearRounds:null}
  ];
  const report=buildSoloDifficultyAnalytics('memory',entries,progress);
  const normal=report.rows.find(r=>r.difficulty==='normal');
  assert.equal(normal.trackedRuns,2);
  assert.equal(normal.roundTrackedRuns,0);
  assert.equal(normal.averageRounds,null);
  assert.equal(normal.averagePointsPerRound,null);
  assert.equal(normal.bestRounds,3);
});

test('average rounds and points per round use only runs with real round data',()=>{
  const entries=[
    {gameId:'memory',mode:'single',players:['A'],scores:[6],winners:[0],difficulty:'easy',clearRounds:3},
    {gameId:'memory',mode:'single',players:['A'],scores:[5],winners:[0],difficulty:'easy',clearRounds:5},
    {gameId:'memory',mode:'single',players:['A'],scores:[5],winners:[0],difficulty:'easy',clearRounds:null}
  ];
  const easy=buildSoloDifficultyAnalytics('memory',entries,progress).rows.find(r=>r.difficulty==='easy');
  assert.equal(easy.roundTrackedRuns,2);
  assert.equal(easy.averageRounds,4);
  assert.equal(easy.averagePointsPerRound,11/8);
});

test('progress totals remain authoritative for clears and bests',()=>{
  const report=buildSoloDifficultyAnalytics('memory',[],progress);
  const normal=report.rows.find(r=>r.difficulty==='normal');
  assert.equal(normal.clears,4);
  assert.equal(normal.bestRounds,3);
  assert.equal(normal.bestStreak,4);
  assert.equal(report.totalClears,7);
  assert.equal(report.hasRoundMetrics,false);
});

test('unrelated multiplayer and other-game entries are excluded',()=>{
  const entries=[
    {gameId:'memory',mode:'party',players:['A','B'],scores:[3,2],winners:[0],difficulty:'easy',clearRounds:3},
    {gameId:'route',mode:'single',players:['A'],scores:[5],winners:[0],difficulty:'hard',clearRounds:4}
  ];
  const report=buildSoloDifficultyAnalytics('memory',entries,null);
  assert.equal(report.trackedRuns,0);
  assert.equal(report.roundTrackedRuns,0);
  assert.equal(report.totalClears,0);
});
