import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlayerProfile,buildPlayerProfiles,topPlayerRecords} from '../src/core/player-profile.js';

const stats=[
  {gameId:'code',mode:'single',players:['A','B'],scores:[5,3],winners:[0],at:1},
  {gameId:'code',mode:'party',players:['A','B'],scores:[3,2],winners:[0],at:2},
  {gameId:'code',mode:'party',players:['A','B'],scores:[2,3],winners:[1],at:3},
  {gameId:'gate',mode:'party',players:['A','B','C'],scores:[3,1,2],winners:[0],at:4},
  {gameId:'gate',mode:'party',players:['A','B','C'],scores:[2,2,1],winners:[0,1],at:5},
  {gameId:'bomb',mode:'single',players:['B','C'],scores:[5,2],winners:[0],at:6}
];

const parties=[
  {
    id:'p3',players:['A','B','C'],schedule:['gate','code'],
    rounds:[{winners:[0]},{winners:[0,1]}],
    finalScores:[7,5,3],winners:[0],completedAt:30
  },
  {
    id:'p2',players:['A','B','C'],schedule:['code','gate'],
    rounds:[{winners:[1]},{winners:[1]}],
    finalScores:[4,6,4],winners:[1],completedAt:20
  },
  {
    id:'p1',players:['A','B'],schedule:['code','gate'],
    rounds:[{winners:[0]},{winners:[1]}],
    finalScores:[5,5],winners:[0,1],completedAt:10
  }
];

test('player profile aggregates game-level plays wins and best game',()=>{
  const p=buildPlayerProfile('A',stats,parties);
  assert.equal(p.plays,5);
  assert.equal(p.wins,4);
  assert.equal(p.singlePlays,1);
  assert.equal(p.partyRounds,4);
  assert.equal(p.gamesPlayed,2);
  assert.equal(p.bestGame.gameId,'gate');
  assert.equal(p.bestGame.plays,2);
  assert.equal(p.bestGame.wins,2);
  assert.equal(p.bestGame.winRate,1);
});

test('party career counts party wins MVPs and cumulative points',()=>{
  const p=buildPlayerProfile('A',stats,parties);
  assert.equal(p.partySessions,3);
  assert.equal(p.partyWins,2);
  assert.equal(p.mvpCount,2);
  assert.equal(p.partyPoints,16);
  assert.equal(p.partyWinRate,2/3);
});

test('rival record compares final party scores pairwise',()=>{
  const p=buildPlayerProfile('A',stats,parties);
  const b=p.rivals.find(r=>r.name==='B');
  const c=p.rivals.find(r=>r.name==='C');
  assert.deepEqual(
    {meetings:b.meetings,wins:b.wins,draws:b.draws,losses:b.losses},
    {meetings:3,wins:1,draws:1,losses:1}
  );
  assert.deepEqual(
    {meetings:c.meetings,wins:c.wins,draws:c.draws,losses:c.losses},
    {meetings:2,wins:1,draws:1,losses:0}
  );
});

test('recent party form preserves newest input order and marks win draw loss',()=>{
  const p=buildPlayerProfile('A',stats,parties);
  assert.deepEqual(p.recentParty.map(r=>({id:r.id,result:r.result})),[
    {id:'p3',result:'win'},
    {id:'p2',result:'loss'},
    {id:'p1',result:'draw'}
  ]);
});

test('buildPlayerProfiles includes names seen only in party history',()=>{
  const extra=[...parties,{
    id:'p4',players:['A','D'],schedule:['code','gate'],
    rounds:[{winners:[1]}],finalScores:[1,4],winners:[1],completedAt:40
  }];
  const profiles=buildPlayerProfiles(stats,extra);
  assert.ok(profiles.some(p=>p.name==='D'));
  assert.equal(profiles.find(p=>p.name==='D').partyWins,1);
});

test('records require five games before best win-rate is shown',()=>{
  const profiles=[
    {name:'A',plays:4,wins:4,winRate:1,partyWins:1,partySessions:1,mvpCount:1},
    {name:'B',plays:6,wins:3,winRate:3/6,partyWins:2,partySessions:2,mvpCount:0},
    {name:'C',plays:7,wins:3,winRate:3/7,partyWins:0,partySessions:1,mvpCount:3}
  ];
  const records=topPlayerRecords(profiles);
  assert.equal(records.mostWins.name,'A');
  assert.equal(records.bestWinRate.name,'B');
  assert.equal(records.mostPartyWins.name,'B');
  assert.equal(records.mostMvp.name,'C');
});

test('empty profile remains safe and record helpers return nulls',()=>{
  const p=buildPlayerProfile('Nobody',[],[]);
  assert.equal(p.plays,0);
  assert.equal(p.winRate,0);
  assert.equal(p.bestGame,null);
  assert.deepEqual(p.rivals,[]);
  assert.deepEqual(topPlayerRecords([]),{
    mostWins:null,bestWinRate:null,mostPartyWins:null,mostMvp:null
  });
});
