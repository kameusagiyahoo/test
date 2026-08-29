import test from 'node:test';
import assert from 'node:assert/strict';
import {StatsStore,winnerIndexesFromScores} from '../src/core/stats.js';

function memoryStorage(){
  const map=new Map();
  return{
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value))
  };
}

test('stats store records single and party results newest first',()=>{
  let now=1000;
  const store=new StatsStore(memoryStorage(),()=>now++);
  store.record({gameId:'code',mode:'single',players:['A','B'],scores:[5,3],winners:[0]});
  store.record({gameId:'gate',mode:'party',players:['A','B'],scores:[1,3],winners:[1]});
  const h=store.history();
  assert.equal(h.length,2);
  assert.equal(h[0].gameId,'gate');
  assert.equal(h[1].gameId,'code');
});

test('stats report aggregates player wins and game counts',()=>{
  const store=new StatsStore(memoryStorage(),()=>1234);
  store.record({gameId:'code',mode:'single',players:['A','B'],scores:[5,3],winners:[0]});
  store.record({gameId:'code',mode:'party',players:['A','B'],scores:[2,1],winners:[0]});
  store.record({gameId:'gate',mode:'party',players:['A','B'],scores:[0,3],winners:[1]});
  const r=store.report(['code','gate']);
  assert.equal(r.totalPlays,3);
  assert.equal(r.singlePlays,1);
  assert.equal(r.partyRounds,2);
  assert.equal(r.gamesPlayed,2);
  const a=r.playerStats.find(p=>p.name==='A'),b=r.playerStats.find(p=>p.name==='B');
  assert.equal(a.plays,3);assert.equal(a.wins,2);assert.equal(a.winRate,2/3);
  assert.equal(b.wins,1);
  const code=r.gameStats.find(g=>g.gameId==='code');
  assert.equal(code.plays,2);assert.equal(code.leader.name,'A');assert.equal(code.leader.wins,2);
});

test('ties count as wins for every listed winner',()=>{
  const store=new StatsStore(memoryStorage(),()=>1234);
  store.record({gameId:'sync',mode:'party',players:['A','B','C'],scores:[3,3,1],winners:[0,1]});
  const r=store.report(['sync']);
  assert.equal(r.playerStats.find(p=>p.name==='A').wins,1);
  assert.equal(r.playerStats.find(p=>p.name==='B').wins,1);
  assert.equal(r.playerStats.find(p=>p.name==='C').wins,0);
});

test('winner helper returns all top positive scores and none for all-zero rounds',()=>{
  assert.deepEqual(winnerIndexesFromScores([3,1,3]),[0,2]);
  assert.deepEqual(winnerIndexesFromScores([0,0,0]),[]);
});

test('history is capped at 200 completed results',()=>{
  let now=1;const store=new StatsStore(memoryStorage(),()=>now++);
  for(let i=0;i<205;i++)store.record({gameId:'clock',mode:'party',players:['A','B'],scores:[1,0],winners:[0]});
  assert.equal(store.history().length,200);
});
