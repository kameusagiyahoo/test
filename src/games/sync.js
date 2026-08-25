import {normalizeAnswer} from '../core/session.js';

const choiceRounds=[
 ['休日の朝にしたいこと',['二度寝','散歩','カフェ','ゲーム']],['無人島に1つ持っていくなら',['ナイフ','スマホ','水','友達']],['テンションが上がる食べ物',['焼肉','寿司','ラーメン','ケーキ']],['旅行で一番大事なのは',['景色','食事','ホテル','一緒に行く人']],['動物になるなら',['猫','犬','鳥','イルカ']],['急に100万円もらったら',['旅行','貯金','買い物','投資']],['最強の夜食',['ラーメン','おにぎり','アイス','ポテチ']],['超能力を1つ選ぶなら',['瞬間移動','透明化','時間停止','心を読む']],['夏といえば',['海','花火','祭り','かき氷']],['冬といえば',['雪','鍋','こたつ','クリスマス']],['一番落ち着く場所',['家','カフェ','公園','お風呂']],['突然3連休なら',['旅行','寝る','遊ぶ','片付け']],['プレゼントでもらって嬉しい',['食べ物','現金','旅行','ガジェット']],['映画館で食べるなら',['ポップコーン','チュロス','アイス','何も食べない']],['朝ごはんといえば',['パン','ご飯','卵','食べない']],['つい見てしまう動画',['動物','料理','ゲーム','旅行']]
];
const freePrompts=['赤い食べ物といえば？','日本の観光地といえば？','コンビニのおにぎりの具といえば？','人気の動物といえば？','丸いものといえば？','夏の食べ物といえば？','学校にあるものといえば？','冷蔵庫に入っているものといえば？','子どもが好きな食べ物といえば？','雨の日に使うものといえば？','お祭りといえば？','東京といえば？','朝に飲むものといえば？','黄色いものといえば？','速いものといえば？','高い買い物といえば？'];

function pick(a){return a[Math.floor(Math.random()*a.length)]}

export const syncGame={
  id:'sync',title:'シンクロ',emoji:'🎯',description:'同じ答えを出せるか。4択と自由回答が混ざる読み合いゲーム。',tags:['2〜8人','読み合い'],
  mount(ctx){startRound(ctx)}
};

function startRound(ctx){
  const free=Math.random()<0.45;
  const round=free?{type:'free',q:pick(freePrompts)}:(()=>{const [q,a]=pick(choiceRounds);return{type:'choice',q,a}})();
  const state={round,player:0,answers:[]};
  pass(ctx,state);
}

function pass(ctx,state){
  ctx.renderScorebar(state.player);
  const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">PASS THE PHONE</div><div class="prompt">${ctx.esc(name)}さんへ</div><div class="sub">他の人は画面を見ないでください。</div><button class="btn primary" id="reveal">長押しして回答</button></div><div class="rules">全員が回答し終わるまで、前の人の答えは表示されません。</div>`;
  const button=ctx.root.querySelector('#reveal');
  let timer;
  const open=()=>showQuestion(ctx,state);
  button.onpointerdown=()=>{timer=setTimeout(open,450)};
  button.onpointerup=button.onpointerleave=()=>clearTimeout(timer);
}

function showQuestion(ctx,state){
  const r=state.round;
  if(r.type==='choice'){
    ctx.root.innerHTML=`<div class="eyebrow">SECRET CHOICE</div><div class="prompt">${r.q}</div><div class="sub">「自分の答え」ではなく、みんなと被りそうな答えを狙う。</div><div class="choice-grid">${r.a.map((a,i)=>`<button class="choice" data-answer="${i}">${a}</button>`).join('')}</div>`;
    ctx.root.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>submit(ctx,state,{key:`c${b.dataset.answer}`,label:r.a[+b.dataset.answer]}));
  }else{
    ctx.root.innerHTML=`<div class="eyebrow">FREE SYNC</div><div class="prompt">${r.q}</div><div class="sub">他の人と同じ言葉を狙って自由入力。</div><div class="stack" style="margin-top:18px"><input id="freeAnswer" maxlength="24" autocomplete="off" placeholder="答えを入力"><button class="btn primary" id="submitAnswer">決定</button></div>`;
    const input=ctx.root.querySelector('#freeAnswer');
    input.focus();
    ctx.root.querySelector('#submitAnswer').onclick=()=>{const label=input.value.trim();if(!label)return ctx.toast('答えを入力してください');submit(ctx,state,{key:normalizeAnswer(label),label})};
  }
}

function submit(ctx,state,answer){
  state.answers.push(answer);state.player++;
  if(state.player<ctx.session.players.length)pass(ctx,state);else reveal(ctx,state);
}

function reveal(ctx,state){
  const counts={};state.answers.forEach(a=>counts[a.key]=(counts[a.key]||0)+1);
  state.answers.forEach((a,i)=>{if(counts[a.key]>=2)ctx.session.addScore(i,counts[a.key]-1)});
  ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">REVEAL</div><div class="prompt">答え合わせ！</div><div class="result-list">${ctx.session.players.map((n,i)=>{const a=state.answers[i],c=counts[a.key];return`<div class="result-row"><span>${ctx.esc(n)}</span><span>${ctx.esc(a.label)} ${c>=2?`＋${c-1}`:'±0'}</span></div>`}).join('')}</div><button class="btn primary" style="width:100%;margin-top:18px" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>startRound(ctx));
}
