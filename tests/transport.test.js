import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalTransport} from '../src/core/transport.js';

test('local transport publishes events and unsubscribe stops delivery',()=>{
  const transport=new LocalTransport();
  const received=[];
  const off=transport.subscribe('state',payload=>received.push(payload));
  transport.publish('state',{round:1});
  off();
  transport.publish('state',{round:2});
  assert.deepEqual(received,[{round:1}]);
});
