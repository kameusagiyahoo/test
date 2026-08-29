export function makeMemorySequence(rng=Math.random,length=6){
  return Array.from({length},()=>Math.floor(rng()*9)+1);
}

export function memoryScore(sequence,answer){
  const normalized=String(answer||'').replace(/\D/g,'').split('').map(Number);
  let correct=0;
  for(let i=0;i<sequence.length;i++)if(normalized[i]===sequence[i])correct++;
  if(normalized.length===sequence.length&&correct===sequence.length)return 2;
  if(correct>=sequence.length-1&&normalized.length===sequence.length)return 1;
  return 0;
}

export const memoryGame={
  id:'memory',title:'メモリー・フラッシュ',emoji:'◉',
  description:'数秒だけ表示される数字列を覚えて再入力する。1人なら記憶力チャレンジ、複数人なら正確さ勝負。',
  tags:['1〜8人','記憶','短時間'],
  mount(ctx){
    const life={destroyed:false,timer:null};
    start(ctx,life);
    return()=>{life.destroyed=true;if(life.timer)clearTimeout(life.timer)};
  }
};

function start(ctx,life){
  if(life.destroyed)return;
  const n=ctx.session.players.length;
  nextPlayer(ctx,{player:0,scores:Array(n).fill(0)},life);
}

function nextPlayer(ctx,state,life){
  if(life.destroyed)return;
  if(state.player>=ctx.session.players.length)return finish(ctx,state,life);
  const p=state.player,name=ctx.session.players[p],length=6+(Math.random()<.35?1:0);
  const sequence=makeMemorySequence(Math.random,length);
  ctx.renderScorebar(p);
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">MEMORY FLASH</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">準備できたら数字列を表示します。表示は約2.5秒です。</div><button class="btn primary" id="memoryReady">表示する</button></div><div class="rules">数字は左から順番に覚えます。表示後は数字だけを入力してください。</div>`;
  ctx.root.querySelector('#memoryReady').onclick=()=>{
    ctx.root.innerHTML=`<div class="eyebrow">MEMORIZE</div><div class="memory-sequence">${sequence.join(' ')}</div><div class="sub">覚えてください</div>`;
    life.timer=setTimeout(()=>answer(ctx,state,life,sequence),2500);
  };
}

function answer(ctx,state,life,sequence){
  if(life.destroyed)return;
  life.timer=null;
  ctx.root.innerHTML=`<div class="eyebrow">RECALL</div><div class="prompt compact">数字列を入力</div><input id="memoryAnswer" class="memory-input" inputmode="numeric" pattern="[0-9]*" maxlength="${sequence.length}" autocomplete="off" placeholder="${'•'.repeat(sequence.length)}"><button class="btn primary full" id="memorySubmit">回答する</button><div class="rules">${sequence.length}桁。1桁違いまで部分点があります。</div>`;
  const input=ctx.root.querySelector('#memoryAnswer');input.focus();
  ctx.root.querySelector('#memorySubmit').onclick=()=>{
    const score=memoryScore(sequence,input.value);state.scores[state.player]=score;
    ctx.root.innerHTML=`<div class="eyebrow">RESULT</div><div class="prompt compact">${score===2?'完全一致':score===1?'あと1桁':'不一致'}</div><div class="result-list"><div class="result-row"><span>正解</span><span>${sequence.join('')}</span></div><div class="result-row"><span>回答</span><span>${ctx.esc(input.value||'—')}</span></div><div class="result-row"><span>得点</span><span>+${score}</span></div></div><button class="btn primary full" id="memoryNext">${state.player+1<ctx.session.players.length?'次の人へ':'ラウンド結果'}</button>`;
    ctx.root.querySelector('#memoryNext').onclick=()=>{state.player++;nextPlayer(ctx,state,life)};
  };
}

function finish(ctx,state,life){
  if(life.destroyed)return;
  state.scores.forEach((s,i)=>{if(s)ctx.session.addScore(i,s)});
  ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">MEMORY RESULT</div><div class="prompt compact">記憶チャレンジ終了</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>+${state.scores[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="memoryFinish">次へ</button>`;
  ctx.root.querySelector('#memoryFinish').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
