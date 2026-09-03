import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTY_FLOW_CALLBACK_KEYS,
  PARTY_FLOW_SERVICE_KEYS,
  PARTY_FLOW_STORE_KEYS,
  createPartyFlowContext
} from '../src/screens/party/context.js';

function stateFixture(){
  return Object.fromEntries(PARTY_FLOW_STORE_KEYS.map(key=>[key,{key}]));
}

function callbackFixture(){
  return Object.fromEntries(PARTY_FLOW_CALLBACK_KEYS.map(key=>[key,()=>key]));
}

test('Party Flow context groups stores, callbacks, and services',()=>{
  const context=createPartyFlowContext({
    state:stateFixture(),
    callbacks:callbackFixture(),
    updateBadge:()=>{},
    toast:()=>{}
  });

  assert.deepEqual(Object.keys(context.stores),PARTY_FLOW_STORE_KEYS);
  assert.deepEqual(Object.keys(context.callbacks),PARTY_FLOW_CALLBACK_KEYS);
  assert.deepEqual(Object.keys(context.services),PARTY_FLOW_SERVICE_KEYS);
  assert.equal(Object.isFrozen(context),true);
  assert.equal(Object.isFrozen(context.stores),true);
  assert.equal(Object.isFrozen(context.callbacks),true);
  assert.equal(Object.isFrozen(context.services),true);
});

test('Party Flow context rejects missing stores and callbacks early',()=>{
  const state=stateFixture();
  delete state.session;
  assert.throws(()=>createPartyFlowContext({
    state,
    callbacks:callbackFixture(),
    updateBadge:()=>{},
    toast:()=>{}
  }),/missing Party Flow store: session/);

  const callbacks=callbackFixture();
  callbacks.renderHome=null;
  assert.throws(()=>createPartyFlowContext({
    state:stateFixture(),
    callbacks,
    updateBadge:()=>{},
    toast:()=>{}
  }),/missing Party Flow callback: renderHome/);
});

test('Party Flow context validates callable callbacks and services',()=>{
  const callbacks=callbackFixture();
  callbacks.bindPlaytest='not-a-function';
  assert.throws(()=>createPartyFlowContext({
    state:stateFixture(),
    callbacks,
    updateBadge:()=>{},
    toast:()=>{}
  }),/Party Flow callback must be a function: bindPlaytest/);

  assert.throws(()=>createPartyFlowContext({
    state:stateFixture(),
    callbacks:callbackFixture(),
    updateBadge:null,
    toast:()=>{}
  }),/missing Party Flow service: updateBadge/);
});
