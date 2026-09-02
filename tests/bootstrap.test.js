import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {ALL_GAMES} from '../src/games/index.js';

test('game index registers every game module exactly once',async()=>{
  const files=(await readdir(new URL('../src/games/',import.meta.url)))
    .filter(name=>name.endsWith('.js')&&name!=='index.js')
    .map(name=>name.slice(0,-3))
    .sort();
  const ids=ALL_GAMES.map(game=>game.id).sort();

  assert.deepEqual(ids,files);
  assert.equal(new Set(ids).size,ids.length);
  for(const game of ALL_GAMES){
    assert.equal(typeof game.mount,'function');
  }
});
