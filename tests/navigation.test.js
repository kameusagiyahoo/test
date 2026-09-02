import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigationHub,createRouteTable} from '../src/app/navigation.js';

test('navigation hub delegates through stable route functions',()=>{
  const navigation=createNavigationHub(['home']);
  const home=navigation.route('home');
  navigation.bind('home',(value)=>'home:'+value);
  assert.equal(home('ready'),'home:ready');
  assert.equal(navigation.isBound('home'),true);
});

test('route table is derived from the registered route names',()=>{
  const navigation=createNavigationHub(['home','detail']);
  const routes=createRouteTable(navigation,['home','detail']);
  assert.deepEqual(Object.keys(routes),['home','detail']);
  navigation.bindMany({
    home:()=>1,
    detail:()=>2
  });
  assert.equal(routes.home(),1);
  assert.equal(routes.detail(),2);
  assert.equal(Object.isFrozen(routes),true);
});

test('navigation hub rejects missing and duplicate bindings',()=>{
  const navigation=createNavigationHub(['home']);
  const home=navigation.route('home');
  assert.throws(()=>home(),/app route not bound: home/);
  navigation.bind('home',()=>null);
  assert.throws(()=>navigation.bind('home',()=>null),/app route already bound: home/);
  assert.throws(()=>navigation.route('missing'),/unknown app route: missing/);
});

test('bindMany validates all bindings before mutating the hub',()=>{
  const navigation=createNavigationHub(['home','detail']);
  assert.throws(
    ()=>navigation.bindMany({home:()=>null,detail:null}),
    /route target must be a function: detail/
  );
  assert.deepEqual(navigation.missingRoutes(),['home','detail']);
});

test('runtime can assert that every route is wired before startup',()=>{
  const navigation=createNavigationHub(['home','detail']);
  navigation.bind('home',()=>null);
  assert.deepEqual(navigation.missingRoutes(),['detail']);
  assert.throws(()=>navigation.assertAllBound(),/unbound app routes: detail/);
  navigation.bind('detail',()=>null);
  assert.equal(navigation.assertAllBound(),true);
});
