import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCode,makeSecret,candidateCount} from '../src/games/code.js';
import {generateLogicPuzzle,solveLogic} from '../src/games/logic.js';
import {expectedValue,resolveContract,finalValue,makeDecisionSet} from '../src/games/ev.js';
import {resolveAuction,expectedLotValue,weightedValue} from '../src/games/auction.js';

test('code breaker returns exact and misplaced counts for four digits',()=>{
  assert.deepEqual(evaluateCode('5271','5231'),{exact:3,misplaced:0});
  assert.deepEqual(evaluateCode('5271','7152'),{exact:0,misplaced:4});
  assert.deepEqual(evaluateCode('5071','0751'),{exact:1,misplaced:3});
});

test('generated code contains four unique digits',()=>{
  for(const r of [0,.1,.42,.99]){
    const secret=makeSecret(()=>r);
    assert.match(secret,/^\d{4}$/);
    assert.equal(new Set(secret).size,4);
  }
});

test('candidate counter reflects accumulated code information',()=>{
  assert.equal(candidateCount([{guess:'0123',exact:4,misplaced:0}]),1);
  assert.equal(candidateCount([{guess:'4567',exact:0,misplaced:0}]),360);
});

test('logic generator yields exactly one culprit-liar pair',()=>{
  for(const r of [0,.13,.37,.72,.999]){
    const puzzle=generateLogicPuzzle(()=>r),solutions=solveLogic(puzzle.statementIds);
    assert.equal(solutions.length,1);
    assert.deepEqual(solutions[0],{culprit:puzzle.culprit,liar:puzzle.liar});
    assert.ok(puzzle.culprit>=0&&puzzle.culprit<4);
    assert.ok(puzzle.liar>=0&&puzzle.liar<4);
  }
});

test('expected-value game exposes math helpers without revealing strategy in play',()=>{
  const contract={p:.7,win:5,lose:-4};
  assert.equal(expectedValue(contract),2.3);
  assert.equal(resolveContract(contract,.2),5);
  assert.equal(resolveContract(contract,.9),-4);
  assert.equal(finalValue(23,24),23);
  assert.equal(finalValue(24,24),30);
  const set=makeDecisionSet(()=>.42);
  assert.equal(set.length,3);
  assert.equal(new Set(set.map(c=>`${c.p}/${c.win}/${c.lose}`)).size,3);
});

test('auction probability helpers calculate weighted market value',()=>{
  const lot={values:[4,10,16],weights:[50,30,20]};
  assert.equal(expectedLotValue(lot),8.2);
  assert.equal(weightedValue(lot,.1),4);
  assert.equal(weightedValue(lot,.55),10);
  assert.equal(weightedValue(lot,.95),16);
});

test('auction charges only a unique highest bidder',()=>{
  const sold=resolveAuction([4,7,5],10,[18,18,18],[0,0,0]);
  assert.equal(sold.winner,1);
  assert.deepEqual(sold.budgets,[18,11,18]);
  assert.deepEqual(sold.assets,[0,10,0]);

  const tied=resolveAuction([7,7,5],10,[18,18,18],[0,0,0]);
  assert.equal(tied.winner,-1);
  assert.deepEqual(tied.budgets,[18,18,18]);
  assert.deepEqual(tied.assets,[0,0,0]);
});
