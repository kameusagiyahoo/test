const scenarios=[
  [{label:'確実',p:1,win:1,lose:0},{label:'標準',p:.7,win:5,lose:-4},{label:'強気',p:.35,win:12,lose:-3}],
  [{label:'確実',p:1,win:2,lose:0},{label:'標準',p:.6,win:7,lose:-4},{label:'強気',p:.3,win:15,lose:-2}],
  [{label:'確実',p:1,win:1,lose:0},{label:'標準',p:.75,win:4,lose:-3},{label:'強気',p:.45,win:9,lose:-4}],
  [{label:'確実',p:1,win:2,lose:0},{label:'標準',p:.55,win:8,lose:-4},{label:'強気',p:.25,win:18,lose:-2}]
];
const pick=a=>a[Math.floor(Math.random()*a.length)];
export const expectedValue=c=>c.p*c.win+(1-c.p)*c.lose;
export const resolveContract=(c,roll)=>roll<c.p?c.win:c.lose;

function scoreTotals(values){
  const distinct=[...new Set(values)].sort((a,b)=>b-a),points=[2,1];
  return values.map(v=>points[distinct.indexOf(v)]||0);
}

export const evGame={
  id:'ev',title:'期待値チキンレース',emoji:'±',description:'成功率と損益だけを見て3回の投資判断。期待値とリスクのどちらを取るかを競う。',tags:['2〜8人','確率','戦略'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){if(life.destroyed)return;beginStage(ctx,{stage:0,totals:Array(ctx.session.players.length).fill(10)},life)}
function beginStage(ctx,state,life){
  if(life.destroyed)return;state.contracts=pick(scenarios);state.player=0;state.choices=[];pass(ctx,state,life);
}
function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">DECISION ${state.stage+1}/3</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">現在の資産 ${state.totals[state.player]}。他の人は選択を見ないでください。</div><button class="btn primary" id="readyEv">選択する</button></div><div class="rules">各案の成功率と成功/失敗時の増減は公開。期待値は自分で計算してください。</div>`;
  ctx.root.querySelector('#readyEv').onclick=()=>choose(ctx,state,life);
}
function contractHtml(c){return`${c.label}<br><small>成功 ${Math.round(c.p*100)}%: ${c.win>=0?'+':''}${c.win} / 失敗: ${c.lose>=0?'+':''}${c.lose}</small>`}
function choose(ctx,state,life){
  if(life.destroyed)return;ctx.root.innerHTML=`<div class="eyebrow">RISK / RETURN</div><div class="prompt compact">どれを選ぶ？</div><div class="choice-grid">${state.contracts.map((c,i)=>`<button class="choice" data-contract="${i}">${contractHtml(c)}</button>`).join('')}</div><div class="rules">安全策が必ず最良とは限りません。残り2回の判断もあります。</div>`;
  ctx.root.querySelectorAll('[data-contract]').forEach(b=>b.onclick=()=>submit(ctx,state,+b.dataset.contract,life));
}
function submit(ctx,state,choice,life){
  if(life.destroyed)return;state.choices.push(choice);state.player++;state.player<ctx.session.players.length?pass(ctx,state,life):resolveStage(ctx,state,life);
}
function resolveStage(ctx,state,life){
  if(life.destroyed)return;const deltas=state.choices.map((choice,i)=>{const d=resolveContract(state.contracts[choice],Math.random());state.totals[i]+=d;return d});
  ctx.root.innerHTML=`<div class="eyebrow">DECISION ${state.stage+1} RESULT</div><div class="prompt compact">結果公開</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)} · ${state.contracts[state.choices[i]].label}</span><span>${deltas[i]>=0?'+':''}${deltas[i]} → ${state.totals[i]}</span></div>`).join('')}</div><button class="btn primary full" id="nextEv">${state.stage<2?'次の判断へ':'最終結果'}</button>`;
  ctx.root.querySelector('#nextEv').onclick=()=>{state.stage++;state.stage<3?beginStage(ctx,state,life):finish(ctx,state,life)};
}
function finish(ctx,state,life){
  if(life.destroyed)return;const gains=scoreTotals(state.totals);gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">FINAL BALANCE</div><div class="prompt compact">3判断終了</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>${state.totals[i]} · +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
