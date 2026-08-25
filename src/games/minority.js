const prompts=[
 ['休日なら？','家でのんびり','外に出たい'],['旅行なら？','計画ガチガチ','ノープラン'],['朝ごはんは？','パン','ご飯'],['遊ぶなら？','海','山'],['飲み物なら？','コーヒー','お茶'],['映画は？','映画館','家'],['性格は？','慎重派','勢い派'],['買い物は？','店で見る','ネットで買う'],['移動は？','電車','車'],['甘いものは？','好き','なくても平気'],['休日の起床は？','早起き','昼まで寝る'],['旅行の荷物は？','少ない','多い'],['連絡は？','電話','メッセージ'],['食事は？','新しい店','いつもの店'],['ゲームは？','協力','対戦'],['季節は？','夏','冬'],['犬と猫なら？','犬','猫'],['お金を使うなら？','モノ','体験'],['予定は？','早めに決める','当日決める'],['写真は？','撮る派','あまり撮らない']
];
const pick=a=>a[Math.floor(Math.random()*a.length)];

export const minorityGame={
  id:'minority',title:'少数派',emoji:'🌓',description:'A/Bを秘密に選択。3人以上は少数派、2人なら一致を狙う。',tags:['2〜8人','心理戦'],
  mount(ctx){const life={destroyed:false,hold:null};start(ctx,life);return()=>{life.destroyed=true;clearTimeout(life.hold)}}
};

function start(ctx,life){if(life.destroyed)return;const [q,a,b]=pick(prompts);pass(ctx,{q,choices:[a,b],player:0,answers:[]},life)}
function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">SECRET VOTE</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">他の人は画面を見ないでください。</div><button class="btn primary" id="reveal">長押しして選ぶ</button></div><div class="rules">3人以上は少数派が得点。2人だけの時は同じ答えなら2人とも得点。</div>`;
  const button=ctx.root.querySelector('#reveal');button.onpointerdown=()=>life.hold=setTimeout(()=>choose(ctx,state,life),350);button.onpointerup=button.onpointerleave=()=>clearTimeout(life.hold);
}
function choose(ctx,state,life){
  if(life.destroyed)return;ctx.root.innerHTML=`<div class="eyebrow">MINORITY</div><div class="prompt">${ctx.esc(state.q)}</div><div class="choice-grid">${state.choices.map((c,i)=>`<button class="choice" data-pick="${i}">${ctx.esc(c)}</button>`).join('')}</div>`;
  ctx.root.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>submit(ctx,state,+b.dataset.pick,life));
}
function submit(ctx,state,value,life){state.answers.push(value);state.player++;if(state.player<ctx.session.players.length)return pass(ctx,state,life);reveal(ctx,state,life)}
function reveal(ctx,state,life){
  const counts=[state.answers.filter(x=>x===0).length,state.answers.filter(x=>x===1).length];
  const gains=Array(state.answers.length).fill(0);
  if(state.answers.length===2){if(state.answers[0]===state.answers[1])gains.fill(1)}
  else if(counts[0]&&counts[1]&&counts[0]!==counts[1]){const minority=counts[0]<counts[1]?0:1;state.answers.forEach((a,i)=>{if(a===minority)gains[i]=counts[minority]===1?3:2})}
  gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">REVEAL</div><div class="prompt">${counts[0]} vs ${counts[1]}</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>${ctx.esc(state.choices[state.answers[i]])} ${gains[i]?`＋${gains[i]}`:'±0'}</span></div>`).join('')}</div><button class="btn primary" style="width:100%;margin-top:18px" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
