const pick=a=>a[Math.floor(Math.random()*a.length)];
const themes=['0〜9の数字を1つ選ぶ','みんなが選びそうな数字を読む','高すぎても低すぎても危険'];

export const sniperGame={
  id:'sniper',title:'数字スナイパー',emoji:'🎯',description:'全員が0〜9を秘密に選び、平均の70%に最も近い人が得点。',tags:['2〜8人','読み合い'],
  mount(ctx){const life={destroyed:false,hold:null};start(ctx,life);return()=>{life.destroyed=true;clearTimeout(life.hold)}}
};

function start(ctx,life){if(life.destroyed)return;pass(ctx,{player:0,answers:[],hint:pick(themes)},life)}
function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">SECRET NUMBER</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">${ctx.esc(state.hint)}</div><button class="btn primary" id="reveal">長押しして数字を選ぶ</button></div><div class="rules">全員の平均 × 0.7 を四捨五入した数字がターゲット。最も近い人が得点。</div>`;
  const button=ctx.root.querySelector('#reveal');button.onpointerdown=()=>life.hold=setTimeout(()=>choose(ctx,state,life),350);button.onpointerup=button.onpointerleave=()=>clearTimeout(life.hold);
}
function choose(ctx,state,life){
  ctx.root.innerHTML=`<div class="eyebrow">NUMBER SNIPER</div><div class="prompt">0〜9から1つ</div><div class="choice-grid">${Array.from({length:10},(_,i)=>`<button class="choice" data-num="${i}">${i}</button>`).join('')}</div>`;
  ctx.root.querySelectorAll('[data-num]').forEach(b=>b.onclick=()=>submit(ctx,state,+b.dataset.num,life));
}
function submit(ctx,state,value,life){state.answers.push(value);state.player++;if(state.player<ctx.session.players.length)return pass(ctx,state,life);reveal(ctx,state,life)}
function reveal(ctx,state,life){
  const avg=state.answers.reduce((a,b)=>a+b,0)/state.answers.length,target=Math.round(avg*0.7),dist=state.answers.map(v=>Math.abs(v-target)),best=Math.min(...dist),winners=dist.map((d,i)=>d===best?i:-1).filter(i=>i>=0);
  winners.forEach(i=>ctx.session.addScore(i,state.answers[i]===target?2:1));ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">TARGET</div><div class="prompt">平均 ${avg.toFixed(1)} → 70% = ${target}</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>${state.answers[i]} ${winners.includes(i)?`＋${state.answers[i]===target?2:1}`:'±0'}</span></div>`).join('')}</div><button class="btn primary" style="width:100%;margin-top:18px" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
