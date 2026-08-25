const draw=()=>Math.floor(Math.random()*5)+1;

export function resolveTenWinners(totals,bust){
  const safe=totals.map((t,i)=>bust[i]?-Infinity:t);
  const bestSafe=Math.max(...safe);
  if(bestSafe>-Infinity)return safe.map((v,i)=>v===bestSafe?i:-1).filter(i=>i>=0);
  const leastOver=Math.min(...totals);
  return totals.map((v,i)=>v===leastOver?i:-1).filter(i=>i>=0);
}

export const tenGame={
  id:'ten',title:'ギリギリ10',emoji:'🃏',description:'1〜5を引いて10を超えないギリギリを狙う。全員の合計は最後に公開。',tags:['2〜8人','チキンレース'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){if(life.destroyed)return;pass(ctx,{player:0,totals:[],bust:[]},life)}
function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">SECRET TOTAL</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">他の人は画面を見ないでください。</div><button class="btn primary" id="ready">自分のターンを始める</button></div><div class="rules">最初に必ず1枚引きます。以後は1〜5のカードを何枚でも追加でき、10を超えるとバースト。</div>`;
  ctx.root.querySelector('#ready').onclick=()=>play(ctx,state,{total:0,last:null,draws:0},life);
}
function play(ctx,state,hand,life){
  if(life.destroyed)return;const busted=hand.total>10,canStop=hand.draws>0;
  ctx.root.innerHTML=`<div class="eyebrow">PUSH YOUR LUCK</div><div class="prompt">合計 ${hand.total}</div>${hand.last?`<div class="sub" style="text-align:center">今引いたカード: +${hand.last}</div>`:''}${busted?'<div class="big-number danger">BUST!</div>':`<div class="choice-grid"><button class="choice" id="draw">🎴 引く<br><small>1〜5</small></button>${canStop?'<button class="choice" id="stop">✋ 止める</button>':''}</div>`}<div class="rules">10ちょうどが最強。0のまま止めることはできません。</div>${busted?'<button class="btn primary" style="width:100%;margin-top:18px" id="done">次の人へ</button>':''}`;
  ctx.root.querySelector('#draw')?.addEventListener('click',()=>{const value=draw();play(ctx,state,{total:hand.total+value,last:value,draws:hand.draws+1},life)});
  ctx.root.querySelector('#stop')?.addEventListener('click',()=>finishPlayer(ctx,state,hand.total,false,life));
  ctx.root.querySelector('#done')?.addEventListener('click',()=>finishPlayer(ctx,state,hand.total,true,life));
}
function finishPlayer(ctx,state,total,bust,life){
  state.totals.push(total);state.bust.push(bust||total>10);state.player++;
  if(state.player<ctx.session.players.length)return pass(ctx,state,life);reveal(ctx,state,life);
}
function reveal(ctx,state,life){
  const winners=resolveTenWinners(state.totals,state.bust),allBust=state.bust.every(Boolean);
  winners.forEach(i=>ctx.session.addScore(i,1));ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">SHOWDOWN</div><div class="prompt">ギリギリ勝負！</div>${allBust?'<div class="sub" style="text-align:center">全員BUSTのため、10を最も少なく超えた人が勝ち。</div>':''}<div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>${state.totals[i]} ${state.bust[i]?'BUST ':''}${winners.includes(i)?'＋1':state.bust[i]?'':'±0'}</span></div>`).join('')}</div><button class="btn primary" style="width:100%;margin-top:18px" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
