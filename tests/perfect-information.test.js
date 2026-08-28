import test from 'node:test';
import assert from 'node:assert/strict';
import {isolationSize,isolationStarts,legalIsolationMoves} from '../src/games/isolation.js';
import {gateSetup,pathExists,legalBarrierCells} from '../src/games/gate.js';
import {hasTriad,triadPotential,legalTriadShifts} from '../src/games/triad.js';

test('isolation starts are unique and legal moves respect occupied and blocked cells',()=>{
  const size=isolationSize(8),starts=isolationStarts(8,size);
  assert.equal(size,6);
  assert.equal(new Set(starts).size,8);
  const blocked=new Set([1]);
  const moves=legalIsolationMoves(0,[0,3],blocked,3);
  assert.deepEqual(moves,[]);
});

test('gate setup stays unique and legal walls never remove every route',()=>{
  const setup=gateSetup(8,7);
  assert.equal(new Set(setup.positions).size,8);
  const state={size:5,positions:[2,22],goals:['bottom','top'],finished:[false,false],blocked:new Set()};
  const legal=legalBarrierCells(state);
  assert.ok(legal.length>0);
  for(const cell of legal.slice(0,10)){
    const blocked=new Set([cell]);
    assert.equal(pathExists(2,'bottom',blocked,5),true);
    assert.equal(pathExists(22,'top',blocked,5),true);
  }
});

test('triad detects straight lines and only orthogonal one-step shifts',()=>{
  const board=Array(16).fill(-1);
  board[0]=0;board[1]=0;board[2]=0;
  assert.equal(hasTriad(board,4,0),true);
  assert.equal(triadPotential(board,4,0),6);
  board[2]=-1;board[5]=1;
  const moves=legalTriadShifts(board,4,0);
  assert.ok(moves.some(m=>m.from===1&&m.to===2));
  assert.ok(!moves.some(m=>m.from===1&&m.to===6));
});
