export function makeRewardSchedule(rng=Math.random){
  const a=[1,2,3,4,5];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}

export function uniqueHighestWinner(cards){
  const counts=new Map();
  cards.forEach(v=>counts.set(v,(counts.get(v)||0)+1));
  const uniques=[...counts.entries()].filter(([,count])=>count===1).map(([v])=>v).sort((a,b)=>b-a);
  if(!uniques.length)return -1;
  return cards.indexOf(uniques[0]);
}

function rankGains(scores){
  const positive=[...new Set(scores.filter(v=>v>0))].sort((a,b)=>b-a);
  return scores.map(v=>v>0?(positive.indexOf(v)===0?2:positive.indexOf(v)===1?1:0):0);
}

export const priorityGame={
  id:'priority',title:'プライオリティ5',emoji:'Ⅴ',
  description:'5ラウンドの報酬を最初から公開。1〜5のカードを1度ずつ使い、どの勝負に強い札を残すかを読む。',
  tags:['2〜8人','先読み','カード管理'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){
  if(life.destroyed)return;
  const n=ctx.session.players.length;
  beginRound(ctx,{round:0,rewards:makeRewardSchedule(),available:Array.from({length:n},()=>[1,2,3,4,5]),raw:Array(n).fill(0)},life);
}

function rewardTrack(state){
  return `<div class="reward-track">${state.rewards.map((r,i)=>`<div class="reward-chip ${i===state.round?'current':''} ${i<state.round?'done':''}"><small>R${i+1}</small><b>${r}</b></div>`).join('')}</div>`;
}

function beginRound(ctx,state,life){
  if(life.destroyed)return;
  state.player=0;state.cards=[];
  pass(ctx,state,life);
}

function pass(ctx,state,life){
  if(life.destroyed)return;
  ctx.renderScorebar(state.player);
  const name=ctx.session.players[state.player],cards=state.available[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">PRIORITY ${state.round+1}/5</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">今回の報酬 ${state.rewards[state.round]}。残り札: ${cards.join(' · ')}</div><button class="btn primary" id="readyPriority">カードを出す</button></div>${rewardTrack(state)}<div class="rules">最高の「単独カード」が勝ちます。同じ数字が複数出た場合、その数字は勝者候補から消え、次に高い単独カードへ移ります。</div>`;
  ctx.root.querySelector('#readyPriority').onclick=()=>choose(ctx,state,life);
}

function choose(ctx,state,life){
  if(life.destroyed)return;
  const cards=state.available[state.player];
  ctx.root.innerHTML=`<div class="eyebrow">SECRET CARD</div><div class="prompt compact">今回どこまで使う？</div>${rewardTrack(state)}<div class="power-row">${cards.map(v=>`<button class="choice" data-card="${v}">カード ${v}</button>`).join('')}</div><div class="rules">後の高報酬ラウンドに5を残すか、相手が温存すると読んで今使うか。全5ラウンドの報酬順は公開されています。</div>`;
  ctx.root.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{
    const card=+b.dataset.card;
    state.cards.push(card);
    state.available[state.player]=state.available[state.player].filter(v=>v!==card);
    state.player++;
    state.player<ctx.session.players.length?pass(ctx,state,life):reveal(ctx,state,life);
  });
}

function reveal(ctx,state,life){
  if(life.destroyed)return;
  const winner=uniqueHighestWinner(state.cards),reward=state.rewards[state.round];
  if(winner>=0)state.raw[winner]+=reward;
  ctx.root.innerHTML=`<div class="eyebrow">ROUND ${state.round+1} RESULT</div><div class="prompt compact">${winner>=0?`${ctx.esc(ctx.session.players[winner])} が ${reward}点獲得`:'単独最高札なし · 流局'}</div>${rewardTrack(state)}<div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>カード ${state.cards[i]} / 累計 ${state.raw[i]}</span></div>`).join('')}</div><button class="btn primary full" id="nextPriority">${state.round<4?'次のラウンド':'最終結果'}</button>`;
  ctx.root.querySelector('#nextPriority').onclick=()=>{
    state.round++;
    state.round<5?beginRound(ctx,state,life):finish(ctx,state,life);
  };
}

function finish(ctx,state,life){
  if(life.destroyed)return;
  const gains=rankGains(state.raw);
  gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});
  ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">PRIORITY RESULT</div><div class="prompt compact">5枚を使い切りました</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>報酬点 ${state.raw[i]} → +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="priorityFinish">次へ</button>`;
  ctx.root.querySelector('#priorityFinish').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
