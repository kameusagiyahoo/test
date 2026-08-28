import test from 'node:test';
import assert from 'node:assert/strict';
import {SEQUENCES,duelWinner,scoreDuelStep} from '../src/games/sequence.js';
import {resolveFront,rankFrontline} from '../src/games/frontline.js';
import {makeRewardSchedule,uniqueHighestWinner} from '../src/games/priority.js';

test('sequence duel has six programs and a closed counter cycle',()=>{
  assert.equal(SEQUENCES.length,6);
  assert.equal(new Set(SEQUENCES.map(s=>s.join(''))).size,6);
  assert.equal(duelWinner('S','F'),0);
  assert.equal(duelWinner('F','G'),0);
  assert.equal(duelWinner('G','S'),0);
  assert.equal(duelWinner('S','S'),-1);
  assert.deepEqual(scoreDuelStep(['S','F','G']),[1,1,1]);
});

test('frontline awards only a unique highest deployment on a front',()=>{
  assert.deepEqual(resolveFront([{front:0,power:5},{front:0,power:4},{front:1,power:5}],0),{winner:0,power:5});
  assert.deepEqual(resolveFront([{front:0,power:5},{front:0,power:5},{front:0,power:4}],0),{winner:-1,power:5});
  assert.deepEqual(rankFrontline([7,4,0]),[2,1,0]);
});

test('priority five schedule is a permutation and highest unique survives ties above it',()=>{
  const schedule=makeRewardSchedule(()=>0.42);
  assert.deepEqual([...schedule].sort((a,b)=>a-b),[1,2,3,4,5]);
  assert.equal(uniqueHighestWinner([5,5,4,3]),2);
  assert.equal(uniqueHighestWinner([5,5,4,4]),-1);
  assert.equal(uniqueHighestWinner([2,5,4]),1);
});
