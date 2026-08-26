function shuffle(values,rng=Math.random){
  const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;
}

export function makeProjects(playerCount,rng=Math.random){
  const capacities=shuffle([playerCount*2-1,playerCount*2,playerCount*2+1],rng);
  const values=shuffle([2,3,4],rng);
  const names=shuffle(['研究','物流','ブランド'],rng);
  return names.map((name,i)=>({name,capacity:capacities[i],value:values[i]}));
}

export function resolveAllocations(allocations,projects){
  const totals=projects.map((_,j)=>allocations.reduce((sum,row)=>sum+(row[j]||0),0));
  const active=projects.map((p,j)=>totals[j]<=p.capacity);
  const scores=allocations.map(row=>row.reduce((sum,amount,j)=>sum+(active[j]?amount*projects[j].value:0),0));
  return{totals,active,scores};
}

export function allocationGains(scores){
  const distinct=[...new Set(scores)].sort((a,b)=>b-a);
  return scores.map(v=>distinct.indexOf(v)===0?2:distinct.indexOf(v)===1?1:0);
}

export const allocationGame={
  id:'allocation',title:'リソース・シフト',emoji:'◫',description:'6資源を3案件へ秘密配分。容量超過で案件ごと失敗するため、他人の配分まで読む。',tags:['2〜8人','資源管理','読み合い'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){
  if(life.destroyed)return;pass(ctx,{projects:makeProjects(ctx.session.players.length),player:0,allocations:[]},life);
}

function projectSummary(ctx,projects){return`<div class="project-strip">${projects.map(p=>`<div class="project-mini"><b>${ctx.esc(p.name)}</b><span>容量 ${p.capacity}</span><span>1資源 = ${p.value}点</span></div>`).join('')}</div>`}

function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">RESOURCE SHIFT</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">6資源を3案件に秘密で配分します。合計は必ず6。</div><button class="btn primary" id="readyAllocation">配分する</button></div>${projectSummary(ctx,state.projects)}<div class="rules">案件ごとの全員合計が容量を1でも超えると、その案件は全員0点。成功案件だけ「自分の投入量 × 単価」が得点になります。</div>`;
  ctx.root.querySelector('#readyAllocation').onclick=()=>choose(ctx,state,life);
}

function choose(ctx,state,life,message=''){
  if(life.destroyed)return;
  ctx.root.innerHTML=`<div class="eyebrow">SECRET ALLOCATION</div><div class="prompt compact">6資源を配分</div>${projectSummary(ctx,state.projects)}${message?`<div class="notice">${ctx.esc(message)}</div>`:''}<div class="allocation-inputs">${state.projects.map((p,i)=>`<label><span>${ctx.esc(p.name)}</span><input data-allocation="${i}" type="number" inputmode="numeric" min="0" max="6" value="2"></label>`).join('')}</div><button class="btn primary full" id="submitAllocation">この配分で決定</button><div class="rules">高単価へ集中すると魅力的ですが、他プレイヤーも集中すると案件全体が失敗します。</div>`;
  ctx.root.querySelector('#submitAllocation').onclick=()=>{
    const row=[...ctx.root.querySelectorAll('[data-allocation]')].map(input=>Number(input.value));
    if(row.some(v=>!Number.isInteger(v)||v<0||v>6)||row.reduce((a,b)=>a+b,0)!==6)return choose(ctx,state,life,'0〜6の整数で、合計が6になるよう配分してください。');
    state.allocations.push(row);state.player++;state.player<ctx.session.players.length?pass(ctx,state,life):reveal(ctx,state,life);
  };
}

function reveal(ctx,state,life){
  if(life.destroyed)return;const result=resolveAllocations(state.allocations,state.projects),gains=allocationGains(result.scores);
  gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">MARKET CLEAR</div><div class="prompt compact">配分公開</div><div class="result-list">${state.projects.map((p,j)=>`<div class="result-row"><span>${ctx.esc(p.name)} · 合計 ${result.totals[j]}/${p.capacity}</span><span>${result.active[j]?`成立 ×${p.value}`:'容量超過 · 0点'}</span></div>`).join('')}</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)} · ${state.allocations[i].join(' / ')}</span><span>${result.scores[i]} → +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="allocationNext">次へ</button>`;
  ctx.root.querySelector('#allocationNext').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
