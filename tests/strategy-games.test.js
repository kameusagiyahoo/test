import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGrid,territoryScores,rankGains} from '../src/games/grid.js';
import {makeProjects,resolveAllocations,allocationGains} from '../src/games/allocation.js';
import {portfolioValue,bestPortfolio,portfolioGain} from '../src/games/portfolio.js';

test('grid size and placement count scale with player count',()=>{
  assert.deepEqual(makeGrid(2),{size:3,values:[1,2,1,2,4,2,1,2,1],owners:Array(9).fill(-1),placementsPerPlayer:3});
  assert.equal(makeGrid(8).size,4);
  assert.equal(makeGrid(8).placementsPerPlayer,2);
});

test('territory scoring includes orthogonal connection bonuses once per edge',()=>{
  const board=[
    {value:1,owner:0},{value:2,owner:0},{value:1,owner:1},
    {value:2,owner:1},{value:4,owner:0},{value:2,owner:-1},
    {value:1,owner:-1},{value:2,owner:-1},{value:1,owner:-1}
  ];
  assert.deepEqual(territoryScores(board,3,2),[9,3]);
  assert.deepEqual(rankGains([9,3]),[2,1]);
});

test('resource projects total exactly six capacity units per player',()=>{
  const projects=makeProjects(4,()=>0.5);
  assert.equal(projects.reduce((s,p)=>s+p.capacity,0),24);
  assert.deepEqual([...projects.map(p=>p.value)].sort(),[2,3,4]);
});

test('overloaded resource project scores zero for every player',()=>{
  const projects=[{name:'A',capacity:3,value:4},{name:'B',capacity:4,value:3},{name:'C',capacity:5,value:2}];
  const result=resolveAllocations([[2,2,2],[2,1,3]],projects);
  assert.deepEqual(result.totals,[4,3,5]);
  assert.deepEqual(result.active,[false,true,true]);
  assert.deepEqual(result.scores,[10,9]);
  assert.deepEqual(allocationGains(result.scores),[2,1]);
});

test('portfolio solver finds synergy-aware optimum under budget',()=>{
  const puzzle={budget:10,bonus:5,synergy:[0,1],cards:[
    {id:0,title:'A',cost:4,value:6},{id:1,title:'B',cost:4,value:6},{id:2,title:'C',cost:5,value:10},{id:3,title:'D',cost:2,value:3}
  ]};
  const pair=portfolioValue([0,1,3],puzzle);
  assert.equal(pair.cost,10);
  assert.equal(pair.value,20);
  assert.equal(pair.synergy,5);
  const best=bestPortfolio(puzzle);
  assert.equal(best.value,20);
  assert.equal(portfolioGain(20,20),2);
  assert.equal(portfolioGain(19,20),1);
  assert.equal(portfolioGain(17,20),0);
});
