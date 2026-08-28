const ACTIONS=[
  {id:'S',name:'STRIKE',label:'攻め'},
  {id:'G',name:'GUARD',label:'守り'},
  {id:'F',name:'FEINT',label:'フェイント'}
];

export const SEQUENCES=[
  ['S','G','F'],['S','F','G'],['G','S','F'],
  ['G','F','S'],['F','S','G'],['F','G','S']
];

export function duelWinner(a,b){
  if(a===b)return -1;
  return (a==='S'&&b==='F')||(a==='F'&&b==='G')||(a==='G'&&b==='S')?0:1;
}

export function scoreDuelStep(actions){
  const scores=Array(actions.length).fill(0);
  for(let i=0;i<actions.length;i++)for(let j=i+1;j<actions.length;j++){
    const winner=duelWinner(actions[i],actions[j]);
    if(winner===0)scores[i]++;else if(winner===1)scores[j]++;
  }
  return scores;
}

function rankGains(scores){
  const positive=[...new Set(scores.filter(v=>v>0))].sort((a,b)=>b-a);
  return scores.map(v=>v>0?(positive.indexOf(v)===0?2:positive.indexOf(v)===1?1:0):0);
}

function actionName(id){return ACTIONS.find(a=>a.id===id)?.label||id}
function seqLabel(seq){return seq.map(actionName).join(' → ')}

export const sequenceGame={
  id:'sequence',title:'シークエンス・デュエル',emoji:'≋',
  description:'攻め・守り・フェイントを1回ずつ使う3手を先にロック。公開されるたびに相手の残り手が絞られる。',
  tags:['2〜8人','先読み','対戦'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){
  if(life.destroyed)return;
  pass(ctx,{player:0,sequences:[],step:0,raw:Array(ctx.session.players.length).fill(0)},life);
}

function pass(ctx,state,life){
  if(life.destroyed)return;
  ctx.renderScorebar(state.player);
  const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">LOCK 3 MOVES</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">3手すべてを今決めます。決定後は変更できません。</div><button class="btn primary" id="readySeq">作戦を選ぶ</button></div><div class="rules">攻めはフェイントに勝つ / フェイントは守りに勝つ / 守りは攻めに勝つ。各手は1回ずつです。</div>`;
  ctx.root.querySelector('#readySeq').onclick=()=>choose(ctx,state,life);
}

function choose(ctx,state,life){
  if(life.destroyed)return;
  ctx.root.innerHTML=`<div class="eyebrow">PROGRAM</div><div class="prompt compact">3手をロック</div><div class="choice-grid">${SEQUENCES.map((seq,i)=>`<button class="choice" data-seq="${i}"><b>${i+1}</b><br><small>${seqLabel(seq)}</small></button>`).join('')}</div><div class="rules">1手目が公開された後、相手の残り2手は絞れます。自分も相手も途中変更はできません。</div>`;
  ctx.root.querySelectorAll('[data-seq]').forEach(b=>b.onclick=()=>{
    state.sequences.push(SEQUENCES[+b.dataset.seq]);
    state.player++;
    state.player<ctx.session.players.length?pass(ctx,state,life):revealStep(ctx,state,life);
  });
}

function revealStep(ctx,state,life){
  if(life.destroyed)return;
  const actions=state.sequences.map(seq=>seq[state.step]);
  const stepScores=scoreDuelStep(actions);
  stepScores.forEach((v,i)=>state.raw[i]+=v);
  ctx.root.innerHTML=`<div class="eyebrow">STEP ${state.step+1}/3</div><div class="prompt compact">同時公開</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)} · ${actionName(actions[i])}</span><span>今回 +${stepScores[i]} / 累計 ${state.raw[i]}</span></div>`).join('')}</div><div class="rules">${state.step<2?'次の手はすでにロック済み。ここまでの公開情報から残り手を推理できます。':'3手すべて終了です。'}</div><button class="btn primary full" id="nextSeq">${state.step<2?'次の手を公開':'結果を見る'}</button>`;
  ctx.root.querySelector('#nextSeq').onclick=()=>{
    state.step++;
    state.step<3?revealStep(ctx,state,life):finish(ctx,state,life);
  };
}

function finish(ctx,state,life){
  if(life.destroyed)return;
  const gains=rankGains(state.raw);
  gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});
  ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">DUEL RESULT</div><div class="prompt compact">3手の読み合い終了</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>対戦点 ${state.raw[i]} → +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="seqNext">次へ</button>`;
  ctx.root.querySelector('#seqNext').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
