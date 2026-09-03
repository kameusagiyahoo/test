import {createRequiredPicker} from '../app/context-contract.js';

const pickRequired=createRequiredPicker('Data Vault');

export const DATA_VAULT_ROUTE_KEYS=Object.freeze([
  'disposeActiveGame',
  'renderHome'
]);

export const DATA_VAULT_SERVICE_KEYS=Object.freeze([
  'updateBadge',
  'toast'
]);

export const DATA_VAULT_STORAGE_METHODS=Object.freeze([
  'key',
  'getItem',
  'setItem',
  'removeItem'
]);

function validateStorage(storage){
  if(!storage)throw new Error('missing Data Vault config: storage');
  for(const method of DATA_VAULT_STORAGE_METHODS){
    if(typeof storage[method]!=='function'){
      throw new TypeError(`Data Vault storage must expose: ${method}`);
    }
  }
  return storage;
}

export function createDataVaultContext({
  routes,
  updateBadge,
  toast,
  appVersion,
  storage=globalThis.localStorage
}){
  if(appVersion==null||String(appVersion).trim()===''){
    throw new Error('missing Data Vault config: appVersion');
  }

  return Object.freeze({
    routes:pickRequired(routes,DATA_VAULT_ROUTE_KEYS,'route',{functions:true}),
    services:pickRequired(
      {updateBadge,toast},
      DATA_VAULT_SERVICE_KEYS,
      'service',
      {functions:true}
    ),
    config:Object.freeze({
      appVersion:String(appVersion),
      storage:validateStorage(storage)
    })
  });
}
