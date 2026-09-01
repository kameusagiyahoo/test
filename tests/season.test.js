import test from 'node:test';
import assert from 'node:assert/strict';
import {
  availableSeasonKeys,buildSeasonBoard,buildSeasonView,currentSeasonKey,previousSeasonKey,seasonLabel
} from '../src/core/season.js';

const ts=(y,m,d)=>new Date(y,m-1,d,12,0,0).getTime();

const stats=[
  {gameId:'code',mode:'single',players:['A','B'],winners:[0],at:ts(2026,9,1)},
  {gameId:'gate',mode:'party',players:['A','B'],winners:[1],at:ts(2026,9,2)},
  {gameId:'bomb',mode:'party',players:['A','B','C'],winners:[0,2],at:ts(2026,9,3)},
  {gameId:'code',mode:'single',players:['A','B'],winners:[1],at:ts(2026,8,15)}
];

const parties=[
  {
    players:['A','B'],finalScores:[7,5],winners:[0],completedAt:ts(2026,9,4),
    rounds:[{winners:[0]},{winners:[0]}]
  },
  {
    players:['A','B','C'],finalScores:[4,6,2],winners:[1],completedAt:ts(2026,9,5),
    rounds:[{winners:[1]},{winners:[1]}]
  },
  {
    players:['A','B'],finalScores:[3,5],winners:[1],completedAt:ts(2026,8,20),
    rounds:[{winners:[1]},{winners:[1]}]
  }
];

test('season keys and labels handle month boundaries',()=>{
  assert.equal(currentSeasonKey(new Date(2026,8,1)),'2026-09');
  assert.equal(previousSeasonKey('2026-01'),'2025-12');
  assert.equal(seasonLabel('2026-09'),'2026年9月');
});

test('available seasons include current month and historical months newest first',()=>{
  const keys=availableSeasonKeys(stats,parties,new Date(2026,8,1));
  assert.deepEqual(keys.slice(0,2),['2026-09','2026-08']);
});

test('season board aggregates wins party wins MVP and party points',()=>{
  const board=buildSeasonBoard('2026-09',stats,parties);
  const a=board.rows.find(r=>r.name==='A'),b=board.rows.find(r=>r.name==='B'),c=board.rows.find(r=>r.name==='C');
  assert.equal(board.totalPlays,3);
  assert.equal(board.partySessions,2);
  assert.equal(board.gamesPlayed,3);
  assert.equal(a.wins,2);
  assert.equal(a.partyWins,1);
  assert.equal(a.mvpCount,1);
  assert.equal(a.partyPoints,11);
  assert.equal(b.wins,1);
  assert.equal(b.partyWins,1);
  assert.equal(b.mvpCount,1);
  assert.equal(c.wins,1);
});

test('season ranking uses wins before party wins and MVP',()=>{
  const board=buildSeasonBoard('2026-09',stats,parties);
  assert.equal(board.rows[0].name,'A');
  assert.equal(board.rows[0].wins,2);
});

test('season view compares current values with previous month',()=>{
  const view=buildSeasonView('2026-09',stats,parties);
  const a=view.rows.find(r=>r.name==='A'),b=view.rows.find(r=>r.name==='B');
  assert.equal(a.deltaWins,2);
  assert.equal(a.deltaPartyWins,1);
  assert.equal(b.deltaWins,0);
  assert.equal(b.deltaPartyWins,0);
  assert.equal(a.rank,1);
});

test('empty month remains safe',()=>{
  const board=buildSeasonView('2026-07',stats,parties);
  assert.equal(board.totalPlays,0);
  assert.deepEqual(board.rows,[]);
});
