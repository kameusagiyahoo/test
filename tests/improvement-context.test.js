import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMPROVEMENT_ROUTE_KEYS,
  IMPROVEMENT_STORE_KEYS,
  IMPROVEMENT_WORKFLOW_METHODS,
  createImprovementContext
} from '../src/screens/analytics/improvement-context.js';

function stateFixture(){
  return Object.fromEntries(IMPROVEMENT_STORE_KEYS.map(key=>[key,{key}]));
}

function routeFixture(){
  return Object.fromEntries(IMPROVEMENT_ROUTE_KEYS.map(key=>[key,()=>key]));
}

function workflowFixture(){
  return Object.fromEntries(IMPROVEMENT_WORKFLOW_METHODS.map(key=>[key,()=>key]));
}

test('Improvement context groups stores, routes, and services',()=>{
  const context=createImprovementContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    experimentWorkflow:workflowFixture()
  });

  assert.deepEqual(Object.keys(context.stores),IMPROVEMENT_STORE_KEYS);
  assert.deepEqual(Object.keys(context.routes),IMPROVEMENT_ROUTE_KEYS);
  assert.equal(typeof context.services.updateBadge,'function');
  assert.equal(typeof context.services.experimentWorkflow.advance,'function');
  assert.equal(Object.isFrozen(context),true);
});

test('Improvement context rejects missing stores and routes',()=>{
  const state=stateFixture();
  delete state.playtests;
  assert.throws(()=>createImprovementContext({
    state,
    routes:routeFixture(),
    updateBadge:()=>{},
    experimentWorkflow:workflowFixture()
  }),/missing Improvement store: playtests/);

  const routes=routeFixture();
  routes.renderGameInsights=null;
  assert.throws(()=>createImprovementContext({
    state:stateFixture(),
    routes,
    updateBadge:()=>{},
    experimentWorkflow:workflowFixture()
  }),/missing Improvement route: renderGameInsights/);
});

test('Improvement context validates workflow and callable services',()=>{
  const workflow=workflowFixture();
  delete workflow.advance;
  assert.throws(()=>createImprovementContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:()=>{},
    experimentWorkflow:workflow
  }),/Improvement experimentWorkflow must expose: advance/);

  assert.throws(()=>createImprovementContext({
    state:stateFixture(),
    routes:routeFixture(),
    updateBadge:'bad',
    experimentWorkflow:workflowFixture()
  }),/Improvement service must be a function: updateBadge/);
});
