import test from 'node:test';
import assert from 'node:assert/strict';
import {makeMemorySequence,memoryScore} from '../src/games/memory.js';
import {makeRoutePuzzle,pathSum,routeNeighbors,routeScore} from '../src/games/route.js';
import {makePatternPuzzle,patternScore} from '../src/games/pattern.js';
import {categoriesFor,gameMeta,recommendedIds} from '../src/core/catalog.js';

test('memory sequence and scoring support exact and one-error recall',()=>{
  const seq=makeMemorySequence(()=>0,6);
  assert.deepEqual(seq,[1,1,1,1,1,1]);
  assert.equal(memoryScore([1,2,3,4,5,6],'123456'),2);
  assert.equal(memoryScore([1,2,3,4,5,6],'123457'),1);
  assert.equal(memoryScore([1,2,3,4,5,6],'120000'),0);
});

test('number route puzzle always contains a legal four-cell solution matching target',()=>{
  let seed=0;
  const rng=()=>((seed++*37)%100)/100;
  for(let n=0;n<20;n++){
    const puzzle=makeRoutePuzzle(rng);
    assert.equal(puzzle.solution.length,4);
    assert.equal(new Set(puzzle.solution).size,4);
    for(let i=1;i<puzzle.solution.length;i++)assert.ok(routeNeighbors(puzzle.solution[i-1]).includes(puzzle.solution[i]));
    assert.equal(pathSum(puzzle.values,puzzle.solution),puzzle.target);
    assert.equal(routeScore(puzzle.values,puzzle.solution,puzzle.target),2);
  }
});

test('pattern puzzle has one answer among four unique choices',()=>{
  for(const r of [0,.2,.45,.7,.95]){
    const puzzle=makePatternPuzzle(()=>r);
    assert.equal(puzzle.choices.length,4);
    assert.equal(new Set(puzzle.choices).size,4);
    assert.ok(puzzle.choices.includes(puzzle.answer));
    assert.equal(patternScore(puzzle,puzzle.answer),2);
  }
});

test('solo catalog exposes three one-player games and recommends them for one player',()=>{
  assert.deepEqual(recommendedIds(1),['memory','route','pattern']);
  for(const id of ['memory','route','pattern']){
    assert.ok(categoriesFor(id).includes('solo'));
    assert.equal(gameMeta(id).minPlayers,1);
  }
});
