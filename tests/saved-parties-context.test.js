import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVED_PARTIES_ROUTE_KEYS,
  SAVED_PARTIES_SERVICE_KEYS,
  SAVED_PARTIES_STORE_KEYS,
  createSavedPartiesContext
} from '../src/screens/saved-parties-context.js';

function stateFixture(){
  return Object.fromEntries(SAVED_PARTIES_STORE_KEYS.map(key=>[key,{key}]));
}

function routeFixture(){
  return Object.fromEntries(SAVED_PARTIES_ROUTE_KEYS.map(key=>[key,()=>key]));
}

test('Saved Parties context groups stores, routes, and services',()=>{
  const context=createSavedPartiesContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{}
  });

  assert.deepEqual(Object.keys(context.stores),SAVED_PARTIES_STORE_KEYS);
  assert.deepEqual(Object.keys(context.routes),SAVED_PARTIES_ROUTE_KEYS);
  assert.deepEqual(Object.keys(context.services),SAVED_PARTIES_SERVICE_KEYS);
  assert.equal(Object.isFrozen(context),true);
  assert.equal(Object.isFrozen(context.stores),true);
  assert.equal(Object.isFrozen(context.routes),true);
});

test('Saved Parties context rejects missing stores and routes',()=>{
  const state=stateFixture();
  delete state.savedParties;
  assert.throws(()=>createSavedPartiesContext({
    state,
    routes:routeFixture(),
    updateBadge:()=>{}
  }),/missing Saved Parties store: savedParties/);

  const routes=routeFixture();
  routes.startTrackedSchedule=null;
  assert.throws(()=>createSavedPartiesContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{}
  }),/missing Saved Parties route: startTrackedSchedule/);
});

test('Saved Parties context validates callable services and routes',()=>{
  const routes=routeFixture();
  routes.renderPartyIntermission='bad';
  assert.throws(()=>createSavedPartiesContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{}
  }),/Saved Parties route must be a function: renderPartyIntermission/);

  assert.throws(()=>createSavedPartiesContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:null
  }),/missing Saved Parties service: updateBadge/);
});
