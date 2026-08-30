import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayerGroupStore,PLAYER_GROUP_LIMIT,samePlayers} from '../src/core/groups.js';
import {createBackup} from '../src/core/backup.js';

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

test('player groups save one to eight players and normalize blank names',()=>{
  let now=100;
  const store=new PlayerGroupStore(memoryStorage(),()=>now++);
  const group=store.save('家族',['A','','C','D','E','F','G','H','I']);
  assert.equal(group.name,'家族');
  assert.deepEqual(group.players,['A','プレイヤー2','C','D','E','F','G','H']);
});

test('saving the same group name updates members without duplicating the group',()=>{
  let now=100;
  const store=new PlayerGroupStore(memoryStorage(),()=>now++);
  const first=store.save('いつもの4人',['A','B','C','D']);
  const second=store.save('いつもの4人',['A','B','C','E']);
  assert.equal(store.all().length,1);
  assert.equal(second.id,first.id);
  assert.deepEqual(store.all()[0].players,['A','B','C','E']);
});

test('group store keeps at most eight groups',()=>{
  let now=1;
  const store=new PlayerGroupStore(memoryStorage(),()=>now++);
  for(let i=0;i<PLAYER_GROUP_LIMIT+3;i++)store.save('Group '+i,['P'+i]);
  assert.equal(store.all().length,PLAYER_GROUP_LIMIT);
  assert.ok(store.all().some(g=>g.name==='Group 10'));
});

test('recent groups prioritize the most recently used lineup',()=>{
  let now=10;
  const store=new PlayerGroupStore(memoryStorage(),()=>now++);
  const a=store.save('A組',['A','B']);
  const b=store.save('B組',['C','D']);
  store.touch(a.id);
  assert.deepEqual(store.recent().map(g=>g.name),['A組','B組']);
  store.touch(b.id);
  assert.deepEqual(store.recent().map(g=>g.name),['B組','A組']);
});

test('samePlayers is order-sensitive so turn order changes are visible',()=>{
  assert.equal(samePlayers(['A','B'],['A','B']),true);
  assert.equal(samePlayers(['A','B'],['B','A']),false);
  assert.equal(samePlayers(['A'],['A','B']),false);
});

test('player groups are automatically included in Data Vault backup',()=>{
  const storage=memoryStorage(),store=new PlayerGroupStore(storage,()=>123);
  store.save('家族',['A','B','C']);
  const backup=createBackup(storage,{appVersion:'8.15.0'});
  assert.ok(backup.data.partyPocketPlayerGroupsV1);
  assert.deepEqual(JSON.parse(backup.data.partyPocketPlayerGroupsV1)[0].players,['A','B','C']);
});

test('groups can be removed independently',()=>{
  let now=1;
  const store=new PlayerGroupStore(memoryStorage(),()=>now++);
  const a=store.save('A',['A']),b=store.save('B',['B']);
  store.remove(a.id);
  assert.equal(store.get(a.id),null);
  assert.equal(store.get(b.id).name,'B');
});
