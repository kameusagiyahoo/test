import test from 'node:test';
import assert from 'node:assert/strict';
import {SNIPER_RULES,nextSniperRule,resolveSniperRound} from '../src/games/sniper.js';

test('Number Sniper resolves the rotating multiplier target',()=>{
  const high=SNIPER_RULES.find(rule=>rule.id==='high');
  const result=resolveSniperRound([4,6,8],high);
  assert.equal(result.average,6);
  assert.equal(result.target,7);
  assert.deepEqual(result.winners,[1,2]);
  assert.deepEqual(result.exact,[]);
});

test('Number Sniper awards exact target detection data',()=>{
  const mirror=SNIPER_RULES.find(rule=>rule.id==='mirror');
  const result=resolveSniperRound([2,5,8],mirror);
  assert.equal(result.target,5);
  assert.deepEqual(result.winners,[1]);
  assert.deepEqual(result.exact,[1]);
});

test('Number Sniper clamps high targets to the 0-9 range',()=>{
  const high=SNIPER_RULES.find(rule=>rule.id==='high');
  const result=resolveSniperRound([9,9,9],high);
  assert.equal(result.target,9);
  assert.deepEqual(result.winners,[0,1,2]);
});

test('Number Sniper does not repeat the previous round rule',()=>{
  for(const rule of SNIPER_RULES){
    const next=nextSniperRule(rule.id,()=>0);
    assert.notEqual(next.id,rule.id);
  }
});
