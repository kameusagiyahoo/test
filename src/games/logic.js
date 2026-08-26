const STATEMENTS=[
  {text:'犯人はAだ',test:c=>c===0},{text:'犯人はBだ',test:c=>c===1},{text:'犯人はCだ',test:c=>c===2},
  {text:'犯人はAではない',test:c=>c!==0},{text:'犯人はBではない',test:c=>c!==1},{text:'犯人はCではない',test:c=>c!==2},
  {text:'犯人はAかBのどちらかだ',test:c=>c===0||c===1},{text:'犯人はBかCのどちらかだ',test:c=>c===1||c===2},{text:'犯人はAかCのどちらかだ',test:c=>c===0||c===2}
];
const names=['A','B','C'];

export function solveLogic(statementIds){
  return [0,1,2].filter(culprit=>statementIds.filter(id=>!STATEMENTS[id].test(culprit)).length===1);
}

export function generateLogicPuzzle(rng=Math.random){
  const candidates=[];
  for(let a=0;a<STATEMENTS.length-2;a++)for(let b=a+1;b<STATEMENTS.length-1;b++)for(let c=b+1;c<STATEMENTS.length;c++){
    const ids=[a,b,c],solutions=solveLogic(ids);if(solutions.length===1)candidates.push({statementIds:ids,culprit:solutions[0]});
  }
  const chosen=candidates[Math.floor(rng()*candidates.length)]||candidates[0];
  const liar=chosen.statementIds.findIndex(id=>!STATEMENTS[id].test(chosen.culprit));
  return{...chosen,liar,texts:chosen.statementIds.map(id=>STATEMENTS[id].text)};
}

export const logicGame={
  id:'logic',title:'矛盾探し',emoji:'◇',description:'3人の証言のうち嘘は1つだけ。犯人と嘘をついた人を論理だけで特定する。',tags:['2〜8人','論理','推理'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){if(life.destroyed)return;pass(ctx,{player:0,answers:[],puzzle:generateLogicPuzzle()},life)}
function statementsHtml(ctx,puzzle){return`<div class="result-list">${puzzle.texts.map((text,i)=>`<div class="result-row"><span>証言 ${names[i]}</span><span>${ctx.esc(text)}</span></div>`).join('')}</div>`}
function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">LOGIC CASE</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">他の人の選択を見ずに、自分の答えを決めてください。</div><button class="btn primary" id="readyLogic">問題を見る</button></div><div class="rules">証言A/B/Cのうち嘘はちょうど1つ。犯人もA/B/Cの誰か1人です。</div>`;
  ctx.root.querySelector('#readyLogic').onclick=()=>chooseCulprit(ctx,state,life);
}
function chooseCulprit(ctx,state,life){
  if(life.destroyed)return;ctx.root.innerHTML=`<div class="eyebrow">WHO DID IT?</div><div class="prompt compact">犯人は誰？</div>${statementsHtml(ctx,state.puzzle)}<div class="choice-grid">${names.map((n,i)=>`<button class="choice" data-culprit="${i}">犯人 ${n}</button>`).join('')}</div>`;
  ctx.root.querySelectorAll('[data-culprit]').forEach(b=>b.onclick=()=>chooseLiar(ctx,state,+b.dataset.culprit,life));
}
function chooseLiar(ctx,state,culprit,life){
  if(life.destroyed)return;ctx.root.innerHTML=`<div class="eyebrow">ONE LIAR</div><div class="prompt compact">嘘は誰？</div>${statementsHtml(ctx,state.puzzle)}<div class="sub">犯人予想: ${names[culprit]}</div><div class="choice-grid">${names.map((n,i)=>`<button class="choice" data-liar="${i}">証言 ${n}</button>`).join('')}</div>`;
  ctx.root.querySelectorAll('[data-liar]').forEach(b=>b.onclick=()=>submit(ctx,state,{culprit,liar:+b.dataset.liar},life));
}
function submit(ctx,state,answer,life){
  if(life.destroyed)return;state.answers.push(answer);state.player++;state.player<ctx.session.players.length?pass(ctx,state,life):reveal(ctx,state,life);
}
function reveal(ctx,state,life){
  if(life.destroyed)return;const p=state.puzzle,gains=state.answers.map(a=>(a.culprit===p.culprit?1:0)+(a.liar===p.liar?1:0));
  gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">SOLUTION</div><div class="prompt compact">犯人 ${names[p.culprit]} · 嘘は証言 ${names[p.liar]}</div>${statementsHtml(ctx,p)}<div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>犯人 ${names[state.answers[i].culprit]} / 嘘 ${names[state.answers[i].liar]} · +${gains[i]}</span></div>`).join('')}</div><button class="btn primary full" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
