import test from 'node:test';
import assert from 'node:assert/strict';
import {
  partyShareModel,profileShareModel,renderPartyShareSvg,renderProfileShareSvg,shareCardFilename
} from '../src/core/share-card.js';

test('party share model ranks tied scores and derives MVP',()=>{
  const model=partyShareModel({
    players:['A','B','C'],
    schedule:['code','gate','bomb'],
    finalScores:[7,7,3],
    winners:[0,1],
    rounds:[
      {gameId:'code',winners:[0]},
      {gameId:'gate',winners:[1]},
      {gameId:'bomb',winners:[0,1]}
    ]
  },{gameNames:{code:'Code',gate:'Gate',bomb:'Bomb'}});
  assert.equal(model.title,'A & B WIN');
  assert.deepEqual(model.ranking.map(r=>r.rank),[1,1,3]);
  assert.deepEqual(model.mvp,['A','B']);
  assert.equal(model.rounds[0].game,'Code');
});

test('profile share model contains career KPIs best games and achievements',()=>{
  const model=profileShareModel({
    name:'A',plays:12,wins:7,winRate:7/12,partyWins:2,mvpCount:3,gamesPlayed:5,
    gameStats:[{gameId:'code',wins:4,plays:5},{gameId:'gate',wins:2,plays:3}]
  },{
    gameNames:{code:'コードブレイカー',gate:'ゲートライン'},
    achievements:[{symbol:'M3',title:'MVP MASTER'}]
  });
  assert.equal(model.title,'A');
  assert.equal(model.kpis[0][1],7);
  assert.equal(model.best[0].name,'コードブレイカー');
  assert.equal(model.achievements[0].title,'MVP MASTER');
});

test('share SVGs have fixed card dimensions and escape user text',()=>{
  const party=renderPartyShareSvg(partyShareModel({
    players:['<A>','B'],schedule:['code','gate'],finalScores:[3,2],winners:[0],
    rounds:[{gameId:'code',winners:[0]}]
  },{gameNames:{code:'A&B'}}));
  assert.match(party,/width="1080" height="1350"/);
  assert.ok(!party.includes('<A>'));
  assert.ok(party.includes('&lt;A&gt;'));
  assert.ok(party.includes('A&amp;B'));

  const profile=renderProfileShareSvg(profileShareModel({
    name:'<script>',plays:1,wins:1,winRate:1,partyWins:0,mvpCount:0,gamesPlayed:1,gameStats:[]
  }));
  assert.ok(!profile.includes('<script>'));
  assert.ok(profile.includes('&lt;script&gt;'));
});

test('share filename is stable safe and dated',()=>{
  const name=shareCardFilename('profile','A / B',new Date(2026,8,1));
  assert.equal(name,'party-pocket-profile-A-B-20260901.png');
});
