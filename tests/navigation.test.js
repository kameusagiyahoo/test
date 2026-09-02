import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigationHub} from '../src/app/navigation.js';

test('navigation hub delegates through stable route functions',()=>{
  const navigation=createNavigationHub(['home']);
  const home=navigation.route('home');
  navigation.bind('home',(value)=>'home:'+value);
  assert.equal(home('ready'),'home:ready');
  assert.equal(navigation.isBound('home'),true);
});

test('navigation hub rejects missing and duplicate bindings',()=>{
  const navigation=createNavigationHub(['home']);
  const home=navigation.route('home');
  assert.throws(()=>home(),/app route not bound: home/);
  navigation.bind('home',()=>null);
  assert.throws(()=>navigation.bind('home',()=>null),/app route already bound: home/);
  assert.throws(()=>navigation.route('missing'),/unknown app route: missing/);
});
