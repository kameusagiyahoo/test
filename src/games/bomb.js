function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min}

export const bombGame={
  id:'bomb',title:'21ボム+',emoji:'💣',description:'爆発数字と進める幅が毎回変わる。各自1回だけPASSできる。',tags:['2〜8人','駆け引き'],
  mount(ctx){startBattle(ctx,0)}
};

function startBattle(ctx,startTurn){
  const target=rand(18,30),maxStep=rand(2,4);
  const state={n:0,turn:startTurn%ctx.session.players.length,target,maxStep,passes:Array(ctx.session.players.length).fill(true),over:false};
  render(ctx,state);
}

function render(ctx,state){
  ctx.renderScorebar(state.turn);
  const name=ctx.session.players[state.turn],near=state.n>=state.target-5;
  ctx.root.innerHTML=`<div class="eyebrow">RANDOM BOMB</div><div class="turn-name">${ctx.esc(name)} の番</div><div class="big-number ${near?'danger':''}">${state.n}</div><div class="sub" style="text-align:center">爆発は <b>${state.target}</b> 以上。今回は1〜${state.maxStep}進められます。</div><div class="choice-grid">${Array.from({length:state.maxStep},(_,i)=>`<button class="choice" data-plus="${i+1}">＋${i+1}</button>`).join('')}${state.passes[state.turn]?'<button class="choice" id="passTurn">PASS<br><small>1回だけ</small></button>':''}</div><div class="rules">爆発数字と進める幅は毎戦変化。さらに各プレイヤーは1戦に1度だけPASSできるため、固定の必勝パターンは使えません。</div>`;
  ctx.root.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>move(ctx,state,+b.dataset.plus));
  const pass=ctx.root.querySelector('#passTurn');if(pass)pass.onclick=()=>{state.passes[state.turn]=false;state.turn=(state.turn+1)%ctx.session.players.length;render(ctx,state)};
}

function move(ctx,state,v){
  if(state.over)return;
  state.n+=v;
  if(state.n>=state.target){
    state.over=true;
    ctx.session.players.forEach((_,i)=>{if(i!==state.turn)ctx.session.addScore(i,1)});
    ctx.renderScorebar();
    ctx.root.innerHTML=`<div class="eyebrow">BOOM!</div><div class="prompt">💥 ${ctx.esc(ctx.session.players[state.turn])} 爆発！</div><div class="sub">ほかのプレイヤー全員に +1点。爆発数字は ${state.target} でした。</div><button class="btn primary" style="width:100%;margin-top:18px" id="again">次へ</button>`;
    const next=(state.turn+1)%ctx.session.players.length;
    ctx.root.querySelector('#again').onclick=()=>ctx.completeRound(()=>startBattle(ctx,next));
  }else{
    state.turn=(state.turn+1)%ctx.session.players.length;render(ctx,state);
  }
}
