import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORY_DEFS,categoriesFor,filterGames,recommendedIds} from '../src/core/catalog.js';

const games=[
  {id:'sync',title:'シンクロ',description:'回答を合わせる',tags:['2〜8人']},
  {id:'code',title:'コードブレイカー',description:'数字を推理',tags:['頭脳']},
  {id:'isolation',title:'アイソレーション',description:'盤面を封鎖',tags:['完全情報']}
];

test('catalog categories have unique ids and known mappings',()=>{
  assert.equal(new Set(CATEGORY_DEFS.map(c=>c.id)).size,CATEGORY_DEFS.length);
  assert.ok(categoriesFor('isolation').includes('perfect'));
  assert.ok(categoriesFor('code').includes('duel'));
});

test('catalog filters by category and free-text search',()=>{
  assert.deepEqual(filterGames(games,{category:'perfect'}).map(g=>g.id),['isolation']);
  assert.deepEqual(filterGames(games,{query:'数字'}).map(g=>g.id),['code']);
  assert.deepEqual(filterGames(games,{category:'duel',query:'コード'}).map(g=>g.id),['code']);
});

test('recommendations adapt to group size',()=>{
  assert.deepEqual(recommendedIds(2),['isolation','code','gate']);
  assert.deepEqual(recommendedIds(4),['triad','logic','auction']);
  assert.deepEqual(recommendedIds(8),['minority','allocation','frontline']);
});
