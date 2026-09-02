import test from 'node:test';
import assert from 'node:assert/strict';
import {partyPresetMap} from '../src/screens/party/play-flow.js';

test('Party setup presets keep stable game groups',()=>{
  const presets=partyPresetMap();
  assert.deepEqual(presets.quick,['five','clock','ten','bomb']);
  assert.ok(presets.strategy.includes('auction'));
  assert.ok(presets.strategy.includes('triad'));
  assert.ok(presets.brain.includes('logic'));
  assert.ok(presets.talk.includes('taboo'));
});

test('Party preset ids do not repeat inside a preset',()=>{
  for(const ids of Object.values(partyPresetMap())){
    assert.equal(new Set(ids).size,ids.length);
  }
});
