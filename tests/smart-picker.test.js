import test from 'node:test';
import assert from 'node:assert/strict';
import {difficultyLabel,filterGames,gameMeta,pickGame,playerRangeLabel} from '../src/core/catalog.js';

const games=[
  {id:'clock',title:'体内時計',description:'時間感覚',tags:['2〜8人']},
  {id:'code',title:'コードブレイカー',description:'数字推理',tags:['頭脳']},
  {id:'isolation',title:'アイソレーション',description:'盤面封鎖',tags:['完全情報']},
  {id:'minority',title:'少数派',description:'投票',tags:['会話']}
];

test('game metadata exposes difficulty time and recommended players',()=>{
  const meta=gameMeta('isolation');
  assert.deepEqual(meta,{difficulty:3,minutes:10,minPlayers:2,maxPlayers:4});
  assert.equal(difficultyLabel(3),'しっかり');
  assert.equal(playerRangeLabel(meta),'2〜4人');
});

test('smart filters combine player fit difficulty and time',()=>{
  assert.deepEqual(
    filterGames(games,{playerCount:2,recommendedOnly:true,maxMinutes:7}).map(g=>g.id),
    ['clock','code']
  );
  assert.deepEqual(
    filterGames(games,{playerCount:5,recommendedOnly:true,difficulty:1}).map(g=>g.id),
    ['clock','minority']
  );
  assert.deepEqual(
    filterGames(games,{playerCount:2,recommendedOnly:true,difficulty:3,maxMinutes:8}),
    []
  );
});

test('smart picker uses the currently filtered candidate set',()=>{
  const picked=pickGame(games,{playerCount:2,recommendedOnly:true,maxMinutes:7},()=>0.99);
  assert.equal(picked.id,'code');
  assert.equal(pickGame(games,{difficulty:3,maxMinutes:5},()=>0),null);
});

test('all 24 production games have explicit metadata',()=>{
  const ids=['sync','bomb','five','minority','sniper','taboo','clock','ten','code','logic','ev','auction','grid','allocation','portfolio','sequence','frontline','priority','isolation','gate','triad','memory','route','pattern'];
  for(const id of ids){
    const meta=gameMeta(id);
    assert.ok([1,2,3].includes(meta.difficulty),id);
    assert.ok(meta.minutes>=3&&meta.minutes<=10,id);
    assert.ok(meta.minPlayers>=1&&meta.maxPlayers<=8&&meta.minPlayers<=meta.maxPlayers,id);
  }
});
