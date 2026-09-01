import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGameInsights,gameInsightHeadline,trendLabel} from '../src/core/game-insights.js';

const day=86400000;
const now=new Date(2026,8,1,12,0,0).getTime();

const entries=[
  {gameId:'code',mode:'single',players:['A','B'],winners:[0],at:now-2*day},
  {gameId:'code',mode:'party',players:['A','B','C'],winners:[1],at:now-5*day},
  {gameId:'code',mode:'party',players:['A','B'],winners:[0,1],at:now-20*day},
  {gameId:'code',mode:'single',players:['A','C'],winners:[2],at:now-35*day},
  {gameId:'code',mode:'single',players:['A','B'],winners:[1],at:now-50*day},
  {gameId:'gate',mode:'single',players:['A','B'],winners:[0],at:now-1*day}
];

const playtest={
  responses:3,legacyResponses:1,qualityAverage:4,
  fun:{average:4.5,count:3},
  clarity:{average:3.5,count:3},
  brain:{average:4.8,count:3},
  replay:{average:4,count:3}
};

const health={
  status:'watch',plays:5,reviews:3,
  issues:[{type:'dominance',severity:'medium',title:'偏り',detail:'detail',action:'check'}]
};

test('game insights filter one game and split Single Party modes',()=>{
  const insight=buildGameInsights('code',entries,playtest,health,{now});
  assert.equal(insight.plays,5);
  assert.equal(insight.single,3);
  assert.equal(insight.party,2);
  assert.equal(insight.singleShare,3/5);
  assert.equal(insight.partyShare,2/5);
});

test('30 day trend compares adjacent windows without mixing them',()=>{
  const insight=buildGameInsights('code',entries,playtest,health,{now});
  assert.equal(insight.current30,3);
  assert.equal(insight.previous30,2);
  assert.equal(insight.trendDelta,1);
  assert.equal(trendLabel(insight),'+1');
  assert.equal(gameInsightHeadline(insight),'直近30日でプレイ増加');
});

test('player results include ties and sort by wins then rate',()=>{
  const insight=buildGameInsights('code',entries,playtest,health,{now});
  const a=insight.players.find(p=>p.name==='A');
  const b=insight.players.find(p=>p.name==='B');
  const c=insight.players.find(p=>p.name==='C');
  assert.equal(a.plays,5);
  assert.equal(a.wins,2);
  assert.equal(b.plays,4);
  assert.equal(b.wins,3);
  assert.equal(c.plays,2);
  assert.equal(c.wins,0);
  assert.equal(insight.players[0].name,'B');
});

test('player-count buckets describe how the game is actually played',()=>{
  const insight=buildGameInsights('code',entries,playtest,health,{now});
  assert.deepEqual(insight.playerCountBuckets.map(row=>[row.playerCount,row.plays]),[[2,4],[3,1]]);
  assert.equal(insight.playerCountBuckets[0].share,4/5);
});

test('playtest axes and health findings are passed through without inventing history',()=>{
  const insight=buildGameInsights('code',entries,playtest,health,{now});
  assert.equal(insight.reviews,3);
  assert.equal(insight.legacyReviews,1);
  assert.equal(insight.qualityAverage,4);
  assert.equal(insight.axes.find(a=>a.id==='fun').average,4.5);
  assert.equal(insight.health.status,'watch');
  assert.equal(insight.health.issues[0].title,'偏り');
});

test('recent results are newest first and capped at ten',()=>{
  const many=Array.from({length:14},(_,i)=>({
    gameId:'code',mode:'single',players:['A'],winners:[0],at:now-i*day
  }));
  const insight=buildGameInsights('code',many,{},null,{now});
  assert.equal(insight.recent.length,10);
  assert.equal(insight.recent[0].at,now);
  assert.ok(insight.recent[0].at>insight.recent[9].at);
});

test('empty game insight is safe and reports no live trend',()=>{
  const insight=buildGameInsights('missing',entries,{},null,{now});
  assert.equal(insight.plays,0);
  assert.equal(insight.current30,0);
  assert.equal(insight.previous30,0);
  assert.deepEqual(insight.players,[]);
  assert.deepEqual(insight.playerCountBuckets,[]);
  assert.equal(gameInsightHeadline(insight),'まだ実戦データなし');
  assert.equal(trendLabel(insight),'0');
});
