import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanCode} from '../src/core/room-transport.js';

test('room code normalization strips ambiguous punctuation',()=>{
  assert.equal(cleanCode(' ab-c 234! '),'ABC234');
  assert.equal(cleanCode('abcdefghi'),'ABCDEF');
});
