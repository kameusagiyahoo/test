const BASE_FRONTS=[
  {name:'ALPHA',value:2},{name:'BETA',value:3},{name:'GAMMA',value:4}
];

export function resolveFront(deployments,frontIndex){
  const entries=deployments.map((d,i)=>d.front===frontIndex?{player:i,power:d.power}:null).filter(Boolean);
  if(!entries.length)return{winner:-1,power:0};
  const max=Math.max(...entries.map(e=>e.power));
  const top=entries.filter(e=>e.power===max);
  return top.length===1?{winner:top[0].player,power:max}:{winner:-1,power:max};
}

export function rankFrontline(scores){
  const positive=[...new Set(scores.filter(v=>v>0))].sort((a,b)=>b-a);
  return scores.map(v=>v>0?(positive.indexOf(v)===0?2:positive.indexOf(v)===1?1:0):0);
}

function shuffle(values,rng=Math.random){
  const a=[...values];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}

export function makeFronts(rng=Math.random){
  return shuffle(BASE_FRONTS,rng).map((f,i)=>({...f,value:[2,3,4][i]}));
}

export const frontlineGame={
  id:'frontline',title:'フロントライン',emoji:'⋮',
  description:'1〜5の戦力カードを3戦線へ投入。どこへ、どれだけ出すかを相手の残り札から読む。',
  tags:['2〜8人','戦略','先読み'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){
  if(life.destroyed)return;
  const n=ctx.session.players.length;
  beginRound(ctx,{round:0,fronts:makeFronts(),available:Array.from({length:n},()=>[1,2,3,4,5]),raw:Array(n).fill(0),history:[]},life);
}

function frontStrip(ctx,state){
  return `<div class="front-strip">${state.fronts.map((f,i)=>`<div class="front-card"><b>${ctx.esc(f.name)}</b><span>${f.value}点戦線</span><small>${state.history.map(h=>h[i]?.text||'').filter(Boolean).at(-1)||'未決着'}</small></div>`).join('')}</div>`;
}

function beginRound(ctx,state,life){
  if(life.destroyed)return;
  state.player=0;state.deployments=[];
  pass(ctx,state,life);
}

function pass(ctx,state,life){
  if(life.destroyed)return;
  ctx.renderScorebar(state.player);
  const name=ctx.session.players[state.player],cards=state.available[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">FRONT ${state.round+1}/3</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">残り戦力: ${cards.join(' · ')}</div><button class="btn primary" id="readyFront">配置する</button></div>${frontStrip(ctx,state)}<div class="rules">各ラウンド1枚だけ使用。各戦線の最高戦力が単独なら、その人が戦線点を獲得。最高値が同点ならその戦線は流れます。</div>`;
  ctx.root.querySelector('#readyFront').onclick=()=>choose(ctx,state,life);
}

function choose(ctx,state,life,selectedFront=0){
  if(life.destroyed)return;
  const cards=state.available[state.player];
  ctx.root.innerHTML=`<div class="eyebrow">SECRET DEPLOY</div><div class="prompt compact">戦線と戦力を選択</div>${frontStrip(ctx,state)}<div class="front-choice">${state.fronts.map((f,i)=>`<button class="choice ${selectedFront===i?'selected':''}" data-front="${i}">${ctx.esc(f.name)} · ${f.value}点</button>`).join('')}</div><div class="power-row">${cards.map(v=>`<button class="choice" data-power="${v}">戦力 ${v}</button>`).join('')}</div><div class="rules">強い札を今使うほど今ラウンドは有利ですが、後半の高価値戦線で使えなくなります。</div>`;
  ctx.root.querySelectorAll('[data-front]').forEach(b=>b.onclick=()=>choose(ctx,state,life,+b.dataset.front));
  ctx.root.querySelectorAll('[data-power]').forEach(b=>b.onclick=()=>{
    const power=+b.dataset.power;
    state.deployments.push({front:selectedFront,power});
    state.available[state.player]=state.available[state.player].filter(v=>v!==power);
    state.player++;
    state.player<ctx.session.players.length?pass(ctx,state,life):reveal(ctx,state,life);
  });
}

function reveal(ctx,state,life){
  if(life.destroyed)return;
  const frontResults=state.fronts.map((f,i)=>{
    const r=resolveFront(state.deployments,i);
    if(r.winner>=0)state.raw[r.winner]+=f.value;
    return r;
  });
  state.history.push(frontResults.map((r)=>({
    text:r.winner>=0?(ctx.session.players[r.winner]+' · 戦力'+r.power):(r.power?('同点流れ · '+r.power):'配置なし')
  })));
  ctx.root.innerHTML=`<div class="eyebrow">FRONT ${state.round+1} RESULT</div><div class="prompt compact">配置公開</div><div class="result-list">${state.fronts.map((f,i)=>{const r=frontResults[i];return`<div class="result-row"><span>${ctx.esc(f.name)} · ${f.value}点</span><span>${r.winner>=0?`${ctx.esc(ctx.session.players[r.winner])} / 戦力 ${r.power}`:r.power?`最高 ${r.power} が同点`:'配置なし'}</span></div>`}).join('')}</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)} · ${state.fronts[state.deployments[i].front].name}</span><span>戦力 ${state.deployments[i].power} / 累計 ${state.raw[i]}</span></div>`).join('')}</div><button class="btn primary full" id="nextFront">${state.round<2?'次の配置へ':'最終結果'}</button>`;
  ctx.root.querySelector('#nextFront').onclick=()=>{
    state.round++;
    state.round<3?beginRound(ctx,state,life):finish(ctx,state,life);
  };
}

function finish(ctx,state,life){
  if(life.destroyed)return;
  const gains=rankFrontline(state.raw);
  gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});
  ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">CAMPAIGN RESULT</div><div class="prompt compact">3戦線終了</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>戦線点 ${state.raw[i]} → +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="frontFinish">次へ</button>`;
  ctx.root.querySelector('#frontFinish').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
