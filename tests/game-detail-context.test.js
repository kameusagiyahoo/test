import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_DETAIL_ROUTE_KEYS,
  GAME_DETAIL_SERVICE_KEYS,
  GAME_DETAIL_STORE_KEYS,
  createGameDetailContext
} from '../src/screens/game-detail/context.js';

function stateFixture(){
  return Object.fromEntries(GAME_DETAIL_STORE_KEYS.map(key=>[key,{key}]));
}

function routeFixture(){
  return Object.fromEntries(GAME_DETAIL_ROUTE_KEYS.map(key=>[key,()=>key]));
}

test('Game Detail context groups stores, routes, and services',()=>{
  const context=createGameDetailContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    gameInsightData:()=>({})
  });

  assert.deepEqual(Object.keys(context.stores),GAME_DETAIL_STORE_KEYS);
  assert.deepEqual(Object.keys(context.routes),GAME_DETAIL_ROUTE_KEYS);
  assert.deepEqual(Object.keys(context.services),GAME_DETAIL_SERVICE_KEYS);
  assert.equal(Object.isFrozen(context),true);
  assert.equal(Object.isFrozen(context.stores),true);
  assert.equal(Object.isFrozen(context.routes),true);
});

test('Game Detail context rejects missing stores and routes',()=>{
  const state=stateFixture();
  delete state.session;
  assert.throws(()=>createGameDetailContext({
    state,
    routes:routeFixture(),
    updateBadge:()=>{},
    gameInsightData:()=>({})
  }),/missing Game Detail store: session/);

  const routes=routeFixture();
  routes.startGame=null;
  assert.throws(()=>createGameDetailContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    gameInsightData:()=>({})
  }),/missing Game Detail route: startGame/);
});

test('Game Detail context validates callable services and routes',()=>{
  const routes=routeFixture();
  routes.renderGameInsights='bad';
  assert.throws(()=>createGameDetailContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    gameInsightData:()=>({})
  }),/Game Detail route must be a function: renderGameInsights/);

  assert.throws(()=>createGameDetailContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    gameInsightData:null
  }),/missing Game Detail service: gameInsightData/);
});
