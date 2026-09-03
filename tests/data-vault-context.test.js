import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DATA_VAULT_ROUTE_KEYS,
  DATA_VAULT_SERVICE_KEYS,
  DATA_VAULT_STORAGE_METHODS,
  createDataVaultContext
} from '../src/screens/data-vault-context.js';

function routeFixture(){
  return Object.fromEntries(DATA_VAULT_ROUTE_KEYS.map(key=>[key,()=>key]));
}

function storageFixture(){
  return{
    length:0,
    key:()=>null,
    getItem:()=>null,
    setItem:()=>{},
    removeItem:()=>{}
  };
}

test('Data Vault context groups routes, services, and config',()=>{
  const storage=storageFixture();
  const context=createDataVaultContext({
    routes:routeFixture(),
    updateBadge:()=>{},
    toast:()=>{},
    appVersion:'8.32.21',
    storage
  });

  assert.deepEqual(Object.keys(context.routes),DATA_VAULT_ROUTE_KEYS);
  assert.deepEqual(Object.keys(context.services),DATA_VAULT_SERVICE_KEYS);
  assert.equal(context.config.appVersion,'8.32.21');
  assert.equal(context.config.storage,storage);
  assert.equal(Object.isFrozen(context),true);
  assert.equal(Object.isFrozen(context.config),true);
});

test('Data Vault context rejects missing routes and services',()=>{
  const routes=routeFixture();
  routes.renderHome=null;
  assert.throws(()=>createDataVaultContext({
    routes,
    updateBadge:()=>{},
    toast:()=>{},
    appVersion:'8.32.21',
    storage:storageFixture()
  }),/missing Data Vault route: renderHome/);

  assert.throws(()=>createDataVaultContext({
    routes:routeFixture(),
    updateBadge:null,
    toast:()=>{},
    appVersion:'8.32.21',
    storage:storageFixture()
  }),/missing Data Vault service: updateBadge/);
});

test('Data Vault context validates app version and storage contract',()=>{
  assert.throws(()=>createDataVaultContext({
    routes:routeFixture(),
    updateBadge:()=>{},
    toast:()=>{},
    appVersion:'',
    storage:storageFixture()
  }),/missing Data Vault config: appVersion/);

  for(const method of DATA_VAULT_STORAGE_METHODS){
    const storage=storageFixture();
    storage[method]=null;
    assert.throws(()=>createDataVaultContext({
      routes:routeFixture(),
      updateBadge:()=>{},
      toast:()=>{},
      appVersion:'8.32.21',
      storage
    }),new RegExp('Data Vault storage must expose: '+method));
  }
});
