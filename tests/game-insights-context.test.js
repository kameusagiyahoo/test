import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_INSIGHTS_ROUTE_KEYS,
  GAME_INSIGHTS_STORE_KEYS,
  EXPERIMENT_WORKFLOW_METHODS,
  createGameInsightsContext
} from '../src/screens/analytics/game-insights-context.js';

function stateFixture(){
  return Object.fromEntries(GAME_INSIGHTS_STORE_KEYS.map(key=>[key,{key}]));
}

function routeFixture(){
  return Object.fromEntries(GAME_INSIGHTS_ROUTE_KEYS.map(key=>[key,()=>key]));
}

function workflowFixture(){
  return Object.fromEntries(EXPERIMENT_WORKFLOW_METHODS.map(key=>[key,()=>key]));
}

test('Game Insights context groups stores, routes, and services',()=>{
  const context=createGameInsightsContext({
    state:stateFixture(),
    routes:routeFixture(),
    experimentWorkflow:workflowFixture(),
    updateBadge:()=>{},
    toast:()=>{},
    soloDifficultyDetail:()=>{}
  });

  assert.deepEqual(Object.keys(context.stores),GAME_INSIGHTS_STORE_KEYS);
  assert.deepEqual(Object.keys(context.routes),GAME_INSIGHTS_ROUTE_KEYS);
  assert.equal(typeof context.services.experimentWorkflow.advance,'function');
  assert.equal(Object.isFrozen(context),true);
});

test('Game Insights context rejects missing stores and routes',()=>{
  const state=stateFixture();
  delete state.stats;
  assert.throws(()=>createGameInsightsContext({
    state,
    routes:routeFixture(),
    experimentWorkflow:workflowFixture(),
    updateBadge:()=>{},
    toast:()=>{},
    soloDifficultyDetail:()=>{}
  }),/missing Game Insights store: stats/);

  const routes=routeFixture();
  routes.renderGameDetail=null;
  assert.throws(()=>createGameInsightsContext({
    state:stateFixture(),
    routes,
    experimentWorkflow:workflowFixture(),
    updateBadge:()=>{},
    toast:()=>{},
    soloDifficultyDetail:()=>{}
  }),/missing Game Insights route: renderGameDetail/);
});

test('Game Insights context validates workflow and callable services',()=>{
  const workflow=workflowFixture();
  delete workflow.advance;
  assert.throws(()=>createGameInsightsContext({
    state:stateFixture(),
    routes:routeFixture(),
    experimentWorkflow:workflow,
    updateBadge:()=>{},
    toast:()=>{},
    soloDifficultyDetail:()=>{}
  }),/Game Insights experimentWorkflow must expose: advance/);

  assert.throws(()=>createGameInsightsContext({
    state:stateFixture(),
    routes:routeFixture(),
    experimentWorkflow:workflowFixture(),
    updateBadge:'bad',
    toast:()=>{},
    soloDifficultyDetail:()=>{}
  }),/Game Insights service must be a function: updateBadge/);
});
