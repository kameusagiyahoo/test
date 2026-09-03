import test from 'node:test';
import assert from 'node:assert/strict';
import {bombSensor,isBombMove} from '../src/games/bomb.js';

test('Bomb sensor exposes distance bands without revealing the target',()=>{
  assert.deepEqual(bombSensor(10,23),{id:'cold',label:'COLD',detail:'爆発まで7以上'});
  assert.deepEqual(bombSensor(17,23),{id:'warm',label:'WARM',detail:'爆発まであと4〜6'});
  assert.deepEqual(bombSensor(20,23),{id:'hot',label:'HOT',detail:'爆発まであと2〜3'});
  assert.deepEqual(bombSensor(22,23),{id:'critical',label:'CRITICAL',detail:'爆発まであと1'});
});

test('Bomb sensor reports boom at or beyond the hidden target',()=>{
  assert.deepEqual(bombSensor(23,23),{id:'boom',label:'BOOM',detail:'爆発'});
  assert.deepEqual(bombSensor(24,23),{id:'boom',label:'BOOM',detail:'爆発'});
});

test('Bomb move explodes on reaching or overshooting the target',()=>{
  assert.equal(isBombMove(20,2,23),false);
  assert.equal(isBombMove(20,3,23),true);
  assert.equal(isBombMove(20,4,23),true);
});
