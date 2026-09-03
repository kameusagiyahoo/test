import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTY_HISTORY_ROUTE_KEYS,
  PARTY_HISTORY_SERVICE_KEYS,
  PARTY_HISTORY_STORE_KEYS,
  createPartyHistoryContext
} from '../src/screens/party-history-context.js';

function stateFixture(){
  return Object.fromEntries(PARTY_HISTORY_STORE_KEYS.map(key=>[key,{key}]));
}

function routeFixture(){
  return Object.fromEntries(PARTY_HISTORY_ROUTE_KEYS.map(key=>[key,()=>key]));
}

test('Party History context groups stores, routes, and services',()=>{
  const context=createPartyHistoryContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    toast:()=>{},
    sharePartyCard:()=>{}
  });

  assert.deepEqual(Object.keys(context.stores),PARTY_HISTORY_STORE_KEYS);
  assert.deepEqual(Object.keys(context.routes),PARTY_HISTORY_ROUTE_KEYS);
  assert.deepEqual(Object.keys(context.services),PARTY_HISTORY_SERVICE_KEYS);
  assert.equal(Object.isFrozen(context),true);
  assert.equal(Object.isFrozen(context.stores),true);
  assert.equal(Object.isFrozen(context.routes),true);
});

test('Party History context rejects missing stores and routes',()=>{
  const state=stateFixture();
  delete state.partyHistory;
  assert.throws(()=>createPartyHistoryContext({
    state,
    routes:routeFixture(),
    updateBadge:()=>{},
    toast:()=>{},
    sharePartyCard:()=>{}
  }),/missing Party History store: partyHistory/);

  const routes=routeFixture();
  routes.startTrackedSchedule=null;
  assert.throws(()=>createPartyHistoryContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    toast:()=>{},
    sharePartyCard:()=>{}
  }),/missing Party History route: startTrackedSchedule/);
});

test('Party History context validates callable services and routes',()=>{
  const routes=routeFixture();
  routes.renderHome='bad';
  assert.throws(()=>createPartyHistoryContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    toast:()=>{},
    sharePartyCard:()=>{}
  }),/Party History route must be a function: renderHome/);

  assert.throws(()=>createPartyHistoryContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    toast:null,
    sharePartyCard:()=>{}
  }),/missing Party History service: toast/);
});
