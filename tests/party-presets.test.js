import test from 'node:test';
import assert from 'node:assert/strict';
import {SavedPartyStore,SAVED_PARTY_LIMIT} from '../src/core/party-presets.js';

function memoryStorage(){
  const map=new Map();
  return{
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(String(key),String(value)),
    removeItem:key=>map.delete(key)
  };
}

test('saved party preserves exact game order',()=>{
  const store=new SavedPartyStore(memoryStorage(),()=>100);
  const saved=store.save('定番3本',['code','gate','bomb']);
  assert.deepEqual(saved.schedule,['code','gate','bomb']);
  assert.deepEqual(store.get(saved.id).schedule,['code','gate','bomb']);
});

test('saving the same name updates schedule without duplicating',()=>{
  let now=1;const store=new SavedPartyStore(memoryStorage(),()=>now++);
  const first=store.save('定番',['code','gate']);
  const second=store.save('定番',['bomb','clock','ten']);
  assert.equal(store.all().length,1);
  assert.equal(first.id,second.id);
  assert.deepEqual(store.all()[0].schedule,['bomb','clock','ten']);
});

test('saved parties are capped at eight',()=>{
  let now=1;const store=new SavedPartyStore(memoryStorage(),()=>now++);
  for(let i=0;i<SAVED_PARTY_LIMIT+3;i++)store.save('Set '+i,['code','gate']);
  assert.equal(store.all().length,SAVED_PARTY_LIMIT);
  assert.ok(store.all().some(p=>p.name==='Set 10'));
});

test('recent order follows actual use then update time',()=>{
  let now=10;const store=new SavedPartyStore(memoryStorage(),()=>now++);
  const a=store.save('A',['code','gate']);
  const b=store.save('B',['bomb','clock']);
  store.touch(a.id);
  assert.deepEqual(store.recent().map(p=>p.name),['A','B']);
  store.touch(b.id);
  assert.deepEqual(store.recent().map(p=>p.name),['B','A']);
});

test('invalid or removed games can be filtered at read time',()=>{
  const store=new SavedPartyStore(memoryStorage(),()=>1);
  const p=store.save('Mixed',['code','removed','gate']);
  const filtered=store.get(p.id,['code','gate']);
  assert.deepEqual(filtered.schedule,['code','gate']);
  assert.equal(store.get(p.id,['code']),null);
});

test('saved party can be removed independently',()=>{
  let now=1;const store=new SavedPartyStore(memoryStorage(),()=>now++);
  const a=store.save('A',['code','gate']),b=store.save('B',['bomb','clock']);
  store.remove(a.id);
  assert.equal(store.get(a.id),null);
  assert.equal(store.get(b.id).name,'B');
});
