const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export const SNIPER_RULES=Object.freeze([
  Object.freeze({id:'low',label:'LOW',factor:0.6,percent:60,description:'平均よりかなり低めを読む'}),
  Object.freeze({id:'classic',label:'CLASSIC',factor:0.7,percent:70,description:'定番の70%ルール'}),
  Object.freeze({id:'mirror',label:'MIRROR',factor:1,percent:100,description:'みんなの平均そのものを読む'}),
  Object.freeze({id:'high',label:'HIGH',factor:1.2,percent:120,description:'平均より高めを読む'})
]);

export function resolveSniperRound(answers,rule=SNIPER_RULES[1]){
  const values=answers.map(Number);
  const average=values.reduce((sum,value)=>sum+value,0)/values.length;
  const rawTarget=average*rule.factor;
  const target=clamp(Math.round(rawTarget),0,9);
  const distances=values.map(value=>Math.abs(value-target));
  const best=Math.min(...distances);
  const winners=distances.map((distance,index)=>distance===best?index:-1).filter(index=>index>=0);
  return{average,rawTarget,target,winners,exact:winners.filter(index=>values[index]===target)};
}

export function nextSniperRule(previousId=null,rng=Math.random){
  const candidates=SNIPER_RULES.filter(rule=>rule.id!==previousId);
  const index=Math.min(candidates.length-1,Math.floor(rng()*candidates.length));
  return candidates[index];
}

export const sniperGame={
  id:'sniper',title:'数字スナイパー+',emoji:'🎯',description:'毎ラウンド変わる倍率を読み、全員の平均から決まるターゲットへ最も近づける。',tags:['2〜8人','読み合い'],
  mount(ctx){const life={destroyed:false,hold:null,lastRule:null};start(ctx,life);return()=>{life.destroyed=true;clearTimeout(life.hold)}}
};

function start(ctx,life){
  if(life.destroyed)return;
  const rule=nextSniperRule(life.lastRule);
  life.lastRule=rule.id;
  pass(ctx,{player:0,answers:[],rule},life);
}

function pass(ctx,state,life){
  if(life.destroyed)return;
  ctx.renderScorebar(state.player);
  const name=ctx.session.players[state.player],rule=state.rule;
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">TARGET RULE · ${rule.label}</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">今回は <b>平均 × ${rule.percent}%</b><br>${ctx.esc(rule.description)}</div><button class="btn primary" id="reveal">長押しして数字を選ぶ</button></div><div class="rules">0〜9から秘密で選択。全員の平均に今回の倍率を掛け、四捨五入した0〜9の数字がターゲットです。</div>`;
  const button=ctx.root.querySelector('#reveal');
  button.onpointerdown=()=>life.hold=setTimeout(()=>choose(ctx,state,life),350);
  button.onpointerup=button.onpointerleave=()=>clearTimeout(life.hold);
}

function choose(ctx,state,life){
  const rule=state.rule;
  ctx.root.innerHTML=`<div class="eyebrow">${rule.label} · ×${rule.percent}%</div><div class="prompt">0〜9から1つ</div><div class="sub" style="text-align:center">${ctx.esc(rule.description)}</div><div class="choice-grid">${Array.from({length:10},(_,i)=>`<button class="choice" data-num="${i}">${i}</button>`).join('')}</div>`;
  ctx.root.querySelectorAll('[data-num]').forEach(button=>button.onclick=()=>submit(ctx,state,+button.dataset.num,life));
}

function submit(ctx,state,value,life){
  state.answers.push(value);
  state.player++;
  if(state.player<ctx.session.players.length)return pass(ctx,state,life);
  reveal(ctx,state,life);
}

function reveal(ctx,state,life){
  const result=resolveSniperRound(state.answers,state.rule);
  result.winners.forEach(index=>ctx.session.addScore(index,result.exact.includes(index)?2:1));
  ctx.renderScorebar();
  const clamped=result.rawTarget<0||result.rawTarget>9;
  ctx.root.innerHTML=`<div class="eyebrow">${state.rule.label} · ×${state.rule.percent}%</div><div class="prompt">TARGET ${result.target}</div><div class="sub" style="text-align:center">平均 ${result.average.toFixed(1)} × ${state.rule.factor.toFixed(1)} = ${result.rawTarget.toFixed(1)} → ${result.target}${clamped?'（0〜9に補正）':''}</div><div class="result-list">${ctx.session.players.map((name,index)=>`<div class="result-row"><span>${ctx.esc(name)}</span><span>${state.answers[index]} ${result.winners.includes(index)?`＋${result.exact.includes(index)?2:1}`:'±0'}</span></div>`).join('')}</div><button class="btn primary" style="width:100%;margin-top:18px" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
