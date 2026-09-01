import test from 'node:test';
import assert from 'node:assert/strict';
import {
  achievementBoard,achievementDefinitions,achievementSummary,nextMilestones,
  playerAchievements,unlockedAchievements
} from '../src/core/achievements.js';

function profile(overrides={}){
  return{
    name:'A',plays:0,wins:0,partyWins:0,partySessions:0,mvpCount:0,partyPoints:0,
    gamesPlayed:0,gameStats:[],rivals:[],...overrides
  };
}

test('achievement definitions have unique ids and fourteen milestones',()=>{
  const defs=achievementDefinitions();
  assert.equal(defs.length,14);
  assert.equal(new Set(defs.map(d=>d.id)).size,defs.length);
  assert.ok(defs.every(d=>d.title&&d.description&&d.target>0));
});

test('first win and ten wins unlock exactly at their thresholds',()=>{
  const one=playerAchievements(profile({wins:1})),ten=playerAchievements(profile({wins:10}));
  assert.equal(one.find(a=>a.id==='first-win').unlocked,true);
  assert.equal(one.find(a=>a.id==='ten-wins').unlocked,false);
  assert.equal(ten.find(a=>a.id==='ten-wins').unlocked,true);
});

test('game breadth achievements count distinct games with at least one win',()=>{
  const p=profile({
    gamesPlayed:10,
    gameStats:[
      {gameId:'a',wins:2},{gameId:'b',wins:1},{gameId:'c',wins:1},
      {gameId:'d',wins:1},{gameId:'e',wins:1},{gameId:'f',wins:0},
      {gameId:'g',wins:0},{gameId:'h',wins:0},{gameId:'i',wins:0},{gameId:'j',wins:0}
    ]
  });
  const rows=playerAchievements(p);
  assert.equal(rows.find(a=>a.id==='explorer').unlocked,true);
  assert.equal(rows.find(a=>a.id==='all-rounder').unlocked,true);
  assert.equal(rows.find(a=>a.id==='broad-winner').unlocked,false);
});

test('specialist and rivalry use best single-game wins and maximum rival meetings',()=>{
  const p=profile({
    gameStats:[{gameId:'code',wins:5},{gameId:'gate',wins:2}],
    rivals:[{name:'B',meetings:5},{name:'C',meetings:2}]
  });
  const rows=playerAchievements(p);
  assert.equal(rows.find(a=>a.id==='specialist').unlocked,true);
  assert.equal(rows.find(a=>a.id==='rivalry').unlocked,true);
});

test('milestone progress is capped and next milestones favor closest completion',()=>{
  const p=profile({wins:9,plays:49,partyWins:0,partySessions:0});
  const rows=playerAchievements(p);
  assert.equal(rows.find(a=>a.id==='first-win').progress,1);
  const next=nextMilestones(p,2);
  assert.equal(next.length,2);
  assert.equal(next[0].progress>=next[1].progress,true);
  assert.ok(next.some(a=>a.id==='ten-wins'||a.id==='fifty-games'));
});

test('unlocked achievements only returns completed badges',()=>{
  const p=profile({wins:10,plays:50});
  const unlocked=unlockedAchievements(p);
  assert.ok(unlocked.some(a=>a.id==='first-win'));
  assert.ok(unlocked.some(a=>a.id==='ten-wins'));
  assert.ok(unlocked.some(a=>a.id==='fifty-games'));
  assert.ok(unlocked.every(a=>a.unlocked));
});

test('achievement board ranks unlocked count before play count',()=>{
  const a=profile({name:'A',wins:10,plays:10});
  const b=profile({name:'B',wins:1,plays:100});
  const board=achievementBoard([b,a]);
  assert.equal(board[0].name,'A');
  assert.ok(board[0].unlocked>board[1].unlocked);
});

test('achievement summary aggregates badges across players and exposes leader',()=>{
  const rows=[
    profile({name:'A',wins:10,plays:50}),
    profile({name:'B',wins:1,plays:2})
  ];
  const summary=achievementSummary(rows);
  assert.equal(summary.players,2);
  assert.equal(summary.possible,28);
  assert.equal(summary.leader.name,'A');
  assert.ok(summary.unlocked>=4);
});

test('empty achievements remain safe',()=>{
  assert.deepEqual(achievementBoard([]),[]);
  assert.deepEqual(achievementSummary([]),{players:0,unlocked:0,possible:0,leader:null});
});
