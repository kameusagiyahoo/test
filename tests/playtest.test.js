import test from 'node:test';
import assert from 'node:assert/strict';
import {PlaytestStore,RatingStore} from '../src/core/preferences.js';

function memoryStorage(){
  const map=new Map();
  return{
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value)),
    dump:()=>Object.fromEntries(map)
  };
}

test('playtest store aggregates four axes independently',()=>{
  const storage=memoryStorage(),store=new PlaytestStore(storage);
  store.submit('code',{fun:5,clarity:4,brain:5,replay:4});
  store.submit('code',{fun:3,clarity:2,brain:5,replay:3});
  const r=store.get('code');
  assert.equal(r.responses,2);
  assert.equal(r.fun.average,4);
  assert.equal(r.clarity.average,3);
  assert.equal(r.brain.average,5);
  assert.equal(r.replay.average,3.5);
  assert.equal(r.qualityAverage,(4+3+3.5)/3);
});

test('legacy three-choice ratings seed replay intent without inventing other axes',()=>{
  const storage=memoryStorage(),ratings=new RatingStore(storage);
  ratings.rate('sync','good');
  ratings.rate('sync','neutral');
  ratings.rate('sync','bad');
  const store=new PlaytestStore(storage),r=store.get('sync');
  assert.equal(r.responses,0);
  assert.equal(r.legacyResponses,3);
  assert.equal(r.replay.count,3);
  assert.equal(r.replay.average,3);
  assert.equal(r.fun.average,null);
  assert.equal(r.clarity.average,null);
  assert.equal(r.brain.average,null);
});

test('playtest scores must be integers from one to five',()=>{
  const store=new PlaytestStore(memoryStorage());
  assert.throws(()=>store.submit('gate',{fun:6,clarity:4,brain:5,replay:4}));
  assert.throws(()=>store.submit('gate',{fun:4,clarity:4,brain:2.5,replay:4}));
});

test('playtest report returns requested games including unevaluated ones',()=>{
  const store=new PlaytestStore(memoryStorage());
  store.submit('code',{fun:5,clarity:4,brain:5,replay:5});
  const report=store.report(['code','gate']);
  assert.equal(report.length,2);
  assert.equal(report[0].gameId,'code');
  assert.equal(report[1].responses,0);
  assert.equal(report[1].qualityAverage,null);
});
