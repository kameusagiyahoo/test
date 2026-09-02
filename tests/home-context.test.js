import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_ROUTE_KEYS,
  HOME_STATE_KEYS,
  createHomeContext
} from '../src/screens/home/context.js';

function stateFixture(){
  return Object.fromEntries(HOME_STATE_KEYS.map(key=>[key,{key}]));
}

function routeFixture(){
  return Object.fromEntries(HOME_ROUTE_KEYS.map(key=>[key,()=>key]));
}

test('Home context groups stores, routes, and services',()=>{
  const context=createHomeContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    toast:()=>{},
    soloDifficultyDetail:()=>{}
  });

  assert.deepEqual(Object.keys(context.stores),HOME_STATE_KEYS);
  assert.deepEqual(Object.keys(context.routes),HOME_ROUTE_KEYS);
  assert.deepEqual(Object.keys(context.services),['updateBadge','toast','soloDifficultyDetail']);
  assert.equal(Object.isFrozen(context),true);
  assert.equal(Object.isFrozen(context.stores),true);
  assert.equal(Object.isFrozen(context.routes),true);
});

test('Home context rejects missing stores and routes early',()=>{
  const state=stateFixture();
  delete state.session;
  assert.throws(()=>createHomeContext({
    state,
    routes:routeFixture(),
    updateBadge:()=>{},
    toast:()=>{},
    soloDifficultyDetail:()=>{}
  }),/missing Home store: session/);

  const routes=routeFixture();
  routes.renderGameDetail=null;
  assert.throws(()=>createHomeContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    toast:()=>{},
    soloDifficultyDetail:()=>{}
  }),/missing Home route: renderGameDetail/);
});

test('Home context validates callable services and routes',()=>{
  const routes=routeFixture();
  routes.startGame='not-a-function';
  assert.throws(()=>createHomeContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    toast:()=>{},
    soloDifficultyDetail:()=>{}
  }),/Home route must be a function: startGame/);

  assert.throws(()=>createHomeContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:null,
    toast:()=>{},
    soloDifficultyDetail:()=>{}
  }),/Home service must be a function: updateBadge/);
});
