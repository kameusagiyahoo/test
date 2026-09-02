import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogState,smartPartyRoundsForCatalog} from '../src/screens/home/home.js';

test('Home catalog starts with group-fit defaults',()=>{
  assert.deepEqual(createCatalogState(4),{
    category:'all',
    query:'',
    difficulty:'all',
    maxMinutes:'all',
    playerCount:4,
    recommendedOnly:true
  });
});

test('Home Smart Party rounds stay within 3 to 6',()=>{
  assert.equal(smartPartyRoundsForCatalog(1),3);
  assert.equal(smartPartyRoundsForCatalog(3),3);
  assert.equal(smartPartyRoundsForCatalog(5),5);
  assert.equal(smartPartyRoundsForCatalog(12),6);
});
