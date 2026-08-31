import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_FORMAT,BACKUP_VERSION,backupFilename,backupSummary,clearPartyPocketData,
  createBackup,managedKeys,parseBackupText,restoreBackup,stringifyBackup,validateBackup
} from '../src/core/backup.js';

function memoryStorage(seed={}){
  const map=new Map(Object.entries(seed));
  return{
    get length(){return map.size},
    key:i=>[...map.keys()][i]??null,
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(String(key),String(value)),
    removeItem:key=>map.delete(key),
    dump:()=>Object.fromEntries(map)
  };
}

test('backup includes Party Pocket keys including migration flags and excludes unrelated storage',()=>{
  const storage=memoryStorage({
    partyPocketPlayersV3:JSON.stringify(['A','B']),
    partyPocketStatsV1:JSON.stringify([{gameId:'sync'}]),
    partyPocketExtraGamesMigrationV4:'1',
    unrelatedSetting:'keep-me'
  });
  const backup=createBackup(storage,{date:new Date('2026-08-30T00:00:00Z'),appVersion:'8.14.0'});
  assert.equal(backup.format,BACKUP_FORMAT);
  assert.equal(backup.version,BACKUP_VERSION);
  assert.deepEqual(Object.keys(backup.data).sort(),[
    'partyPocketExtraGamesMigrationV4','partyPocketPlayersV3','partyPocketStatsV1'
  ]);
  assert.equal(backup.data.unrelatedSetting,undefined);
  assert.equal(backup.appVersion,'8.14.0');
});

test('backup round-trips through JSON and restore replaces only managed keys',()=>{
  const source=memoryStorage({
    partyPocketPlayersV3:JSON.stringify(['New']),
    partyPocketLibraryV1:JSON.stringify({favorites:['memory'],recent:[]}),
    partyPocketExtraGamesMigrationV4:'1'
  });
  const text=stringifyBackup(createBackup(source,{appVersion:'8.14.0'}));
  const parsed=parseBackupText(text);

  const target=memoryStorage({
    partyPocketPlayersV3:JSON.stringify(['Old']),
    partyPocketStatsV1:JSON.stringify([{gameId:'gate'}]),
    unrelatedSetting:'leave-this-alone'
  });
  restoreBackup(target,parsed);
  const data=target.dump();
  assert.equal(data.partyPocketPlayersV3,JSON.stringify(['New']));
  assert.equal(data.partyPocketLibraryV1,JSON.stringify({favorites:['memory'],recent:[]}));
  assert.equal(data.partyPocketStatsV1,undefined);
  assert.equal(data.unrelatedSetting,'leave-this-alone');
});

test('validation rejects malformed format version unmanaged keys and broken known JSON',()=>{
  assert.throws(()=>validateBackup({format:'other',version:1,data:{}}),/format/);
  assert.throws(()=>validateBackup({format:BACKUP_FORMAT,version:99,data:{}}),/version/);
  assert.throws(()=>validateBackup({format:BACKUP_FORMAT,version:1,data:{evil:'x'}}),/unmanaged/);
  assert.throws(()=>validateBackup({
    format:BACKUP_FORMAT,version:1,data:{partyPocketPlayersV3:'not-json'}
  }),/invalid JSON/);
  assert.throws(()=>parseBackupText('{not json'),/valid JSON/);
});

test('clear removes only Party Pocket data',()=>{
  const storage=memoryStorage({
    partyPocketPlayersV3:JSON.stringify(['A']),
    partyPocketSoloProgressV1:JSON.stringify({games:{}}),
    otherApp:'safe'
  });
  assert.deepEqual(managedKeys(storage),['partyPocketPlayersV3','partyPocketSoloProgressV1']);
  assert.equal(clearPartyPocketData(storage),2);
  assert.deepEqual(storage.dump(),{otherApp:'safe'});
});

test('summary and filename expose portable metadata',()=>{
  const storage=memoryStorage({partyPocketPlayersV3:JSON.stringify(['A'])});
  const backup=createBackup(storage,{date:new Date('2026-08-30T01:23:00Z'),appVersion:'8.14.0'});
  const summary=backupSummary(backup);
  assert.equal(summary.keyCount,1);
  assert.ok(summary.bytes>0);
  assert.equal(summary.appVersion,'8.14.0');
  assert.match(backupFilename(new Date(2026,7,30,10,5)),/^party-pocket-backup-20260830-1005\.json$/);
});

test('saved party presets are validated and included in backups',()=>{
  const storage=memoryStorage({
    partyPocketSavedPartiesV1:JSON.stringify([{id:'p1',name:'定番',schedule:['code','gate']}])
  });
  const backup=createBackup(storage,{appVersion:'8.18.0'});
  assert.ok(backup.data.partyPocketSavedPartiesV1);
  assert.doesNotThrow(()=>validateBackup(backup));
});

test('active and completed party history are included in Data Vault backup',()=>{
  const storage=memoryStorage({
    partyPocketPartyHistoryV1:JSON.stringify([{id:'p1',players:['A','B'],schedule:['code','gate'],rounds:[],finalScores:[3,2],winners:[0],startedAt:1,completedAt:2}]),
    partyPocketPartyActiveV1:JSON.stringify({id:'active',players:['A','B'],schedule:['bomb','clock'],rounds:[],finalScores:[0,0],winners:[],startedAt:3,completedAt:0})
  });
  const backup=createBackup(storage,{appVersion:'8.19.0'});
  assert.ok(backup.data.partyPocketPartyHistoryV1);
  assert.ok(backup.data.partyPocketPartyActiveV1);
  assert.doesNotThrow(()=>validateBackup(backup));
});
