import test from 'node:test';
import assert from 'node:assert/strict';
import {registerGame,getGame} from '../src/core/registry.js';
import {gridGame} from '../src/games/grid.js';
import {allocationGame} from '../src/games/allocation.js';
import {portfolioGame} from '../src/games/portfolio.js';

test('advanced strategy games are valid registry modules',()=>{
  for(const game of [gridGame,allocationGame,portfolioGame]){
    registerGame(game);assert.equal(getGame(game.id),game);assert.equal(typeof game.mount,'function');
  }
});
