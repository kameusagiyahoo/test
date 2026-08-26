import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCode,makeSecret} from '../src/games/code.js';
import {generateLogicPuzzle,solveLogic} from '../src/games/logic.js';
import {expectedValue,resolveContract} from '../src/games/ev.js';
import {resolveAuction} from '../src/games/auction.js';

test('code breaker returns exact and misplaced counts',()=>{
  assert.deepEqual(evaluateCode('527','523'),{exact:2,misplaced:0});
  assert.deepEqual(evaluateCode('527','752'),{exact:0,misplaced:3});
  assert.deepEqual(evaluateCode('507','075'),{exact:0,misplaced:3});
});

test('generated code contains three unique digits',()=>{
  for(const r of [0,.1,.42,.99]){
    const secret=makeSecret(()=>r);
    assert.match(secret,/^\d{3}$/);
    assert.equal(new Set(secret).size,3);
  }
});

test('logic generator always yields one culprit and one liar',()=>{
  for(const r of [0,.13,.37,.72,.999]){
    const puzzle=generateLogicPuzzle(()=>r),solutions=solveLogic(puzzle.statementIds);
    assert.equal(solutions.length,1);
    assert.equal(solutions[0],puzzle.culprit);
    assert.ok(puzzle.liar>=0&&puzzle.liar<3);
  }
});

test('expected value and contract outcome are deterministic for a supplied roll',()=>{
  const contract={p:.7,win:5,lose:-4};
  assert.equal(expectedValue(contract),2.3);
  assert.equal(resolveContract(contract,.2),5);
  assert.equal(resolveContract(contract,.9),-4);
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
