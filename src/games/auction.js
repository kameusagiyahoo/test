const lots=[
  {name:'ヴィンテージ時計',values:[6,10,14],weights:[50,30,20]},
  {name:'限定ポスター',values:[4,9,13],weights:[25,50,25]},
  {name:'未開封ゲーム',values:[5,8,15],weights:[20,45,35]},
  {name:'古書セット',values:[3,11,16],weights:[45,35,20]},
  {name:'レコード',values:[6,9,12],weights:[30,30,40]},
  {name:'デザインチェア',values:[5,12,15],weights:[20,30,50]}
];

function sampleThree(rng=Math.random){
  const pool=[...lots];for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}return pool.slice(0,3);
}
function scoreWealth(values){const distinct=[...new Set(values)].sort((a,b)=>b-a),points=[2,1];return values.map(v=>points[distinct.indexOf(v)]||0)}
export function expectedLotValue(lot){return lot.values.reduce((sum,v,i)=>sum+v*lot.weights[i]/100,0)}
export function weightedValue(lot,roll){
  let cursor=0;for(let i=0;i<lot.values.length;i++){cursor+=lot.weights[i]/100;if(roll<cursor)return lot.values[i]}
  return lot.values.at(-1);
}
export function resolveAuction(bids,actual,budgets,assets){
  const nextBudgets=[...budgets],nextAssets=[...assets],max=Math.max(...bids),top=bids.map((b,i)=>b===max?i:-1).filter(i=>i>=0);
  if(max<=0||top.length!==1)return{winner:-1,budgets:nextBudgets,assets:nextAssets};
  const winner=top[0];nextBudgets[winner]-=max;nextAssets[winner]+=actual;
  return{winner,budgets:nextBudgets,assets:nextAssets};
}

export const auctionGame={
  id:'auction',title:'数字オークション',emoji:'⌁',description:'価値ごとの確率を読み、18点の予算を3回の秘密入札に配分する。',tags:['2〜8人','戦略','読み合い'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){
  if(life.destroyed)return;const n=ctx.session.players.length;beginLot(ctx,{lot:0,lots:sampleThree(),budgets:Array(n).fill(18),assets:Array(n).fill(0)},life);
}
function marketText(lot){return lot.values.map((v,i)=>`${v} (${lot.weights[i]}%)`).join(' / ')}
function beginLot(ctx,state,life){
  if(life.destroyed)return;const lot=state.lots[state.lot];state.actual=weightedValue(lot,Math.random());state.player=0;state.bids=[];pass(ctx,state,life);
}
function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player],lot=state.lots[state.lot];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">AUCTION ${state.lot+1}/3</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">残り予算 ${state.budgets[state.player]}。他の人に入札額を見せないでください。</div><button class="btn primary" id="readyBid">入札する</button></div><div class="rules">品: ${ctx.esc(lot.name)} / 市場シグナル: ${marketText(lot)}。同額最高入札は流札です。</div>`;
  ctx.root.querySelector('#readyBid').onclick=()=>bid(ctx,state,life);
}
function bid(ctx,state,life,message=''){
  if(life.destroyed)return;const lot=state.lots[state.lot],budget=state.budgets[state.player];
  ctx.root.innerHTML=`<div class="eyebrow">SECRET BID</div><div class="prompt compact">${ctx.esc(lot.name)}</div><div class="sub">市場シグナル: ${marketText(lot)} · 残り予算 ${budget}</div>${message?`<div class="notice">${ctx.esc(message)}</div>`:''}<input id="bidValue" type="number" inputmode="numeric" min="0" max="${budget}" value="0" aria-label="入札額"><button class="btn primary full" id="submitBid">この額で入札</button><div class="rules">落札時だけ支払います。期待価値だけでなく、他プレイヤーの入札と残り2品への予算も考えてください。</div>`;
  ctx.root.querySelector('#submitBid').onclick=()=>{const value=Number(ctx.root.querySelector('#bidValue').value);if(!Number.isInteger(value)||value<0||value>budget)return bid(ctx,state,life,`0〜${budget}の整数で入札してください。`);state.bids.push(value);state.player++;state.player<ctx.session.players.length?pass(ctx,state,life):revealLot(ctx,state,life)};
}
function revealLot(ctx,state,life){
  if(life.destroyed)return;const result=resolveAuction(state.bids,state.actual,state.budgets,state.assets);state.budgets=result.budgets;state.assets=result.assets;const lot=state.lots[state.lot];
  const outcome=result.winner<0?'最高入札が同額、または全員0で流札':`${ctx.session.players[result.winner]} が ${state.bids[result.winner]} で落札`;
  ctx.root.innerHTML=`<div class="eyebrow">VALUE REVEAL</div><div class="prompt compact">真の価値 ${state.actual}</div><div class="sub">事前の期待価値 ${expectedLotValue(lot).toFixed(1)} · ${ctx.esc(outcome)}</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)} · 入札 ${state.bids[i]}</span><span>予算 ${state.budgets[i]} / 所有価値 ${state.assets[i]}</span></div>`).join('')}</div><button class="btn primary full" id="nextLot">${state.lot<2?'次の品へ':'最終資産を見る'}</button>`;
  ctx.root.querySelector('#nextLot').onclick=()=>{state.lot++;state.lot<3?beginLot(ctx,state,life):finish(ctx,state,life)};
}
function finish(ctx,state,life){
  if(life.destroyed)return;const wealth=state.budgets.map((b,i)=>b+state.assets[i]),gains=scoreWealth(wealth);gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">FINAL WEALTH</div><div class="prompt compact">予算 + 所有価値</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>${wealth[i]} · +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
