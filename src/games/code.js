export function evaluateCode(secret,guess){
  const a=String(secret),b=String(guess);let exact=0;const sc={},gc={};
  for(let i=0;i<Math.min(a.length,b.length);i++){
    if(a[i]===b[i])exact++;
    else{sc[a[i]]=(sc[a[i]]||0)+1;gc[b[i]]=(gc[b[i]]||0)+1}
  }
  let misplaced=0;for(const [digit,count] of Object.entries(gc))misplaced+=Math.min(count,sc[digit]||0);
  return{exact,misplaced};
}

export function makeSecret(rng=Math.random){
  const digits=Array.from({length:10},(_,i)=>String(i));
  for(let i=digits.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[digits[i],digits[j]]=[digits[j],digits[i]]}
  return digits.slice(0,3).join('');
}

export const codeGame={
  id:'code',title:'コードブレイカー',emoji:'⌗',description:'3桁の秘密コードを、位置一致・数字一致のヒントだけで最大5手で特定する。',tags:['2〜8人','推理','論理'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){if(life.destroyed)return;pass(ctx,{player:0,results:[]},life)}
function pass(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">PRIVATE PUZZLE</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">ここからは自分だけで画面を見てください。</div><button class="btn primary" id="ready">コードを推理する</button></div><div class="rules">3桁はすべて異なる数字。ヒントは「位置も数字も一致」と「数字だけ一致」の2種類です。</div>`;
  ctx.root.querySelector('#ready').onclick=()=>play(ctx,state,{secret:makeSecret(),history:[],attempt:0},life);
}
function play(ctx,state,turn,life,message=''){
  if(life.destroyed)return;
  const history=turn.history.length?`<div class="result-list">${turn.history.map(h=>`<div class="result-row"><span>${h.guess}</span><span>位置 ${h.exact} · 数字 ${h.misplaced}</span></div>`).join('')}</div>`:'<div class="sub">まだヒントはありません。</div>';
  ctx.root.innerHTML=`<div class="eyebrow">CODE BREAKER · ${turn.attempt+1}/5</div><div class="prompt compact">3桁を入力</div>${message?`<div class="notice">${ctx.esc(message)}</div>`:''}<input id="codeGuess" inputmode="numeric" autocomplete="off" maxlength="3" placeholder="例 527" aria-label="3桁の予想"><button class="btn primary full" id="judgeCode">判定する</button><div class="rules">同じ数字は1回だけ使えます。</div>${history}`;
  const input=ctx.root.querySelector('#codeGuess');input.oninput=()=>input.value=input.value.replace(/\D/g,'').slice(0,3);input.focus();
  ctx.root.querySelector('#judgeCode').onclick=()=>{
    const guess=input.value;if(!/^\d{3}$/.test(guess)||new Set(guess).size!==3)return play(ctx,state,turn,life,'異なる数字を3つ入力してください。');
    const hint=evaluateCode(turn.secret,guess);turn.attempt++;turn.history.push({guess,...hint});
    if(hint.exact===3)return finishPlayer(ctx,state,turn,true,life);
    if(turn.attempt>=5)return finishPlayer(ctx,state,turn,false,life);
    play(ctx,state,turn,life);
  };
}
function finishPlayer(ctx,state,turn,solved,life){
  if(life.destroyed)return;const points=solved?(turn.attempt<=3?2:1):0;if(points)ctx.session.addScore(state.player,points);
  state.results.push({solved,attempts:turn.attempt,secret:turn.secret,points});
  ctx.root.innerHTML=`<div class="eyebrow">${solved?'SOLVED':'CODE REVEAL'}</div><div class="prompt">${turn.secret}</div><div class="sub">${solved?`${turn.attempt}手で正解 · +${points}点`:'5手以内に特定できませんでした'}</div><button class="btn primary full" id="nextPlayer">${state.player+1<ctx.session.players.length?'次の人へ':'結果を見る'}</button>`;
  ctx.root.querySelector('#nextPlayer').onclick=()=>{state.player++;state.player<ctx.session.players.length?pass(ctx,state,life):reveal(ctx,state,life)};
}
function reveal(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">ROUND RESULT</div><div class="prompt compact">推理完了</div><div class="result-list">${ctx.session.players.map((n,i)=>{const r=state.results[i];return`<div class="result-row"><span>${ctx.esc(n)}</span><span>${r.solved?`${r.attempts}手 · +${r.points}`:`未解決 · ${r.secret}`}</span></div>`}).join('')}</div><button class="btn primary full" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
