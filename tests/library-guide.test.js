import test from 'node:test';
import assert from 'node:assert/strict';
import {LibraryStore} from '../src/core/preferences.js';
import {gameGuide,hasExplicitGuide} from '../src/core/game-guide.js';

function memoryStorage(){
  const map=new Map();
  return{
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value))
  };
}

test('library store toggles favorites without duplicates',()=>{
  const store=new LibraryStore(memoryStorage());
  assert.equal(store.isFavorite('code'),false);
  store.toggleFavorite('code');
  store.toggleFavorite('code');
  assert.equal(store.isFavorite('code'),false);
  store.toggleFavorite('code');
  store.toggleFavorite('gate');
  assert.deepEqual(store.favorites(['code','gate','sync']),['gate','code']);
});

test('recent games are unique newest-first and capped at eight',()=>{
  const store=new LibraryStore(memoryStorage());
  ['a','b','c','d','e','f','g','h','i'].forEach(id=>store.touchRecent(id));
  assert.deepEqual(store.recent(),['i','h','g','f','e','d','c','b']);
  store.touchRecent('e');
  assert.deepEqual(store.recent().slice(0,3),['e','i','h']);
});

test('all 24 production games have explicit usable guides',()=>{
  const ids=['sync','bomb','five','minority','sniper','taboo','clock','ten','code','logic','ev','auction','grid','allocation','portfolio','sequence','frontline','priority','isolation','gate','triad','memory','route','pattern'];
  for(const id of ids){
    assert.equal(hasExplicitGuide(id),true,id);
    const guide=gameGuide(id);
    assert.ok(guide.objective.length>5,id);
    assert.ok(Array.isArray(guide.rules)&&guide.rules.length>=3,id);
    assert.ok(guide.scoring.length>5,id);
    assert.ok(guide.example.length>5,id);
  }
});
