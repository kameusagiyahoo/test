import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTenWinners} from '../src/games/ten.js';

test('push-to-10 picks the highest safe total',()=>{
  assert.deepEqual(resolveTenWinners([8,10,9],[false,false,false]),[1]);
});

test('push-to-10 shares wins on tied safe totals',()=>{
  assert.deepEqual(resolveTenWinners([10,10,12],[false,false,true]),[0,1]);
});

test('push-to-10 picks the smallest overage when everyone busts',()=>{
  assert.deepEqual(resolveTenWinners([11,14,12],[true,true,true]),[0]);
});
