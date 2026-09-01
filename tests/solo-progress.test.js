import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SoloProgressStore,SOLO_DIFFICULTIES,SOLO_GAME_IDS,dailySoloDifficulty,dailySoloGameId,dailyTarget
} from '../src/core/solo.js';

function memoryStorage(seed={}){
  const map=new Map(Object.entries(seed));
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

test('daily difficulty covers all three tiers across consecutive game blocks',()=>{
  const levels=[];
  for(let i=0;i<9;i++)levels.push(dailySoloDifficulty(new Date(2026,7,20+i)));
  assert.equal(new Set(levels).size,3);
  assert.ok(levels.every(level=>SOLO_DIFFICULTIES.includes(level)));
});

test('solo progress keeps separate bests for each difficulty and aggregate totals',()=>{
  const store=new SoloProgressStore(memoryStorage());
  store.recordRun('memory',{difficulty:'easy',rounds:4,maxStreak:2,completed:true});
  store.recordRun('memory',{difficulty:'normal',rounds:3,maxStreak:3,completed:true});
  store.recordRun('memory',{difficulty:'hard',rounds:5,maxStreak:4,completed:true});
  store.recordRun('memory',{difficulty:'hard',rounds:4,maxStreak:2,completed:true});
  assert.equal(store.game('memory','easy').bestRounds,4);
  assert.equal(store.game('memory','normal').bestRounds,3);
  assert.equal(store.game('memory','hard').bestRounds,4);
  const g=store.game('memory');
  assert.equal(g.plays,4);
  assert.equal(g.clears,4);
  assert.equal(g.bestRounds,3);
  assert.equal(g.bestStreak,4);
});

test('legacy solo progress migrates into Normal without duplication',()=>{
  const storage=memoryStorage({
    partyPocketSoloProgressV1:JSON.stringify({
      games:{memory:{plays:3,clears:2,bestRounds:3,bestStreak:4}},
      dailyClears:[]
    })
  });
  const store=new SoloProgressStore(storage),g=store.game('memory');
  assert.equal(g.difficulties.easy.plays,0);
  assert.deepEqual(g.difficulties.normal,{plays:3,clears:2,bestRounds:3,bestStreak:4});
  assert.equal(g.difficulties.hard.plays,0);
  assert.equal(g.plays,3);
});

test('daily clear requires scheduled game difficulty and round target',()=>{
  const date=new Date(2026,7,29),target=dailyTarget(date),store=new SoloProgressStore(memoryStorage());
  const wrongGame=SOLO_GAME_IDS.find(id=>id!==target.gameId);
  const wrongDifficulty=SOLO_DIFFICULTIES.find(level=>level!==target.difficulty);
  store.recordRun(wrongGame,{difficulty:target.difficulty,rounds:3,maxStreak:3,completed:true,date});
  store.recordRun(target.gameId,{difficulty:wrongDifficulty,rounds:3,maxStreak:3,completed:true,date});
  assert.equal(store.daily(date).cleared,false);
  store.recordRun(target.gameId,{difficulty:target.difficulty,rounds:target.maxRounds+1,maxStreak:3,completed:true,date});
  assert.equal(store.daily(date).cleared,false);
  store.recordRun(target.gameId,{difficulty:target.difficulty,rounds:target.maxRounds,maxStreak:3,completed:true,date});
  assert.equal(store.daily(date).cleared,true);
});

test('daily clear is unique per date and streak counts consecutive cleared days',()=>{
  const store=new SoloProgressStore(memoryStorage());
  const dates=[new Date(2026,7,27),new Date(2026,7,28),new Date(2026,7,29)];
  for(const date of dates){
    const target=dailyTarget(date);
    store.recordRun(target.gameId,{difficulty:target.difficulty,rounds:target.maxRounds,maxStreak:3,completed:true,date});
    store.recordRun(target.gameId,{difficulty:target.difficulty,rounds:target.maxRounds,maxStreak:3,completed:true,date});
  }
  assert.equal(store.daily(new Date(2026,7,29)).streak,3);
  assert.equal(store.state().dailyClears.length,3);
});

test('summary aggregates supported solo games across difficulties',()=>{
  const store=new SoloProgressStore(memoryStorage());
  store.recordRun('memory',{difficulty:'easy',rounds:3,maxStreak:3});
  store.recordRun('route',{difficulty:'normal',rounds:4,maxStreak:2});
  store.recordRun('pattern',{difficulty:'hard',rounds:5,maxStreak:1});
  store.recordRun('sync',{difficulty:'hard',rounds:2,maxStreak:2});
  assert.deepEqual(store.summary(),{totalRuns:3,totalClears:3,bestStreak:3});
});
