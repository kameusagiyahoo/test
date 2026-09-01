import {normalizeSoloDifficulty,soloDifficultyLabel} from '../core/solo.js';

export function routeNeighbors(index,size=3){
  const r=Math.floor(index/size),c=index%size,result=[];
  if(r>0)result.push(index-size);
  if(r<size-1)result.push(index+size);
  if(c>0)result.push(index-1);
  if(c<size-1)result.push(index+1);
  return result;
}

export function pathSum(values,path){return path.reduce((sum,i)=>sum+values[i],0)}

export function routeDifficultyConfig(difficulty='normal'){
  const level=normalizeSoloDifficulty(difficulty);
  if(level==='easy')return{difficulty:level,size:3,pathLength:3,maxValue:6};
  if(level==='hard')return{difficulty:level,size:3,pathLength:5,maxValue:9};
  return{difficulty:level,size:3,pathLength:4,maxValue:8};
}

export function makeRoutePuzzle(rng=Math.random,options={}){
  const size=Number(options.size)||3,pathLength=Number(options.pathLength)||4,maxValue=Number(options.maxValue)||8;
  const values=Array.from({length:size*size},()=>Math.floor(rng()*maxValue)+1);
  let current=Math.floor(rng()*values.length),path=[current],guard=0;
  while(path.length<pathLength&&guard<500){
    guard++;
    const options=routeNeighbors(current,size).filter(i=>!path.includes(i));
    if(!options.length){current=Math.floor(rng()*values.length);path=[current];continue}
    current=options[Math.floor(rng()*options.length)];path.push(current);
  }
  if(path.length<pathLength)throw new Error('route puzzle generation failed');
  return{values,target:pathSum(values,path),solution:path,size,pathLength,maxValue};
}

export function routeScore(values,path,target,requiredLength=4){
  if(path.length!==requiredLength)return 0;
  const diff=Math.abs(pathSum(values,path)-target);
  return diff===0?2:diff<=2?1:0;
}

export const routeGame={
  id:'route',title:'ナンバー・ルート',emoji:'⌁',
  description:'3×3の数字盤を上下左右に4マス進み、合計を目標値へ合わせる。最短の頭内探索を競う。',
  tags:['1〜8人','最適化','頭脳'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function currentConfig(ctx){
  return routeDifficultyConfig(ctx.session.players.length===1?ctx.soloDifficulty:'normal');
}

function start(ctx,life){
  if(life.destroyed)return;
  const n=ctx.session.players.length;
  nextPlayer(ctx,{player:0,scores:Array(n).fill(0)},life);
}

function nextPlayer(ctx,state,life){
  if(life.destroyed)return;
  if(state.player>=ctx.session.players.length)return finish(ctx,state,life);
  const config=currentConfig(ctx),puzzle=makeRoutePuzzle(Math.random,config),name=ctx.session.players[state.player];
  ctx.renderScorebar(state.player);
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">NUMBER ROUTE · ${soloDifficultyLabel(config.difficulty).toUpperCase()}</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">${config.pathLength}マスの経路で目標合計を作ります。数字は1〜${config.maxValue}。</div><button class="btn primary" id="routeReady">盤面を見る</button></div>`;
  ctx.root.querySelector('#routeReady').onclick=()=>play(ctx,state,life,puzzle,[]);
}

function play(ctx,state,life,puzzle,path){
  if(life.destroyed)return;
  const legal=path.length===0?new Set(puzzle.values.map((_,i)=>i))
    :new Set(routeNeighbors(path.at(-1),puzzle.size).filter(i=>!path.includes(i)));
  const sum=pathSum(puzzle.values,path);
  ctx.root.innerHTML=`<div class="eyebrow">TARGET · ${soloDifficultyLabel(currentConfig(ctx).difficulty).toUpperCase()}</div><div class="route-target">${puzzle.target}</div><div class="sub">選択 ${path.length}/${puzzle.pathLength} · 現在合計 ${sum}</div><div class="route-grid">${puzzle.values.map((v,i)=>`<button class="route-cell ${path.includes(i)?'selected':''} ${legal.has(i)&&path.length<puzzle.pathLength?'legal':''}" data-route="${i}" ${legal.has(i)&&path.length<puzzle.pathLength?'':'disabled'}>${v}</button>`).join('')}</div><div class="rules">最初のマスは自由。その後は上下左右のみ。${puzzle.pathLength}マスは重複できません。</div>`;
  ctx.root.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.route;if(!legal.has(i)||path.includes(i))return;
    const next=[...path,i];
    if(next.length===puzzle.pathLength)return result(ctx,state,life,puzzle,next);
    play(ctx,state,life,puzzle,next);
  });
}

function result(ctx,state,life,puzzle,path){
  const sum=pathSum(puzzle.values,path),score=routeScore(puzzle.values,path,puzzle.target,puzzle.pathLength);
  state.scores[state.player]=score;
  ctx.root.innerHTML=`<div class="eyebrow">ROUTE RESULT</div><div class="prompt compact">${sum===puzzle.target?'TARGET HIT':`差 ${Math.abs(sum-puzzle.target)}`}</div><div class="result-list"><div class="result-row"><span>目標</span><span>${puzzle.target}</span></div><div class="result-row"><span>合計</span><span>${sum}</span></div><div class="result-row"><span>得点</span><span>+${score}</span></div></div><button class="btn primary full" id="routeNext">${state.player+1<ctx.session.players.length?'次の人へ':'ラウンド結果'}</button>`;
  ctx.root.querySelector('#routeNext').onclick=()=>{state.player++;nextPlayer(ctx,state,life)};
}

function finish(ctx,state,life){
  state.scores.forEach((s,i)=>{if(s)ctx.session.addScore(i,s)});
  ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">ROUTE RESULT</div><div class="prompt compact">探索終了</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>+${state.scores[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="routeFinish">次へ</button>`;
  ctx.root.querySelector('#routeFinish').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
