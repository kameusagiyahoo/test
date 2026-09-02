import test from 'node:test';
import assert from 'node:assert/strict';
import {hasCompletePlaytestScores,replayRating} from '../src/ui/playtest-feedback.js';
import {soloDifficultyDetail} from '../src/screens/game-detail/game-detail.js';

test('playtest feedback requires all four axes',()=>{
  assert.equal(hasCompletePlaytestScores({fun:5,clarity:4,brain:3,replay:4}),true);
  assert.equal(hasCompletePlaytestScores({fun:5,clarity:4,brain:3}),false);
  assert.equal(hasCompletePlaytestScores({fun:5,clarity:4,brain:0,replay:4}),false);
});

test('replay score maps to legacy rating buckets',()=>{
  assert.equal(replayRating(5),'good');
  assert.equal(replayRating(4),'good');
  assert.equal(replayRating(3),'neutral');
  assert.equal(replayRating(2),'bad');
});

test('Game Detail keeps Solo difficulty descriptions',()=>{
  assert.equal(soloDifficultyDetail('memory','easy'),'5桁 · 約3.2秒');
  assert.equal(soloDifficultyDetail('route','hard'),'5マス · 数字1〜9');
  assert.equal(soloDifficultyDetail('pattern','normal'),'交互・差分');
});
