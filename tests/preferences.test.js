import test from 'node:test';
import assert from 'node:assert/strict';
import {RatingStore,PartySettingsStore} from '../src/core/preferences.js';

function memoryStorage(){const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}}

test('ratings accumulate locally per game',()=>{
  const storage=memoryStorage(),ratings=new RatingStore(storage);
  assert.deepEqual(ratings.get('sync'),{good:0,neutral:0,bad:0,total:0});
  ratings.rate('sync','good');ratings.rate('sync','neutral');ratings.rate('sync','good');
  assert.deepEqual(ratings.get('sync'),{good:2,neutral:1,bad:0,total:3});
  assert.throws(()=>ratings.rate('sync','nope'));
});

test('party settings retain round count and valid selected games',()=>{
  const storage=memoryStorage(),store=new PartySettingsStore(storage),ids=['sync','bomb','five','clock'];
  assert.deepEqual(store.load(ids),{rounds:6,gameIds:ids});
  store.save({rounds:9,gameIds:['sync','clock']},ids);
  assert.deepEqual(store.load(ids),{rounds:9,gameIds:['sync','clock']});
});

test('party settings reject fewer than two games and ignore stale ids',()=>{
  const storage=memoryStorage(),store=new PartySettingsStore(storage),ids=['sync','bomb','five'];
  assert.throws(()=>store.save({rounds:3,gameIds:['sync']},ids));
  storage.setItem('partyPocketPartySettingsV1',JSON.stringify({rounds:6,gameIds:['sync','removed']}));
  assert.deepEqual(store.load(ids),{rounds:6,gameIds:ids});
});
