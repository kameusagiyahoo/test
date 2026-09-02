import test from 'node:test';
import assert from 'node:assert/strict';
import {contextSignalText,healthStatusLabel,insightAxisLabel,percent} from '../src/screens/analytics/game-insights.js';
import {createExperimentWorkflow} from '../src/app/experiment-workflow.js';

test('Game Insights presentation helpers preserve labels',()=>{
  assert.equal(healthStatusLabel('action'),'改善優先');
  assert.equal(healthStatusLabel('watch'),'要観察');
  assert.equal(healthStatusLabel('data'),'データ収集中');
  assert.equal(healthStatusLabel('healthy'),'健全');
  assert.equal(insightAxisLabel('fun'),'面白さ');
  assert.equal(insightAxisLabel('clarity'),'分かりやすさ');
  assert.equal(insightAxisLabel('brain'),'頭を使う度');
  assert.equal(insightAxisLabel('replay'),'もう一度遊びたい');
  assert.equal(percent(0.625),'63%');
});

test('context signal text keeps comparison direction explicit',()=>{
  assert.equal(
    contextSignalText({axis:'clarity',low:'single',high:'party',gap:1.2}),
    'Singleの分かりやすさがPartyより1.2低い'
  );
});

test('experiment workflow exposes stable planned and done controls',()=>{
  const queue={
    all:()=>[],
    reset:id=>({id,status:'planned'})
  };
  const events={forGame:()=>[]};
  const workflow=createExperimentWorkflow({improvementQueue:queue,playtestEvents:events,toast:()=>{}});
  assert.equal(workflow.evaluation({status:'planned'}),null);
  assert.equal(workflow.advanceLabel({status:'planned'}),'テスト開始');
  assert.equal(workflow.advanceLabel({status:'done'}),'再計画');
  assert.equal(workflow.outcomeClass({outcome:'improved'}),'improved');
  assert.equal(workflow.outcomeClass({outcome:'worse'}),'worse');
});
