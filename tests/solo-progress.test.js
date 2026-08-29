import test from 'node:test';
import assert from 'node:assert/strict';
import {SoloProgressStore,SOLO_GAME_IDS,dailySoloGameId,dailyTarget} from '../src/core/solo.js';

function memoryStorage(){
  const map=new Map();
  return{
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value))
  };
}

test('daily solo challenge cycles through all three solo games',()=>{
  const ids=[
    dailySoloGameId(new Date(2026,7,29)),
    dailySoloGameId(new Date(2026,7,30)),
    dailySoloGameId(new Date(2026,7,31))
  ];
  assert.equal(new Set(ids).size,3);
  assert.ok(ids.every(id=>SOLO_GAME_IDS.includes(id)));
});

test('solo progress keeps best rounds and best positive-round streak',()=>{
  const store=new SoloProgressStore(memoryStorage());
  store.recordRun('memory',{rounds:5,maxStreak:2,completed:true,date:new Date(2026,7,29)});
  store.recordRun('memory',{rounds:3,maxStreak:3,completed:true,date:new Date(2026,7,30)});
  store.recordRun('memory',{rounds:4,maxStreak:1,completed:true,date:new Date(2026,7,31)});
  const g=store.game('memory');
  assert.equal(g.plays,3);
  assert.equal(g.clears,3);
  assert.equal(g.bestRounds,3);
  assert.equal(g.bestStreak,3);
});

test('daily clear requires the scheduled game within the round target',()=>{
  const date=new Date(2026,7,29),target=dailyTarget(date),store=new SoloProgressStore(memoryStorage());
  const wrong=SOLO_GAME_IDS.find(id=>id!==target.gameId);
  store.recordRun(wrong,{rounds:3,maxStreak:3,completed:true,date});
  assert.equal(store.daily(date).cleared,false);
  store.recordRun(target.gameId,{rounds:5,maxStreak:2,completed:true,date});
  assert.equal(store.daily(date).cleared,false);
  store.recordRun(target.gameId,{rounds:4,maxStreak:3,completed:true,date});
  assert.equal(store.daily(date).cleared,true);
});

test('daily clear is unique per date and streak counts consecutive cleared days',()=>{
  const store=new SoloProgressStore(memoryStorage());
  const dates=[new Date(2026,7,27),new Date(2026,7,28),new Date(2026,7,29)];
  for(const date of dates){
    const target=dailyTarget(date);
    store.recordRun(target.gameId,{rounds:3,maxStreak:3,completed:true,date});
    store.recordRun(target.gameId,{rounds:3,maxStreak:3,completed:true,date});
  }
  assert.equal(store.daily(new Date(2026,7,29)).streak,3);
  assert.equal(store.state().dailyClears.length,3);
});

test('summary aggregates only supported solo games',()=>{
  const store=new SoloProgressStore(memoryStorage());
  store.recordRun('memory',{rounds:3,maxStreak:3});
  store.recordRun('route',{rounds:4,maxStreak:2});
  store.recordRun('pattern',{rounds:5,maxStreak:1});
  store.recordRun('sync',{rounds:2,maxStreak:2});
  assert.deepEqual(store.summary(),{totalRuns:3,totalClears:3,bestStreak:3});
});
