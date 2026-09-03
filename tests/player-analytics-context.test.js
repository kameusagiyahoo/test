import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYER_ANALYTICS_ROUTE_KEYS,
  PLAYER_ANALYTICS_SERVICE_KEYS,
  PLAYER_ANALYTICS_STORE_KEYS,
  createPlayerAnalyticsContext
} from '../src/screens/analytics/player-analytics-context.js';

function stateFixture(){
  return Object.fromEntries(PLAYER_ANALYTICS_STORE_KEYS.map(key=>[key,{key}]));
}

function routeFixture(){
  return Object.fromEntries(PLAYER_ANALYTICS_ROUTE_KEYS.map(key=>[key,()=>key]));
}

test('Player Analytics context groups stores, routes, and services',()=>{
  const context=createPlayerAnalyticsContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    shareProfileCard:()=>{}
  });

  assert.deepEqual(Object.keys(context.stores),PLAYER_ANALYTICS_STORE_KEYS);
  assert.deepEqual(Object.keys(context.routes),PLAYER_ANALYTICS_ROUTE_KEYS);
  assert.deepEqual(Object.keys(context.services),PLAYER_ANALYTICS_SERVICE_KEYS);
  assert.equal(Object.isFrozen(context),true);
  assert.equal(Object.isFrozen(context.stores),true);
  assert.equal(Object.isFrozen(context.routes),true);
});

test('Player Analytics context rejects missing stores and routes',()=>{
  const state=stateFixture();
  delete state.stats;
  assert.throws(()=>createPlayerAnalyticsContext({
    state,
    routes:routeFixture(),
    updateBadge:()=>{},
    shareProfileCard:()=>{}
  }),/missing Player Analytics store: stats/);

  const routes=routeFixture();
  routes.renderGameDetail=null;
  assert.throws(()=>createPlayerAnalyticsContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    shareProfileCard:()=>{}
  }),/missing Player Analytics route: renderGameDetail/);
});

test('Player Analytics context validates callable services and routes',()=>{
  const routes=routeFixture();
  routes.renderHome='bad';
  assert.throws(()=>createPlayerAnalyticsContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    shareProfileCard:()=>{}
  }),/Player Analytics route must be a function: renderHome/);

  assert.throws(()=>createPlayerAnalyticsContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:null,
    shareProfileCard:()=>{}
  }),/missing Player Analytics service: updateBadge/);
});
