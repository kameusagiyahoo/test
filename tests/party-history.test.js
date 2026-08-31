import test from 'node:test';
import assert from 'node:assert/strict';
import {PartyHistoryStore,PARTY_HISTORY_LIMIT,partyLeadChanges,partyMvp} from '../src/core/party-history.js';

function memoryStorage(){
  const map=new Map();
  return{
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(String(key),String(value)),
    removeItem:key=>map.delete(key)
  };
}

test('party history keeps active rounds across store instances and completes into history',()=>{
  let now=100;
  const storage=memoryStorage(),store=new PartyHistoryStore(storage,()=>now++);
  store.begin({players:['A','B'],schedule:['code','gate','bomb']});
  store.recordRound({
    players:['A','B'],schedule:['code','gate','bomb'],gameId:'code',
    gameScores:[5,3],awards:[3,2],cumulativeScores:[3,2],winners:[0]
  });

  const restored=new PartyHistoryStore(storage,()=>now++);
  assert.equal(restored.active().rounds.length,1);
  restored.recordRound({
    players:['A','B'],schedule:['code','gate','bomb'],gameId:'gate',
    gameScores:[1,4],awards:[2,3],cumulativeScores:[5,5],winners:[1]
  });
  restored.recordRound({
    players:['A','B'],schedule:['code','gate','bomb'],gameId:'bomb',
    gameScores:[2,1],awards:[3,2],cumulativeScores:[8,7],winners:[0]
  });
  const completed=restored.complete({finalScores:[8,7],winners:[0]});
  assert.equal(completed.rounds.length,3);
  assert.equal(restored.active(),null);
  assert.equal(restored.history().length,1);
  assert.deepEqual(restored.history()[0].schedule,['code','gate','bomb']);
  assert.deepEqual(restored.history()[0].finalScores,[8,7]);
});

test('abandoned party never becomes completed history',()=>{
  const store=new PartyHistoryStore(memoryStorage(),()=>10);
  store.begin({players:['A','B'],schedule:['code','gate']});
  store.recordRound({
    players:['A','B'],schedule:['code','gate'],gameId:'code',
    gameScores:[1,0],awards:[3,0],cumulativeScores:[3,0],winners:[0]
  });
  store.abandon();
  assert.equal(store.active(),null);
  assert.deepEqual(store.history(),[]);
});

test('missing active state is reconstructed as partial when a round arrives',()=>{
  const store=new PartyHistoryStore(memoryStorage(),()=>20);
  const active=store.recordRound({
    players:['A','B'],schedule:['code','gate','bomb'],gameId:'gate',
    gameScores:[2,4],awards:[2,3],cumulativeScores:[5,6],winners:[1]
  });
  assert.equal(active.partial,true);
  assert.equal(active.rounds.length,1);
  assert.equal(active.rounds[0].gameId,'gate');
});

test('MVP supports ties in round wins',()=>{
  const entry={
    players:['A','B','C'],
    rounds:[
      {winners:[0]},
      {winners:[1]},
      {winners:[0,1]},
      {winners:[2]}
    ]
  };
  assert.deepEqual(partyMvp(entry),{indexes:[0,1],wins:2,names:['A','B']});
});

test('lead changes count changes in the cumulative leader set',()=>{
  const entry={rounds:[
    {cumulativeScores:[3,0,0]},
    {cumulativeScores:[3,3,0]},
    {cumulativeScores:[3,5,0]},
    {cumulativeScores:[6,5,0]},
    {cumulativeScores:[6,5,1]}
  ]};
  assert.equal(partyLeadChanges(entry),3);
});

test('completed party history is capped at fifty newest parties',()=>{
  let now=1;
  const store=new PartyHistoryStore(memoryStorage(),()=>now++);
  for(let i=0;i<PARTY_HISTORY_LIMIT+4;i++){
    store.begin({players:['A','B'],schedule:['code','gate']});
    store.recordRound({players:['A','B'],schedule:['code','gate'],gameId:'code',gameScores:[1,0],awards:[3,0],cumulativeScores:[3,0],winners:[0]});
    store.recordRound({players:['A','B'],schedule:['code','gate'],gameId:'gate',gameScores:[1,0],awards:[3,0],cumulativeScores:[6,0],winners:[0]});
    store.complete({finalScores:[6,0],winners:[0]});
  }
  assert.equal(store.history().length,PARTY_HISTORY_LIMIT);
});

test('history filters removed game ids and drops unusable parties',()=>{
  const store=new PartyHistoryStore(memoryStorage(),()=>1);
  store.begin({players:['A','B'],schedule:['code','gate','bomb']});
  store.recordRound({players:['A','B'],schedule:['code','gate','bomb'],gameId:'code',gameScores:[1,0],awards:[3,0],cumulativeScores:[3,0],winners:[0]});
  store.recordRound({players:['A','B'],schedule:['code','gate','bomb'],gameId:'gate',gameScores:[0,1],awards:[0,3],cumulativeScores:[3,3],winners:[1]});
  store.complete({finalScores:[3,3],winners:[0,1]});
  const filtered=store.history(['code','gate'])[0];
  assert.deepEqual(filtered.schedule,['code','gate']);
  assert.deepEqual(filtered.rounds.map(r=>r.gameId),['code','gate']);
  assert.deepEqual(store.history(['code']),[]);
});
