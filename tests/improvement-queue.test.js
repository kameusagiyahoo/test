import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImprovementQueueStore,IMPROVEMENT_LIMIT_PER_GAME,experimentStatusLabel
} from '../src/core/improvement-queue.js';

function memoryStorage(){
  const map=new Map();
  return{
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(String(key),String(value)),
    removeItem:key=>map.delete(key)
  };
}

test('improvement queue adds manual experiment and preserves source context',()=>{
  let now=100;
  const store=new ImprovementQueueStore(memoryStorage(),()=>now++);
  const result=store.add({
    gameId:'code',
    title:'説明を短くする',
    note:'初手だけ図解する',
    source:{kind:'health',key:'health:clarity',detail:'分かりやすさが低い',action:'説明文を見直す'}
  });
  assert.equal(result.created,true);
  const item=store.forGame('code')[0];
  assert.equal(item.status,'planned');
  assert.equal(item.note,'初手だけ図解する');
  assert.equal(item.source.kind,'health');
  assert.equal(item.source.key,'health:clarity');
});

test('source key prevents duplicate Health or Context experiments',()=>{
  let now=1;
  const store=new ImprovementQueueStore(memoryStorage(),()=>now++);
  const first=store.add({gameId:'memory',title:'Hardを調整',source:{kind:'context',key:'context:difficulty:replay'}});
  const second=store.add({gameId:'memory',title:'別表現',source:{kind:'context',key:'context:difficulty:replay'}});
  assert.equal(first.created,true);
  assert.equal(second.created,false);
  assert.equal(store.forGame('memory').length,1);
});

test('status cycle follows planned testing done planned and completion timestamp',()=>{
  let now=10;
  const store=new ImprovementQueueStore(memoryStorage(),()=>now++);
  const {item}=store.add({gameId:'gate',title:'壁配置を試す'});
  const testing=store.cycle(item.id);
  assert.equal(testing.status,'testing');
  assert.equal(testing.completedAt,0);
  const done=store.cycle(item.id);
  assert.equal(done.status,'done');
  assert.ok(done.completedAt>0);
  const planned=store.cycle(item.id);
  assert.equal(planned.status,'planned');
  assert.equal(planned.completedAt,0);
});

test('note can be updated independently without losing experiment source',()=>{
  let now=1;
  const store=new ImprovementQueueStore(memoryStorage(),()=>now++);
  const {item}=store.add({gameId:'route',title:'Hard経路を調整',source:{kind:'manual',detail:'original'}});
  const updated=store.update(item.id,{note:'5マス→4マスも試す'});
  assert.equal(updated.note,'5マス→4マスも試す');
  assert.equal(updated.source.detail,'original');
});

test('each game is capped at five and done experiment is replaced first',()=>{
  let now=1;
  const store=new ImprovementQueueStore(memoryStorage(),()=>now++);
  const ids=[];
  for(let i=0;i<IMPROVEMENT_LIMIT_PER_GAME;i++){
    const {item}=store.add({gameId:'pattern',title:'Experiment '+i});
    ids.push(item.id);
  }
  store.update(ids[1],{status:'done'});
  store.add({gameId:'pattern',title:'Experiment new'});
  const rows=store.forGame('pattern');
  assert.equal(rows.length,IMPROVEMENT_LIMIT_PER_GAME);
  assert.equal(rows.some(row=>row.id===ids[1]),false);
  assert.equal(rows.some(row=>row.title==='Experiment new'),true);
});

test('limit is per game rather than global',()=>{
  let now=1;
  const store=new ImprovementQueueStore(memoryStorage(),()=>now++);
  for(let i=0;i<IMPROVEMENT_LIMIT_PER_GAME;i++)store.add({gameId:'code',title:'Code '+i});
  for(let i=0;i<IMPROVEMENT_LIMIT_PER_GAME;i++)store.add({gameId:'gate',title:'Gate '+i});
  assert.equal(store.forGame('code').length,IMPROVEMENT_LIMIT_PER_GAME);
  assert.equal(store.forGame('gate').length,IMPROVEMENT_LIMIT_PER_GAME);
  assert.equal(store.all().length,IMPROVEMENT_LIMIT_PER_GAME*2);
});

test('summary and valid game filtering reflect queue status',()=>{
  let now=1;
  const store=new ImprovementQueueStore(memoryStorage(),()=>now++);
  const a=store.add({gameId:'code',title:'A'}).item;
  const b=store.add({gameId:'gate',title:'B'}).item;
  store.cycle(a.id);
  store.cycle(b.id);store.cycle(b.id);
  assert.deepEqual(store.summary(),{total:2,planned:0,testing:1,done:1,games:2});
  assert.deepEqual(store.summary(['code']),{total:1,planned:0,testing:1,done:0,games:1});
});

test('remove deletes only the selected experiment and status labels stay stable',()=>{
  let now=1;
  const store=new ImprovementQueueStore(memoryStorage(),()=>now++);
  const a=store.add({gameId:'code',title:'A'}).item;
  const b=store.add({gameId:'code',title:'B'}).item;
  store.remove(a.id);
  assert.deepEqual(store.forGame('code').map(row=>row.id),[b.id]);
  assert.equal(experimentStatusLabel('planned'),'PLANNED');
  assert.equal(experimentStatusLabel('testing'),'TESTING');
  assert.equal(experimentStatusLabel('done'),'DONE');
});

test('testing lifecycle preserves baseline and freezes final result',()=>{
  let now=100;
  const store=new ImprovementQueueStore(memoryStorage(),()=>now++);
  const {item}=store.add({gameId:'code',title:'説明改善'});
  const baseline={startedAt:200,cohort:{mode:'party',difficulty:null,label:'Party'},count:3,axes:{fun:3,clarity:2,brain:4,replay:3},quality:8/3};
  const testing=store.startTesting(item.id,baseline);
  assert.equal(testing.status,'testing');
  assert.equal(testing.testingStartedAt,200);
  assert.equal(testing.baseline.count,3);
  const result={ready:true,outcome:'improved',cohort:baseline.cohort,baselineCount:3,afterCount:4,beforeQuality:2.67,afterQuality:3.67,qualityDelta:1,axes:[{id:'clarity',before:2,after:4,delta:2}]};
  const done=store.complete(item.id,result);
  assert.equal(done.status,'done');
  assert.equal(done.finalResult.outcome,'improved');
  assert.equal(done.finalResult.afterCount,4);
  assert.ok(done.completedAt>0);
});

test('reset clears testing baseline and frozen result completely',()=>{
  let now=1;
  const store=new ImprovementQueueStore(memoryStorage(),()=>now++);
  const {item}=store.add({gameId:'memory',title:'Hard調整'});
  store.startTesting(item.id,{startedAt:10,cohort:{mode:'single',difficulty:'hard',label:'Hard'},count:2,axes:{fun:3,clarity:3,brain:5,replay:2},quality:8/3});
  store.complete(item.id,{ready:false,outcome:'collecting',cohort:{mode:'single',difficulty:'hard',label:'Hard'},baselineCount:2,afterCount:1,axes:[]});
  const planned=store.reset(item.id);
  assert.equal(planned.status,'planned');
  assert.equal(planned.testingStartedAt,0);
  assert.equal(planned.baseline,null);
  assert.equal(planned.finalResult,null);
  assert.equal(planned.completedAt,0);
});
