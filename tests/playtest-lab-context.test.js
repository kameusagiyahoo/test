import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYTEST_LAB_ROUTE_KEYS,
  PLAYTEST_LAB_SERVICE_KEYS,
  PLAYTEST_LAB_STORE_KEYS,
  createPlaytestLabContext
} from '../src/screens/analytics/playtest-lab-context.js';

function stateFixture(){
  return Object.fromEntries(PLAYTEST_LAB_STORE_KEYS.map(key=>[key,{key}]));
}

function routeFixture(){
  return Object.fromEntries(PLAYTEST_LAB_ROUTE_KEYS.map(key=>[key,()=>key]));
}

test('Playtest Lab context groups stores, routes, and services',()=>{
  const context=createPlaytestLabContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    openGameDetail:()=>{}
  });

  assert.deepEqual(Object.keys(context.stores),PLAYTEST_LAB_STORE_KEYS);
  assert.deepEqual(Object.keys(context.routes),PLAYTEST_LAB_ROUTE_KEYS);
  assert.deepEqual(Object.keys(context.services),PLAYTEST_LAB_SERVICE_KEYS);
  assert.equal(Object.isFrozen(context),true);
  assert.equal(Object.isFrozen(context.stores),true);
  assert.equal(Object.isFrozen(context.routes),true);
});

test('Playtest Lab context rejects missing stores and routes',()=>{
  const state=stateFixture();
  delete state.playtests;
  assert.throws(()=>createPlaytestLabContext({
    state,
    routes:routeFixture(),
    updateBadge:()=>{},
    openGameDetail:()=>{}
  }),/missing Playtest Lab store: playtests/);

  const routes=routeFixture();
  routes.renderHome=null;
  assert.throws(()=>createPlaytestLabContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    openGameDetail:()=>{}
  }),/missing Playtest Lab route: renderHome/);
});

test('Playtest Lab context validates callable services and routes',()=>{
  const routes=routeFixture();
  routes.disposeActiveGame='bad';
  assert.throws(()=>createPlaytestLabContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    openGameDetail:()=>{}
  }),/Playtest Lab route must be a function: disposeActiveGame/);

  assert.throws(()=>createPlaytestLabContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    openGameDetail:null
  }),/missing Playtest Lab service: openGameDetail/);
});
