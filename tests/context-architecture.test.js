import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequiredPicker} from '../src/app/context-contract.js';

test('shared context picker preserves fail-fast contract behavior',()=>{
  const pickRequired=createRequiredPicker('Contract Test');
  const fn=()=>{};
  const selected=pickRequired({store:{id:1},fn},['store'],'store');
  assert.deepEqual(selected,{store:{id:1}});
  assert.equal(Object.isFrozen(selected),true);

  assert.throws(
    ()=>pickRequired({},['missing'],'store'),
    /missing Contract Test store: missing/
  );
  assert.throws(
    ()=>pickRequired({fn:'bad'},['fn'],'route',{functions:true}),
    /Contract Test route must be a function: fn/
  );
  assert.throws(()=>createRequiredPicker(''),/context scope is required/);
});

test('major screen factories use the app plus context contract',()=>{
  const factories=[
    ['src/screens/data-vault.js','createDataVaultScreen'],
    ['src/screens/player-groups.js','createPlayerGroupsScreen'],
    ['src/screens/party-history.js','createPartyHistoryScreens'],
    ['src/screens/saved-parties.js','createSavedPartiesScreen'],
    ['src/screens/party/play-flow.js','createPartyPlayFlow'],
    ['src/screens/home/home.js','createHomeScreen'],
    ['src/screens/game-detail/game-detail.js','createGameDetailScreen'],
    ['src/screens/analytics/playtest-lab.js','createPlaytestLabScreen'],
    ['src/screens/analytics/player-analytics.js','createPlayerAnalyticsScreens'],
    ['src/screens/analytics/improvement.js','createImprovementScreens'],
    ['src/screens/analytics/game-insights.js','createGameInsightsScreen']
  ];

  for(const [path,name] of factories){
    const source=fs.readFileSync(path,'utf8');
    assert.match(
      source,
      new RegExp(`export function ${name}\\(\\{\\s*app\\s*,\\s*context\\s*\\}\\)`),
      path
    );
  }
});

test('screen contexts reuse the shared dependency picker',()=>{
  const contexts=[
    'src/screens/data-vault-context.js',
    'src/screens/player-groups-context.js',
    'src/screens/party-history-context.js',
    'src/screens/saved-parties-context.js',
    'src/screens/party/context.js',
    'src/screens/home/context.js',
    'src/screens/game-detail/context.js',
    'src/screens/analytics/playtest-lab-context.js',
    'src/screens/analytics/player-analytics-context.js',
    'src/screens/analytics/improvement-context.js',
    'src/screens/analytics/game-insights-context.js'
  ];

  for(const path of contexts){
    const source=fs.readFileSync(path,'utf8');
    assert.match(source,/createRequiredPicker/);
    assert.doesNotMatch(source,/function pickRequired/);
  }
});

test('application entrypoints stay thin after the refactor',()=>{
  const appLines=fs.readFileSync('src/app.js','utf8').trimEnd().split('\n').length;
  const runtimeLines=fs.readFileSync('src/app/runtime.js','utf8').trimEnd().split('\n').length;
  assert.ok(appLines<=30,`src/app.js grew to ${appLines} lines`);
  assert.ok(runtimeLines<=300,`src/app/runtime.js grew to ${runtimeLines} lines`);
});
