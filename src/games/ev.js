const contractPool=[
  {p:1,win:1,lose:0},{p:.9,win:3,lose:-2},{p:.8,win:5,lose:-3},{p:.7,win:7,lose:-5},
  {p:.6,win:9,lose:-4},{p:.5,win:11,lose:-4},{p:.4,win:14,lose:-5},{p:.3,win:18,lose:-3},{p:.2,win:23,lose:-2}
];
const targets=[20,24,28];
export const expectedValue=c=>c.p*c.win+(1-c.p)*c.lose;
export const resolveContract=(c,roll)=>roll<c.p?c.win:c.lose;
export const finalValue=(total,target)=>total+(total>=target?6:0);

export function makeDecisionSet(rng=Math.random){
  const pool=[...contractPool];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  return pool.slice(0,3).map((c,i)=>({...c,label:`Plan ${String.fromCharCode(65+i)}`}));
}

function scoreTotals(values){
  const distinct=[...new Set(values)].sort((a,b)=>b-a),points=[2,1];
  return values.map(v=>points[distinct.indexOf(v)]||0);
}

export const evGame={
  id:'ev',title:'期待値チキンレース',emoji:'±',description:'毎回変わる成功率と損益を比較し、最終目標ボーナスも踏まえて3回の投資判断を行う。',tags:['2〜8人','確率','戦略'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){
  if(life.destroyed)return;const target=targets[Math.floor(Math.random()*targets.length)];
  beginStage(ctx,{stage:0,target,totals:Array(ctx.session.players.length).fill(10)},life);
}
function beginStage(ctx,state,life){
  if(life.destroyed)return;state.contracts=makeDecisionSet();state.player=0;state.choices=[];pass(ctx,state,life);
}
function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">DECISION ${state.stage+1}/3</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">現在資産 ${state.totals[state.player]} · 最終目標 ${state.target}以上で評価値 +6</div><button class="btn primary" id="readyEv">選択する</button></div><div class="rules">選択肢は毎回変わります。成功率と成功/失敗時の増減から期待値を計算しつつ、目標到達の価値も考えてください。</div>`;
  ctx.root.querySelector('#readyEv').onclick=()=>choose(ctx,state,life);
}
function contractHtml(c){return`${c.label}<br><small>成功 ${Math.round(c.p*100)}%: ${c.win>=0?'+':''}${c.win} / 失敗: ${c.lose>=0?'+':''}${c.lose}</small>`}
function choose(ctx,state,life){
  if(life.destroyed)return;ctx.root.innerHTML=`<div class="eyebrow">RISK / RETURN</div><div class="prompt compact">どれを選ぶ？</div><div class="sub">現在資産 ${state.totals[state.player]} · 目標 ${state.target}以上で最終評価 +6</div><div class="choice-grid">${state.contracts.map((c,i)=>`<button class="choice" data-contract="${i}">${contractHtml(c)}</button>`).join('')}</div><div class="rules">期待値は非表示です。現在資産と残り判断回数によって、同じ選択肢でも価値が変わります。</div>`;
  ctx.root.querySelectorAll('[data-contract]').forEach(b=>b.onclick=()=>submit(ctx,state,+b.dataset.contract,life));
}
function submit(ctx,state,choice,life){
  if(life.destroyed)return;state.choices.push(choice);state.player++;state.player<ctx.session.players.length?pass(ctx,state,life):resolveStage(ctx,state,life);
}
function resolveStage(ctx,state,life){
  if(life.destroyed)return;const deltas=state.choices.map((choice,i)=>{const d=resolveContract(state.contracts[choice],Math.random());state.totals[i]+=d;return d});
  ctx.root.innerHTML=`<div class="eyebrow">DECISION ${state.stage+1} RESULT</div><div class="prompt compact">結果公開</div><div class="result-list">${ctx.session.players.map((n,i)=>{const c=state.contracts[state.choices[i]];return`<div class="result-row"><span>${ctx.esc(n)} · ${c.label} (EV ${expectedValue(c).toFixed(1)})</span><span>${deltas[i]>=0?'+':''}${deltas[i]} → ${state.totals[i]}</span></div>`}).join('')}</div><button class="btn primary full" id="nextEv">${state.stage<2?'次の判断へ':'最終結果'}</button>`;
  ctx.root.querySelector('#nextEv').onclick=()=>{state.stage++;state.stage<3?beginStage(ctx,state,life):finish(ctx,state,life)};
}
function finish(ctx,state,life){
  if(life.destroyed)return;const values=state.totals.map(v=>finalValue(v,state.target)),gains=scoreTotals(values);gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">FINAL VALUE</div><div class="prompt compact">目標 ${state.target} · 到達で +6</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>資産 ${state.totals[i]} → 評価 ${values[i]} · +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
