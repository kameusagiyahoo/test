import test from 'node:test';
import assert from 'node:assert/strict';
import {SessionStore,buildBalancedSchedule,buildPartySchedule,partyAwards,rankScores,normalizeAnswer} from '../src/core/session.js';

function memoryStorage(){const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))}}

test('balanced schedule still contains every game exactly twice',()=>{
  const schedule=buildBalancedSchedule(['sync','bomb','five'],2,()=>0.42);
  assert.equal(schedule.length,6);
  for(const id of ['sync','bomb','five'])assert.equal(schedule.filter(x=>x===id).length,2);
});

test('party schedule selects six unique games when eight are available',()=>{
  const ids=['sync','bomb','five','minority','sniper','taboo','clock','ten'];
  const schedule=buildPartySchedule(ids,6,()=>0.42);
  assert.equal(schedule.length,6);
  assert.equal(new Set(schedule).size,6);
  for(const id of schedule)assert.ok(ids.includes(id));
});

test('party awards normalize positive ranks and do not reward zero scores',()=>{
  assert.deepEqual(partyAwards([7,3,1,0]),[3,2,1,0]);
  assert.deepEqual(partyAwards([5,5,2,0]),[3,3,2,0]);
  assert.deepEqual(partyAwards([1,0,0]),[3,0,0]);
  assert.deepEqual(partyAwards([0,0,0]),[0,0,0]);
});

test('score ranking sorts descending and preserves tied ranks',()=>{
  assert.deepEqual(rankScores([3,7,7,1]),[
    {index:1,score:7,rank:1},
    {index:2,score:7,rank:1},
    {index:0,score:3,rank:3},
    {index:3,score:1,rank:4}
  ]);
});

test('party round transfers local result into party score then resets local score',()=>{
  const session=new SessionStore({storage:memoryStorage()});
  session.savePlayers(['A','B','C']);
  session.startParty(['sync','bomb','five','minority','sniper','taboo','clock','ten'],6,()=>0.3);
  assert.equal(session.party.totalRounds,6);
  session.scores=[4,2,0];
  const result=session.finishPartyRound();
  assert.deepEqual(result.awards,[3,2,0]);
  assert.deepEqual(session.partyScores,[3,2,0]);
  assert.deepEqual(session.scores,[0,0,0]);
  assert.equal(session.party.round,1);
});

test('answer normalization handles width, case and punctuation',()=>{
  assert.equal(normalizeAnswer(' Ａpple！ '),normalizeAnswer('apple'));
  assert.equal(normalizeAnswer('リンゴ。'),normalizeAnswer('リンゴ'));
});
