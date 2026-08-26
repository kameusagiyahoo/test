const names=['A','B','C','D'];
const STATEMENTS=[
  ...names.map((n,x)=>({text:`犯人は${n}だ`,kind:'culprit',test:(c,l)=>c===x})),
  ...names.map((n,x)=>({text:`嘘つきは${n}だ`,kind:'liar',test:(c,l)=>l===x})),
  {text:'犯人と嘘つきは同じ人物だ',kind:'relation',test:(c,l)=>c===l},
  {text:'犯人と嘘つきは別の人物だ',kind:'relation',test:(c,l)=>c!==l},
  {text:'犯人はAかBだ',kind:'culprit',test:(c,l)=>c===0||c===1},
  {text:'犯人はCかDだ',kind:'culprit',test:(c,l)=>c===2||c===3},
  {text:'嘘つきはAかBだ',kind:'liar',test:(c,l)=>l===0||l===1},
  {text:'嘘つきはCかDだ',kind:'liar',test:(c,l)=>l===2||l===3}
];

export function solveLogic(statementIds){
  const solutions=[];
  for(let culprit=0;culprit<4;culprit++)for(let liar=0;liar<4;liar++){
    const valid=statementIds.every((id,speaker)=>STATEMENTS[id].test(culprit,liar)===(speaker!==liar));
    if(valid)solutions.push({culprit,liar});
  }
  return solutions;
}

let PUZZLES=null;
function puzzlePool(){
  if(PUZZLES)return PUZZLES;const result=[],n=STATEMENTS.length;
  for(let a=0;a<n;a++)for(let b=0;b<n;b++)for(let c=0;c<n;c++)for(let d=0;d<n;d++){
    const ids=[a,b,c,d];if(new Set(ids).size<4)continue;
    const kinds=ids.map(id=>STATEMENTS[id].kind);
    if(!kinds.some(k=>k==='culprit'||k==='relation')||!kinds.some(k=>k==='liar'||k==='relation'))continue;
    const solutions=solveLogic(ids);if(solutions.length===1)result.push({statementIds:ids,...solutions[0]});
  }
  PUZZLES=result;return result;
}

export function generateLogicPuzzle(rng=Math.random){
  const candidates=puzzlePool(),chosen=candidates[Math.floor(rng()*candidates.length)]||candidates[0];
  return{...chosen,texts:chosen.statementIds.map(id=>STATEMENTS[id].text)};
}

export const logicGame={
  id:'logic',title:'矛盾探し',emoji:'◇',description:'4人の証言から、犯人と唯一の嘘つきを同時に特定する論理パズル。',tags:['2〜8人','論理','推理'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){if(life.destroyed)return;pass(ctx,{player:0,answers:[],puzzle:generateLogicPuzzle()},life)}
function statementsHtml(ctx,puzzle){return`<div class="result-list">${puzzle.texts.map((text,i)=>`<div class="result-row"><span>証言 ${names[i]}</span><span>${ctx.esc(text)}</span></div>`).join('')}</div>`}
function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">LOGIC CASE</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">他の人の選択を見ずに、自分の答えを決めてください。</div><button class="btn primary" id="readyLogic">問題を見る</button></div><div class="rules">A〜Dのうち犯人は1人、嘘つきも1人。嘘つき本人の証言だけが偽で、他3人の証言は真です。</div>`;
  ctx.root.querySelector('#readyLogic').onclick=()=>chooseCulprit(ctx,state,life);
}
function chooseCulprit(ctx,state,life){
  if(life.destroyed)return;ctx.root.innerHTML=`<div class="eyebrow">WHO DID IT?</div><div class="prompt compact">犯人は誰？</div>${statementsHtml(ctx,state.puzzle)}<div class="choice-grid">${names.map((n,i)=>`<button class="choice" data-culprit="${i}">犯人 ${n}</button>`).join('')}</div>`;
  ctx.root.querySelectorAll('[data-culprit]').forEach(b=>b.onclick=()=>chooseLiar(ctx,state,+b.dataset.culprit,life));
}
function chooseLiar(ctx,state,culprit,life){
  if(life.destroyed)return;ctx.root.innerHTML=`<div class="eyebrow">ONE LIAR</div><div class="prompt compact">嘘つきは誰？</div>${statementsHtml(ctx,state.puzzle)}<div class="sub">犯人予想: ${names[culprit]}</div><div class="choice-grid">${names.map((n,i)=>`<button class="choice" data-liar="${i}">証言 ${n}</button>`).join('')}</div>`;
  ctx.root.querySelectorAll('[data-liar]').forEach(b=>b.onclick=()=>submit(ctx,state,{culprit,liar:+b.dataset.liar},life));
}
function submit(ctx,state,answer,life){
  if(life.destroyed)return;state.answers.push(answer);state.player++;state.player<ctx.session.players.length?pass(ctx,state,life):reveal(ctx,state,life);
}
function reveal(ctx,state,life){
  if(life.destroyed)return;const p=state.puzzle,gains=state.answers.map(a=>(a.culprit===p.culprit?1:0)+(a.liar===p.liar?1:0));
  gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">SOLUTION</div><div class="prompt compact">犯人 ${names[p.culprit]} · 嘘つき ${names[p.liar]}</div>${statementsHtml(ctx,p)}<div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>犯人 ${names[state.answers[i].culprit]} / 嘘 ${names[state.answers[i].liar]} · +${gains[i]}</span></div>`).join('')}</div><button class="btn primary full" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
