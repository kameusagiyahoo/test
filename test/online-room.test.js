import test from 'node:test';
import assert from 'node:assert/strict';
import {applyIntent,createInitialRoom,joinRoom,publicSnapshot,rankAwards} from '../worker/src/engine.js';

test('party schedule is six balanced rounds',()=>{
  const state=createInitialRoom('ABC234','Host');const host=state.credentials;delete state.credentials;
  joinRoom(state,'Guest');
  applyIntent(state,host.playerId,{type:'START_PARTY'},1000);
  assert.deepEqual(state.party.schedule,['sync','bomb','five','sync','bomb','five']);
  assert.equal(state.party.totalRounds,6);assert.equal(state.phase,'game');assert.equal(state.game.type,'sync');
});

test('rank awards normalize raw game scores',()=>{
  assert.deepEqual(rankAwards([7,4,2,0]),[3,2,1,0]);
  assert.deepEqual(rankAwards([5,5,2,1]),[3,3,2,1]);
  assert.deepEqual(rankAwards([1,1,1]),[3,3,3]);
});

test('sync snapshot hides other players answers before reveal',()=>{
  const state=createInitialRoom('ABC234','Host');const host=state.credentials;delete state.credentials;
  const guest=joinRoom(state,'Guest');
  state.phase='game';state.game={type:'sync',prompt:{type:'free',q:'赤い食べ物といえば？'},answers:{
    [host.playerId]:{key:'りんご',label:'りんご'},[guest.playerId]:{key:'とまと',label:'トマト'}
  }};
  const view=publicSnapshot(state,host.playerId);
  assert.equal(view.game.myAnswer,'りんご');
  assert.equal(view.game.answers,undefined);
  assert.deepEqual(new Set(view.game.submitted),new Set([host.playerId,guest.playerId]));
});

test('non-host cannot start party',()=>{
  const state=createInitialRoom('ABC234','Host');delete state.credentials;
  const guest=joinRoom(state,'Guest');
  assert.throws(()=>applyIntent(state,guest.playerId,{type:'START_PARTY'}),/FORBIDDEN/);
});
