const pools={
 easy:['赤いものを3つ','動物を3つ','飲み物を3つ','スポーツを3つ','果物を3つ','家にある電化製品を3つ','コンビニで買えるものを3つ','旅行に持っていくものを3つ','朝にすることを3つ','冷たい食べ物を3つ','駅にあるものを3つ','丸いものを3つ','青いものを3つ','学校にあるものを3つ','乗り物を3つ','野菜を3つ','海にあるものを3つ','冬に使うものを3つ'],
 normal:['「か」から始まる言葉を3つ','5文字以上の食べ物を3つ','スマホでできることを3つ','雨の日にしたいことを3つ','1000円以内で買えるものを3つ','黄色い食べ物を3つ','旅行先でやることを3つ','子どもが好きそうなものを3つ','冷蔵庫にありそうなものを3つ','寝る前にすることを3つ','映画のジャンルを3つ','プレゼント候補を3つ','東京にあるものを3つ','音が大きいものを3つ','柔らかいものを3つ','四角いものを3つ','夏に使うものを3つ','仕事で使うものを3つ'],
 hard:['「ん」で終わる言葉を3つ','ひらがな4文字の食べ物を3つ','同じ色のものを4つ','3文字の動物を3つ','カタカナの食べ物を4つ','「た」から始まる5文字以上の言葉を3つ','海外の都市を4つ','家にある白いものを4つ','音が出るものを4つ','コンビニにないものを4つ','丸くない食べ物を4つ','水に浮くものを4つ']
};
function pick(a){return a[Math.floor(Math.random()*a.length)]}

export const fiveGame={
 id:'five',title:'5秒チャレンジ+',emoji:'⚡️',description:'全員が1回ずつ挑戦。難易度で制限時間とお題が変わる。',tags:['2〜8人','瞬発力'],
 mount(ctx){const life={destroyed:false,timer:null};chooseDifficulty(ctx,life);return()=>{life.destroyed=true;clearInterval(life.timer)}}
};

function chooseDifficulty(ctx,life){
  if(life.destroyed)return;if(ctx.session.mode==='party')return startSet(ctx,Math.random()<.35?'hard':'normal',life);
  ctx.renderScorebar();ctx.root.innerHTML=`<div class="eyebrow">DIFFICULTY</div><div class="prompt">難易度を選ぶ</div><div class="stack"><button class="btn green" data-d="easy">EASY · 7秒</button><button class="btn yellow" data-d="normal">NORMAL · 5秒</button><button class="btn pink" data-d="hard">HARD · 4秒</button></div><div class="rules">1セットで全員が1回ずつ挑戦します。先に5点で勝利。</div>`;
  ctx.root.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>startSet(ctx,b.dataset.d,life));
}
function startSet(ctx,difficulty,life){if(life.destroyed)return;const state={difficulty,turn:0,used:new Set()};nextChallenge(ctx,state,life)}
function nextChallenge(ctx,state,life){
  if(life.destroyed)return;clearInterval(life.timer);const available=pools[state.difficulty].filter(x=>!state.used.has(x));if(!available.length)state.used.clear();
  state.prompt=pick(pools[state.difficulty].filter(x=>!state.used.has(x)));state.used.add(state.prompt);state.seconds=state.difficulty==='easy'?7:state.difficulty==='hard'?4:5;renderReady(ctx,state,life);
}
function renderReady(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.turn);const label=state.difficulty.toUpperCase();
  ctx.root.innerHTML=`<div class="eyebrow">${label} · ${state.seconds} SECONDS</div><div class="turn-name">${ctx.esc(ctx.session.players[state.turn])} の挑戦</div><div class="prompt">${state.prompt}</div><div class="sub">声に出して答える。準備ができたらスタート。</div><button class="btn primary" style="width:100%;margin-top:18px" id="startTimer">${state.seconds}秒スタート</button>`;
  ctx.root.querySelector('#startTimer').onclick=()=>runTimer(ctx,state,life);
}
function runTimer(ctx,state,life){
  if(life.destroyed)return;const started=performance.now(),duration=state.seconds;ctx.root.innerHTML=`<div class="eyebrow">GO!</div><div class="prompt">${state.prompt}</div><div class="timer" id="timer">${duration.toFixed(1)}</div><div class="sub" style="text-align:center">答えて！</div>`;
  life.timer=setInterval(()=>{if(life.destroyed)return clearInterval(life.timer);const left=Math.max(0,duration-(performance.now()-started)/1000),el=ctx.root.querySelector('#timer');if(el)el.textContent=left.toFixed(1);if(left<=0){clearInterval(life.timer);judge(ctx,state,life)}},50);
}
function judge(ctx,state,life){
  if(life.destroyed)return;navigator.vibrate?.([80,50,80]);ctx.root.innerHTML=`<div class="eyebrow">TIME UP</div><div class="prompt">できた？</div><div class="sub">全員で判定。厳密さより勢いを優先。</div><div class="choice-grid"><button class="btn green" id="ok">成功 ＋1</button><button class="btn pink" id="ng">失敗</button></div>`;
  ctx.root.querySelector('#ok').onclick=()=>finishTurn(ctx,state,true,life);ctx.root.querySelector('#ng').onclick=()=>finishTurn(ctx,state,false,life);
}
function finishTurn(ctx,state,ok,life){
  if(life.destroyed)return;if(ok)ctx.session.addScore(state.turn,1);state.turn++;if(state.turn<ctx.session.players.length)nextChallenge(ctx,state,life);else ctx.completeRound(()=>startSet(ctx,state.difficulty,life));
}
