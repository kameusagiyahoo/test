import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSmartParty,buildSmartPartyWithLocks,recentGameIdsForPlayers,replaceSmartPartyGame,scorePartyGame,smartPartyReasons,summarizeSmartParty
} from '../src/core/recommender.js';

const game=id=>({id,title:id,description:'',tags:[]});

test('recent party history is scoped to the exact player lineup and ignores single games',()=>{
  const entries=[
    {mode:'party',gameId:'gate',players:['A','B']},
    {mode:'single',gameId:'code',players:['A','B']},
    {mode:'party',gameId:'sync',players:['A','C']},
    {mode:'party',gameId:'auction',players:['A','B']},
    {mode:'party',gameId:'gate',players:['A','B']}
  ];
  assert.deepEqual(recentGameIdsForPlayers(entries,['A','B']),['gate','auction']);
  assert.deepEqual(recentGameIdsForPlayers(entries,['B','A']),[]);
});

test('recommended player fit is strongly preferred over an otherwise neutral mismatch',()=>{
  const fit=scorePartyGame(game('gate'),{playerCount:2});
  const mismatch=scorePartyGame(game('minority'),{playerCount:2});
  assert.ok(fit.score>mismatch.score+5);
  assert.ok(fit.reasons.includes('人数に合う'));
});

test('favorites gain score while recent games are penalized',()=>{
  const base=scorePartyGame(game('code'),{playerCount:2});
  const favorite=scorePartyGame(game('code'),{playerCount:2,favoriteIds:['code']});
  const recent=scorePartyGame(game('code'),{playerCount:2,recentIds:['code']});
  assert.ok(favorite.score>base.score);
  assert.ok(recent.score<base.score);
});

test('healthy games beat action-status games when other signals match',()=>{
  const playtestRows=[
    {gameId:'code',qualityAverage:4.2},
    {gameId:'gate',qualityAverage:4.2}
  ];
  const healthy=scorePartyGame(game('code'),{
    playerCount:2,playtestRows,healthRows:[{gameId:'code',status:'healthy'}]
  });
  const action=scorePartyGame(game('gate'),{
    playerCount:2,playtestRows,healthRows:[{gameId:'gate',status:'action'}]
  });
  assert.ok(healthy.score>action.score+4);
});

test('smart party returns unique games and obeys allowed game ids',()=>{
  const games=['code','gate','triad','bomb','clock','sync'].map(game);
  const party=buildSmartParty(games,{
    playerCount:2,
    rounds:3,
    allowedGameIds:['code','gate','bomb'],
    rng:()=>0.5
  });
  assert.equal(party.length,3);
  assert.equal(new Set(party.map(g=>g.id)).size,3);
  assert.ok(party.every(g=>['code','gate','bomb'].includes(g.id)));
});

test('recent play and health signals can change the selected set',()=>{
  const games=['code','gate','isolation','bomb'].map(game);
  const normal=buildSmartParty(games,{playerCount:2,rounds:2,rng:()=>0.5});
  const adjusted=buildSmartParty(games,{
    playerCount:2,rounds:2,
    recentIds:['code'],
    healthRows:[{gameId:'gate',status:'action'}],
    rng:()=>0.5
  });
  assert.ok(normal.some(g=>g.id==='code'||g.id==='gate'));
  assert.ok(!adjusted.map(g=>g.id).includes('gate'));
});

test('smart party does not build for a solo lineup',()=>{
  const party=buildSmartParty(['memory','route','pattern'].map(game),{
    playerCount:1,rounds:3,rng:()=>0.5
  });
  assert.deepEqual(party,[]);
});

test('summary adds estimated minutes and distinct difficulty levels',()=>{
  const info=summarizeSmartParty(['bomb','code','gate'].map(game));
  assert.equal(info.count,3);
  assert.equal(info.totalMinutes,21);
  assert.deepEqual(info.difficulties,[1,2,3]);
});

test('locked games survive a smart rebuild',()=>{
  const games=['code','gate','isolation','bomb','clock'].map(game);
  const rebuilt=buildSmartPartyWithLocks(games,{
    playerCount:2,
    rounds:3,
    lockedIds:['gate'],
    recentIds:['code'],
    rng:()=>0.5
  });
  assert.equal(rebuilt.length,3);
  assert.equal(rebuilt[0].id,'gate');
  assert.equal(new Set(rebuilt.map(g=>g.id)).size,3);
});

test('single-game replacement never returns the target or another selected game',()=>{
  const games=['code','gate','isolation','bomb','clock'].map(game);
  const replacement=replaceSmartPartyGame(
    games,
    ['code','gate','bomb'],
    'gate',
    {playerCount:2,rng:()=>0.5}
  );
  assert.ok(replacement);
  assert.ok(!['code','gate','bomb'].includes(replacement.id));
});

test('replacement obeys allowed candidate restrictions',()=>{
  const games=['code','gate','isolation','bomb','clock'].map(game);
  const replacement=replaceSmartPartyGame(
    games,
    ['code','gate'],
    'gate',
    {playerCount:2,allowedGameIds:['code','clock'],rng:()=>0.5}
  );
  assert.equal(replacement.id,'clock');
});

test('smart party reasons expose human-readable positive signals',()=>{
  const reasons=smartPartyReasons(game('code'),{
    playerCount:2,
    favoriteIds:['code'],
    playtestRows:[{gameId:'code',qualityAverage:4.4}],
    healthRows:[{gameId:'code',status:'healthy'}]
  });
  assert.ok(reasons.includes('人数に合う'));
  assert.ok(reasons.includes('お気に入り'));
  assert.ok(reasons.includes('高評価'));
  assert.ok(reasons.includes('健全'));
});
