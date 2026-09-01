export const BACKUP_FORMAT='party-pocket-backup';
export const BACKUP_VERSION=1;
export const MAX_BACKUP_BYTES=2_000_000;
const PREFIX='partyPocket';
const JSON_KEYS=new Set([
  'partyPocketPlayersV3',
  'partyPocketPlayersV2',
  'partyPocketPlayers',
  'partyPocketPartyCheckpointV1',
  'partyPocketRatingsV1',
  'partyPocketPartySettingsV1',
  'partyPocketLibraryV1',
  'partyPocketPlaytestV1',
  'partyPocketPlaytestEventsV1',
  'partyPocketStatsV1',
  'partyPocketSoloProgressV1',
  'partyPocketSavedPartiesV1',
  'partyPocketPartyHistoryV1',
  'partyPocketPartyActiveV1'
]);

export function isManagedKey(key){
  return typeof key==='string'&&key.startsWith(PREFIX);
}

export function storageKeys(storage=globalThis.localStorage){
  const keys=[];
  const length=Number(storage?.length)||0;
  for(let i=0;i<length;i++){
    const key=storage.key?.(i);
    if(typeof key==='string')keys.push(key);
  }
  return keys;
}

export function managedKeys(storage=globalThis.localStorage){
  return storageKeys(storage).filter(isManagedKey).sort();
}

function byteSize(text){
  return new TextEncoder().encode(text).length;
}

function isoCompact(date=new Date()){
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
  const hh=String(date.getHours()).padStart(2,'0'),mm=String(date.getMinutes()).padStart(2,'0');
  return y+m+d+'-'+hh+mm;
}

export function backupFilename(date=new Date()){
  return 'party-pocket-backup-'+isoCompact(date)+'.json';
}

export function createBackup(storage=globalThis.localStorage,{date=new Date(),appVersion='unknown'}={}){
  const data={};
  for(const key of managedKeys(storage)){
    const value=storage.getItem?.(key);
    if(typeof value==='string')data[key]=value;
  }
  return{
    format:BACKUP_FORMAT,
    version:BACKUP_VERSION,
    appVersion:String(appVersion),
    exportedAt:date.toISOString(),
    data
  };
}

export function stringifyBackup(backup){
  return JSON.stringify(backup,null,2);
}

function validateKnownJson(key,value){
  if(!JSON_KEYS.has(key))return;
  try{JSON.parse(value)}catch{throw new Error('invalid JSON data: '+key)}
}

export function validateBackup(input){
  const value=typeof input==='string'?parseBackupText(input):input;
  if(!value||typeof value!=='object')throw new Error('invalid backup');
  if(value.format!==BACKUP_FORMAT)throw new Error('unsupported backup format');
  if(value.version!==BACKUP_VERSION)throw new Error('unsupported backup version');
  if(!value.data||typeof value.data!=='object'||Array.isArray(value.data))throw new Error('invalid backup data');

  const normalized={};
  for(const [key,raw] of Object.entries(value.data)){
    if(!isManagedKey(key))throw new Error('unmanaged key: '+key);
    if(typeof raw!=='string')throw new Error('backup values must be strings');
    validateKnownJson(key,raw);
    normalized[key]=raw;
  }

  const result={
    format:BACKUP_FORMAT,
    version:BACKUP_VERSION,
    appVersion:typeof value.appVersion==='string'?value.appVersion:'unknown',
    exportedAt:typeof value.exportedAt==='string'?value.exportedAt:'',
    data:normalized
  };
  const bytes=byteSize(JSON.stringify(result));
  if(bytes>MAX_BACKUP_BYTES)throw new Error('backup is too large');
  return{...result,bytes,keyCount:Object.keys(normalized).length};
}

export function parseBackupText(text){
  if(typeof text!=='string'||!text.trim())throw new Error('empty backup');
  if(byteSize(text)>MAX_BACKUP_BYTES)throw new Error('backup is too large');
  try{return JSON.parse(text)}catch{throw new Error('backup is not valid JSON')}
}

export function restoreBackup(storage=globalThis.localStorage,input){
  const backup=validateBackup(input);
  for(const key of managedKeys(storage))storage.removeItem?.(key);
  for(const [key,value] of Object.entries(backup.data))storage.setItem?.(key,value);
  return backup;
}

export function clearPartyPocketData(storage=globalThis.localStorage){
  const keys=managedKeys(storage);
  for(const key of keys)storage.removeItem?.(key);
  return keys.length;
}

export function backupSummary(input){
  const backup=validateBackup(input);
  return{
    keyCount:backup.keyCount,
    bytes:backup.bytes,
    appVersion:backup.appVersion,
    exportedAt:backup.exportedAt
  };
}
