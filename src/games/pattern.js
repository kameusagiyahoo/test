import {normalizeSoloDifficulty,soloDifficultyLabel} from '../core/solo.js';

const EASY_BUILDERS=[
  rng=>{
    const start=2+Math.floor(rng()*5),step=2+Math.floor(rng()*4);
    const seq=Array.from({length:5},(_,i)=>start+step*i);
    return{seq,answer:start+step*5,label:'一定加算'};
  },
  rng=>{
    const start=18+Math.floor(rng()*10),step=2+Math.floor(rng()*4);
    const seq=Array.from({length:5},(_,i)=>start-step*i);
    return{seq,answer:start-step*5,label:'一定減算'};
  }
];

const NORMAL_BUILDERS=[
  ...EASY_BUILDERS,
  rng=>{
    const start=1+Math.floor(rng()*4),a=2+Math.floor(rng()*3),b=1+Math.floor(rng()*2);
    const seq=[start];
    for(let i=1;i<6;i++)seq.push(seq.at(-1)+(i%2?a:-b));
    return{seq:seq.slice(0,5),answer:seq[5],label:'交互変化'};
  },
  rng=>{
    const start=1+Math.floor(rng()*3);
    const seq=Array.from({length:6},(_,i)=>start+i*i);
    return{seq:seq.slice(0,5),answer:seq[5],label:'差が増える'};
  }
];

const HARD_BUILDERS=[
  ...NORMAL_BUILDERS,
  rng=>{
    const start=1+Math.floor(rng()*3),factor=2+Math.floor(rng()*2);
    const seq=Array.from({length:6},(_,i)=>start*(factor**i));
    return{seq:seq.slice(0,5),answer:seq[5],label:'等比変化'};
  },
  rng=>{
    const start=1+Math.floor(rng()*3),add=2+Math.floor(rng()*3);
    const seq=[start];
    for(let i=1;i<6;i++)seq.push(i%2?seq.at(-1)+add:seq.at(-1)*2);
    return{seq:seq.slice(0,5),answer:seq[5],label:'加算と倍化'};
  }
];

export function patternDifficultyBuilders(difficulty='normal'){
  const level=normalizeSoloDifficulty(difficulty);
  return level==='easy'?EASY_BUILDERS:level==='hard'?HARD_BUILDERS:NORMAL_BUILDERS;
}

export function makePatternPuzzle(rng=Math.random,difficulty='normal'){
  const builders=patternDifficultyBuilders(difficulty);
  const base=builders[Math.floor(rng()*builders.length)](rng);
  const choicesSet=new Set([base.answer]);
  const offsets=[-4,-3,-2,-1,1,2,3,4,5,-5,6,-6];
  const start=Math.floor(rng()*offsets.length);
  for(let step=0;choicesSet.size<4&&step<offsets.length;step++){
    const off=offsets[(start+step)%offsets.length],v=base.answer+off;
    if(v>=0)choicesSet.add(v);
  }
  let fallback=1;
  while(choicesSet.size<4){choicesSet.add(base.answer+fallback);fallback++}
  let choices=[...choicesSet];
  for(let i=choices.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]]}
  return{...base,choices,difficulty:normalizeSoloDifficulty(difficulty)};
}

export function patternScore(puzzle,choice){return Number(choice)===Number(puzzle.answer)?2:0}

export const patternGame={
  id:'pattern',title:'パターン・コード',emoji:'∷',
  description:'5つの数から規則を見抜き、次の数を4択で当てる。1人で短く回せる数列推理。',
  tags:['1〜8人','推理','短時間'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function currentDifficulty(ctx){
  return ctx.session.players.length===1?normalizeSoloDifficulty(ctx.soloDifficulty):'normal';
}

function start(ctx,life){
  if(life.destroyed)return;
  const n=ctx.session.players.length;
  nextPlayer(ctx,{player:0,scores:Array(n).fill(0)},life);
}

function nextPlayer(ctx,state,life){
  if(life.destroyed)return;
  if(state.player>=ctx.session.players.length)return finish(ctx,state,life);
  const difficulty=currentDifficulty(ctx),puzzle=makePatternPuzzle(Math.random,difficulty),name=ctx.session.players[state.player];
  ctx.renderScorebar(state.player);
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">PATTERN CODE · ${soloDifficultyLabel(difficulty).toUpperCase()}</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">数列の規則を見抜いて次の数を選びます。</div><button class="btn primary" id="patternReady">問題を見る</button></div>`;
  ctx.root.querySelector('#patternReady').onclick=()=>play(ctx,state,life,puzzle);
}

function play(ctx,state,life,puzzle){
  ctx.root.innerHTML=`<div class="eyebrow">NEXT NUMBER · ${soloDifficultyLabel(puzzle.difficulty).toUpperCase()}</div><div class="pattern-sequence">${puzzle.seq.join(' · ')} · ?</div><div class="choice-grid">${puzzle.choices.map(v=>`<button class="choice" data-pattern="${v}">${v}</button>`).join('')}</div><div class="rules">Easyは基本規則、Normalは交互・差分、Hardは等比や複合規則まで出題されます。</div>`;
  ctx.root.querySelectorAll('[data-pattern]').forEach(b=>b.onclick=()=>{
    const choice=+b.dataset.pattern,score=patternScore(puzzle,choice);state.scores[state.player]=score;
    ctx.root.innerHTML=`<div class="eyebrow">PATTERN RESULT</div><div class="prompt compact">${score?'正解':'不正解'}</div><div class="result-list"><div class="result-row"><span>答え</span><span>${puzzle.answer}</span></div><div class="result-row"><span>規則</span><span>${puzzle.label}</span></div><div class="result-row"><span>得点</span><span>+${score}</span></div></div><button class="btn primary full" id="patternNext">${state.player+1<ctx.session.players.length?'次の人へ':'ラウンド結果'}</button>`;
    ctx.root.querySelector('#patternNext').onclick=()=>{state.player++;nextPlayer(ctx,state,life)};
  });
}

function finish(ctx,state,life){
  state.scores.forEach((s,i)=>{if(s)ctx.session.addScore(i,s)});
  ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">PATTERN RESULT</div><div class="prompt compact">推理終了</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>+${state.scores[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="patternFinish">次へ</button>`;
  ctx.root.querySelector('#patternFinish').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
