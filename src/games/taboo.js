const cards=[
 ['りんご',['赤い','果物','Apple']],['電車',['駅','線路','乗る']],['花火',['夏','夜','爆発']],['カレー',['辛い','ご飯','ルー']],['スマホ',['電話','画面','アプリ']],['猫',['にゃー','動物','ペット']],['ラーメン',['麺','スープ','中華']],['学校',['先生','勉強','教室']],['雪',['白い','冬','冷たい']],['海',['水','夏','泳ぐ']],['時計',['時間','針','何時']],['テレビ',['見る','番組','画面']],['飛行機',['空','旅行','空港']],['寿司',['魚','米','回転']],['温泉',['お風呂','旅行','熱い']],['コンビニ',['24時間','おにぎり','レジ']],['サッカー',['ボール','ゴール','スポーツ']],['映画',['見る','映画館','スクリーン']],['アイス',['冷たい','甘い','夏']],['自転車',['タイヤ','こぐ','乗る']],['雨',['傘','天気','濡れる']],['犬',['ワンワン','動物','散歩']],['東京',['日本','首都','都会']],['ゲーム',['遊ぶ','勝つ','コントローラー']]
];
const pick=a=>a[Math.floor(Math.random()*a.length)];

export const tabooGame={
  id:'taboo',title:'NGワード説明',emoji:'🚫',description:'お題を3つの禁止ワードを使わず説明。全員1回ずつ挑戦する。',tags:['2〜8人','会話'],
  mount(ctx){const life={destroyed:false,hold:null};start(ctx,life);return()=>{life.destroyed=true;clearTimeout(life.hold)}}
};

function start(ctx,life){if(life.destroyed)return;turn(ctx,{player:0,results:[]},life)}
function turn(ctx,state,life){
  if(life.destroyed)return;ctx.renderScorebar(state.player);const name=ctx.session.players[state.player],card=pick(cards);state.card=card;
  ctx.root.innerHTML=`<div class="pass-card"><div class="eyebrow">PASS THE PHONE</div><div class="prompt">${ctx.esc(name)}さんが説明役</div><div class="sub">他の人は画面を見ないでください。</div><button class="btn primary" id="reveal">長押ししてお題を見る</button></div><div class="rules">お題そのものとNGワードを言わずに説明。誰かが当てたら成功。</div>`;
  const button=ctx.root.querySelector('#reveal');button.onpointerdown=()=>life.hold=setTimeout(()=>show(ctx,state,life),350);button.onpointerup=button.onpointerleave=()=>clearTimeout(life.hold);
}
function show(ctx,state,life){
  if(life.destroyed)return;const [word,ng]=state.card;
  ctx.root.innerHTML=`<div class="eyebrow">TABOO</div><div class="prompt">${ctx.esc(word)}</div><div class="sub">この3語は禁止</div><div class="choice-grid">${ng.map(x=>`<div class="choice" style="pointer-events:none">🚫 ${ctx.esc(x)}</div>`).join('')}</div><div class="rules">内容を覚えたら「説明開始」。次の画面ではお題とNGワードを隠します。</div><button class="btn primary" style="width:100%;margin-top:18px" id="startExplain">覚えた・説明開始</button>`;
  ctx.root.querySelector('#startExplain').onclick=()=>judge(ctx,state,life);
}
function judge(ctx,state,life){
  if(life.destroyed)return;const name=ctx.session.players[state.player];
  ctx.root.innerHTML=`<div class="eyebrow">EXPLAIN</div><div class="prompt">${ctx.esc(name)}さん、説明中！</div><div class="big-number">🙊</div><div class="sub" style="text-align:center">お題とNGワードは非表示です。</div><div class="choice-grid"><button class="btn green" id="ok">成功 +1</button><button class="btn pink" id="ng">失敗</button></div>`;
  ctx.root.querySelector('#ok').onclick=()=>finishTurn(ctx,state,true,life);ctx.root.querySelector('#ng').onclick=()=>finishTurn(ctx,state,false,life);
}
function finishTurn(ctx,state,success,life){
  if(life.destroyed)return;if(success)ctx.session.addScore(state.player,1);state.results.push(success);state.player++;
  if(state.player<ctx.session.players.length)return turn(ctx,state,life);
  ctx.renderScorebar();ctx.root.innerHTML=`<div class="eyebrow">ROUND RESULT</div><div class="prompt">説明チャレンジ終了</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>${state.results[i]?'成功 ＋1':'失敗 ±0'}</span></div>`).join('')}</div><button class="btn primary" style="width:100%;margin-top:18px" id="next">次へ</button>`;
  ctx.root.querySelector('#next').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
