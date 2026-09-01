import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PlaytestEventStore,PLAYTEST_EVENT_LIMIT,buildPlaytestTimeline,timelineAxisTrend
} from '../src/core/playtest-events.js';

function memoryStorage(seed={}){
  const map=new Map(Object.entries(seed));
  return{
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(String(key),String(value)),
    removeItem:key=>map.delete(key)
  };
}

const scores=(fun,clarity,brain,replay)=>({fun,clarity,brain,replay});

test('event store records contextual ratings newest first',()=>{
  let now=100;
  const store=new PlaytestEventStore(memoryStorage(),()=>now++);
  store.record('code',scores(4,3,5,4),{mode:'party',playerCount:4});
  store.record('memory',scores(5,4,5,5),{mode:'single',playerCount:1,difficulty:'hard'});
  store.record('gate',scores(5,4,4,5),{mode:'single',playerCount:1});
  const all=store.all();
  assert.equal(all.length,3);
  assert.equal(all[0].gameId,'gate');
  assert.equal(all[0].mode,'single');
  assert.equal(all[0].playerCount,1);
  assert.equal(all[1].gameId,'memory');
  assert.equal(all[1].difficulty,'hard');
  assert.equal(all[2].mode,'party');
  assert.equal(all[2].playerCount,4);
  assert.equal(all[2].difficulty,null);
});

test('event store rejects incomplete or out-of-range four-axis scores',()=>{
  const store=new PlaytestEventStore(memoryStorage(),()=>1);
  assert.throws(()=>store.record('code',{fun:4,clarity:3,brain:5},{mode:'single'}),/invalid playtest event/);
  assert.throws(()=>store.record('code',scores(6,3,5,4),{mode:'single'}),/invalid playtest event/);
  assert.deepEqual(store.all(),[]);
});

test('event store caps history at three hundred newest events',()=>{
  let now=1;
  const store=new PlaytestEventStore(memoryStorage(),()=>now++);
  for(let i=0;i<PLAYTEST_EVENT_LIMIT+12;i++){
    store.record('code',scores(4,4,4,4),{mode:'single',playerCount:2});
  }
  assert.equal(store.all().length,PLAYTEST_EVENT_LIMIT);
  assert.equal(store.all()[0].at,PLAYTEST_EVENT_LIMIT+12);
});

test('timeline compares adjacent thirty-day windows and computes axis deltas',()=>{
  const day=86400000,now=new Date(2026,8,1,12).getTime();
  const events=[
    {gameId:'code',scores:scores(5,4,4,5),mode:'party',playerCount:4,at:now-2*day},
    {gameId:'code',scores:scores(3,4,5,3),mode:'single',playerCount:2,at:now-20*day},
    {gameId:'code',scores:scores(2,3,4,2),mode:'party',playerCount:4,at:now-35*day},
    {gameId:'code',scores:scores(4,3,3,4),mode:'single',playerCount:3,at:now-50*day},
    {gameId:'gate',scores:scores(1,1,1,1),mode:'single',playerCount:2,at:now-1*day}
  ];
  const timeline=buildPlaytestTimeline('code',events,{now});
  assert.equal(timeline.total,4);
  assert.equal(timeline.currentCount,2);
  assert.equal(timeline.previousCount,2);
  const fun=timeline.axes.find(axis=>axis.id==='fun');
  assert.equal(fun.currentAverage,4);
  assert.equal(fun.previousAverage,3);
  assert.equal(fun.delta,1);
  assert.equal(timelineAxisTrend(timeline,'fun'),1);
});

test('timeline exposes Single Party and player-count context',()=>{
  const events=[
    {gameId:'code',scores:scores(4,4,4,4),mode:'party',playerCount:4,at:4},
    {gameId:'code',scores:scores(4,4,4,4),mode:'party',playerCount:4,at:3},
    {gameId:'code',scores:scores(4,4,4,4),mode:'single',playerCount:2,at:2},
    {gameId:'code',scores:scores(4,4,4,4),mode:'single',playerCount:1,at:1}
  ];
  const timeline=buildPlaytestTimeline('code',events,{now:10});
  assert.deepEqual(timeline.modes,{single:2,party:2});
  assert.deepEqual(timeline.playerCounts.map(row=>[row.playerCount,row.count]),[[1,1],[2,1],[4,2]]);
});

test('timeline does not invent a delta when one comparison window is empty',()=>{
  const day=86400000,now=new Date(2026,8,1,12).getTime();
  const timeline=buildPlaytestTimeline('code',[
    {gameId:'code',scores:scores(5,5,5,5),mode:'single',playerCount:1,at:now-day}
  ],{now});
  assert.equal(timeline.currentCount,1);
  assert.equal(timeline.previousCount,0);
  assert.equal(timeline.axes.find(axis=>axis.id==='fun').delta,null);
  assert.equal(timelineAxisTrend(timeline,'fun'),null);
});

test('forGame and valid-id filtering keep unrelated games out',()=>{
  const seed=JSON.stringify([
    {gameId:'code',scores:scores(4,4,4,4),mode:'single',playerCount:2,at:2},
    {gameId:'gate',scores:scores(5,5,5,5),mode:'party',playerCount:3,at:1}
  ]);
  const store=new PlaytestEventStore(memoryStorage({partyPocketPlaytestEventsV1:seed}));
  assert.deepEqual(store.forGame('code').map(e=>e.gameId),['code']);
  assert.deepEqual(store.all(['gate']).map(e=>e.gameId),['gate']);
});
