const TITLES=['基盤刷新','調査分析','自動化','品質改善','UX改善','新規機能','運用整備','データ基盤','高速化'];

function randInt(min,max,rng=Math.random){return min+Math.floor(rng()*(max-min+1))}
export function makePortfolioPuzzle(rng=Math.random){
  const cards=Array.from({length:7},(_,i)=>({id:i,title:TITLES[i],cost:randInt(2,5,rng),value:randInt(3,9,rng)}));
  const a=Math.floor(rng()*cards.length),b=(a+1+Math.floor(rng()*(cards.length-1)))%cards.length;
  return{budget:10,cards,synergy:[a,b],bonus:5};
}

export function portfolioValue(selected,puzzle){
  const ids=new Set(selected),cost=puzzle.cards.reduce((s,c)=>s+(ids.has(c.id)?c.cost:0),0);
  const base=puzzle.cards.reduce((s,c)=>s+(ids.has(c.id)?c.value:0),0);
  const synergy=puzzle.synergy.every(id=>ids.has(id))?puzzle.bonus:0;
  return{cost,value:cost<=puzzle.budget?base+synergy:-Infinity,base,synergy,valid:cost<=puzzle.budget};
}

export function bestPortfolio(puzzle){
  let best={value:-Infinity,selected:[]};const n=puzzle.cards.length;
  for(let mask=0;mask<(1<<n);mask++){
    const selected=[];for(let i=0;i<n;i++)if(mask&(1<<i))selected.push(i);
    const result=portfolioValue(selected,puzzle);if(result.valid&&result.value>best.value)best={value:result.value,selected};
  }
  return best;
}

export function portfolioGain(value,optimum){return value===optimum?2:value>=optimum-2?1:0}

export const portfolioGame={
  id:'portfolio',title:'ポートフォリオ10',emoji:'▤',description:'予算10で案件を選び、コスト・価値・シナジーを組み合わせて最大得点を設計する。',tags:['2〜8人','最適化','資源管理'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){if(life.destroyed)return;pass(ctx,{puzzle:makePortfolioPuzzle(),player:0,answers:[]},life)}
function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">PORTFOLIO 10</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">全員同じ問題です。答えを他の人に見せずに選んでください。</div><button class="btn primary" id="readyPortfolio">問題を見る</button></div><div class="rules">予算は10。案件はいくつ選んでも構いません。指定された2案件を両方取るとシナジー +${state.puzzle.bonus}。</div>`;
  ctx.root.querySelector('#readyPortfolio').onclick=()=>choose(ctx,state,life,new Set());
}
function choose(ctx,state,life,selected,message=''){
  if(life.destroyed)return;const p=state.puzzle,result=portfolioValue([...selected],p);
  const [sa,sb]=p.synergy;
  ctx.root.innerHTML=`<div class="eyebrow">OPTIMIZATION</div><div class="prompt compact">予算10を使う</div><div class="sub">シナジー: ${ctx.esc(p.cards[sa].title)} + ${ctx.esc(p.cards[sb].title)} → +${p.bonus}</div>${message?`<div class="notice">${ctx.esc(message)}</div>`:''}<div class="portfolio-grid">${p.cards.map(card=>`<button class="portfolio-card ${selected.has(card.id)?'selected':''}" data-project="${card.id}"><b>${ctx.esc(card.title)}</b><span>コスト ${card.cost}</span><span>価値 ${card.value}</span></button>`).join('')}</div><div class="portfolio-total">使用 ${result.cost}/10 · 現在価値 ${result.valid?result.base+result.synergy:'予算超過'}${result.synergy?`（シナジー +${result.synergy}）`:''}</div><button class="btn primary full" id="submitPortfolio">この構成で決定</button><div class="rules">単純な価値/コスト比だけでなく、シナジーを成立させるために何を捨てるかがポイントです。</div>`;
  ctx.root.querySelectorAll('[data-project]').forEach(button=>button.onclick=()=>{const id=+button.dataset.project;selected.has(id)?selected.delete(id):selected.add(id);choose(ctx,state,life,selected)});
  ctx.root.querySelector('#submitPortfolio').onclick=()=>{
    const final=portfolioValue([...selected],p);if(!selected.size)return choose(ctx,state,life,selected,'1件以上選んでください。');if(!final.valid)return choose(ctx,state,life,selected,'予算10以内にしてください。');
    state.answers.push({selected:[...selected],...final});state.player++;state.player<ctx.session.players.length?pass(ctx,state,life):reveal(ctx,state,life);
  };
}
function reveal(ctx,state,life){
  if(life.destroyed)return;const optimum=bestPortfolio(state.puzzle),gains=state.answers.map(a=>portfolioGain(a.value,optimum.value));
  gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  const bestNames=optimum.selected.map(id=>state.puzzle.cards[id].title).join(' / ');
  ctx.root.innerHTML=`<div class="eyebrow">OPTIMUM REVEAL</div><div class="prompt compact">理論最大 ${optimum.value}</div><div class="sub">最適構成の一例: ${ctx.esc(bestNames)}</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)} · コスト ${state.answers[i].cost}</span><span>価値 ${state.answers[i].value} → +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="portfolioNext">次へ</button>`;
  ctx.root.querySelector('#portfolioNext').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
