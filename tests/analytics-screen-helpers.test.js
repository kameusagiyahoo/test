import test from 'node:test';
import assert from 'node:assert/strict';
import {playtestStatus,weakestAxis} from '../src/screens/analytics/playtest-lab.js';
import {percent,profileResultLabel,seasonDelta} from '../src/screens/analytics/player-analytics.js';

test('Playtest Lab helper thresholds preserve quality states',()=>{
  assert.deepEqual(playtestStatus({responses:0}),{label:'未評価',tone:'muted'});
  assert.deepEqual(playtestStatus({responses:1}),{label:'評価追加待ち',tone:'muted'});
  assert.deepEqual(playtestStatus({responses:2,qualityAverage:3.2}),{label:'改善優先',tone:'weak'});
  assert.deepEqual(playtestStatus({responses:2,qualityAverage:3.8}),{label:'要観察',tone:'watch'});
  assert.deepEqual(playtestStatus({responses:2,qualityAverage:4.1}),{label:'好調',tone:'good'});
});

test('weakest axis ignores brain load and reports the lowest quality axis',()=>{
  const row={
    fun:{average:4.2},
    clarity:{average:2.8},
    replay:{average:3.7},
    brain:{average:1.0}
  };
  assert.equal(weakestAxis(row),'分かりやすさ 2.8');
});

test('player analytics presentation helpers keep existing labels',()=>{
  assert.equal(percent(0.625),'63%');
  assert.equal(seasonDelta(2),'+2');
  assert.equal(seasonDelta(-1),'-1');
  assert.equal(profileResultLabel('win'),'勝');
  assert.equal(profileResultLabel('draw'),'分');
  assert.equal(profileResultLabel('loss'),'敗');
});
