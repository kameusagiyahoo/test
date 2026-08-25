const targets=[3,4,5,7,10];
const pick=a=>a[Math.floor(Math.random()*a.length)];

export const clockGame={
  id:'clock',title:'体内時計',emoji:'⏱️',description:'画面の数字を見ずに指定秒数を当てる。最も近い人が得点。',tags:['2〜8人','感覚'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){if(life.destroyed)return;pass(ctx,{target:pick(targets),player:0,times:[]},life)}
function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">BODY CLOCK</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">目標は <b>${state.target}.00秒</b></div><button class="btn primary" id="ready">準備OK</button></div><div class="rules">スタート後は時間表示なし。自分の感覚だけで止めてください。</div>`;
  ctx.root.querySelector('#ready').onclick=()=>run(ctx,state,life);
}
function run(ctx,state,life){
  if(life.destroyed)return;let started=null;
  ctx.root.innerHTML=`<div class="eyebrow">TARGET ${state.target}.00 SEC</div><div class="prompt">準備できたらスタート</div><button class="btn primary" style="width:100%;margin-top:18px" id="startClock">START</button>`;
  ctx.root.querySelector('#startClock').onclick=()=>{
    started=performance.now();
    ctx.root.innerHTML=`<div class="eyebrow">NO PEEK</div><div class="prompt">時間を感じて…</div><div class="big-number">•••</div><button class="btn pink" style="width:100%;margin-top:18px" id="stopClock">STOP</button>`;
    ctx.root.querySelector('#stopClock').onclick=()=>{const elapsed=(performance.now()-started)/1000;state.times.push(elapsed);state.player++;if(state.player<ctx.session.players.length)pass(ctx,state,life);else reveal(ctx,state,life)};
  };
}
function reveal(ctx,state,life){
  const diffs=state.times.map(t=>Math.abs(t-state.target)),best=Math.min(...diffs),winners=diffs.map((d,i)=>Math.abs(d-best)<0.0001?i:-1).filter(i=>i>=0);
  winners.forEach(i=>ctx.session.addScore(i,1));ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">RESULT</div><div class="prompt">目標 ${state.target}.00秒</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>${state.times[i].toFixed(2)}秒 ${winners.includes(i)?'＋1':''}</span></div>`).join('')}</div><button class="btn primary" style="width:100%;margin-top:18px" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
