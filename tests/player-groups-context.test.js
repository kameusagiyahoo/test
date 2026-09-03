import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYER_GROUPS_ROUTE_KEYS,
  PLAYER_GROUPS_SERVICE_KEYS,
  PLAYER_GROUPS_STORE_KEYS,
  createPlayerGroupsContext
} from '../src/screens/player-groups-context.js';

function stateFixture(){
  return Object.fromEntries(PLAYER_GROUPS_STORE_KEYS.map(key=>[key,{key}]));
}

function routeFixture(){
  return Object.fromEntries(PLAYER_GROUPS_ROUTE_KEYS.map(key=>[key,()=>key]));
}

test('Player Groups context groups stores, routes, and services',()=>{
  const context=createPlayerGroupsContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    toast:()=>{}
  });

  assert.deepEqual(Object.keys(context.stores),PLAYER_GROUPS_STORE_KEYS);
  assert.deepEqual(Object.keys(context.routes),PLAYER_GROUPS_ROUTE_KEYS);
  assert.deepEqual(Object.keys(context.services),PLAYER_GROUPS_SERVICE_KEYS);
  assert.equal(Object.isFrozen(context),true);
  assert.equal(Object.isFrozen(context.stores),true);
  assert.equal(Object.isFrozen(context.routes),true);
});

test('Player Groups context rejects missing stores and routes',()=>{
  const state=stateFixture();
  delete state.session;
  assert.throws(()=>createPlayerGroupsContext({
    state,
    routes:routeFixture(),
    updateBadge:()=>{},
    toast:()=>{}
  }),/missing Player Groups store: session/);

  const routes=routeFixture();
  routes.renderHome=null;
  assert.throws(()=>createPlayerGroupsContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    toast:()=>{}
  }),/missing Player Groups route: renderHome/);
});

test('Player Groups context validates callable services and routes',()=>{
  const routes=routeFixture();
  routes.disposeActiveGame='bad';
  assert.throws(()=>createPlayerGroupsContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    toast:()=>{}
  }),/Player Groups route must be a function: disposeActiveGame/);

  assert.throws(()=>createPlayerGroupsContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    toast:null
  }),/missing Player Groups service: toast/);
});
