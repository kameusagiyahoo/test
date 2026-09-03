function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min}

export function bombSensor(current,target){
  const remaining=target-current;
  if(remaining<=0)return{id:'boom',label:'BOOM',detail:'爆発'};
  if(remaining===1)return{id:'critical',label:'CRITICAL',detail:'爆発まであと1'};
  if(remaining<=3)return{id:'hot',label:'HOT',detail:'爆発まであと2〜3'};
  if(remaining<=6)return{id:'warm',label:'WARM',detail:'爆発まであと4〜6'};
  return{id:'cold',label:'COLD',detail:'爆発まで7以上'};
}

export function isBombMove(current,step,target){
  return current+step>=target;
}

export const bombGame={
  id:'bomb',title:'21ボム+',emoji:'💣',description:'爆発地点は非公開。距離センサーと1回だけのPASSを使って危険な手番を押し付ける。',tags:['2〜8人','駆け引き'],
  mount(ctx){const life={destroyed:false};startBattle(ctx,0,life);return()=>{life.destroyed=true}}
};

function startBattle(ctx,startTurn,life){
  if(life.destroyed)return;
  const target=rand(18,30),maxStep=rand(2,4);
  const state={n:0,turn:startTurn%ctx.session.players.length,target,maxStep,passes:Array(ctx.session.players.length).fill(true),over:false};
  render(ctx,state,life);
}

function render(ctx,state,life){
  if(life.destroyed)return;
  ctx.renderScorebar(state.turn);
  const name=ctx.session.players[state.turn],sensor=bombSensor(state.n,state.target),danger=sensor.id==='hot'||sensor.id==='critical';
  ctx.root.innerHTML=`<div class="eyebrow">HIDDEN BOMB · ${sensor.label}</div><div class="turn-name">${ctx.esc(name)} の番</div><div class="big-number ${danger?'danger':''}">${state.n}</div><div class="sub" style="text-align:center"><b>${sensor.detail}</b><br>爆発地点は18〜30のどこか。今回は1〜${state.maxStep}進められます。</div><div class="choice-grid">${Array.from({length:state.maxStep},(_,i)=>`<button class="choice" data-plus="${i+1}">＋${i+1}</button>`).join('')}${state.passes[state.turn]?'<button class="choice" id="passTurn">PASS<br><small>1回だけ</small></button>':''}</div><div class="rules">爆発地点そのものは非公開。センサーは現在地から爆発までの距離だけを COLD / WARM / HOT / CRITICAL で知らせます。</div>`;
  ctx.root.querySelectorAll('[data-plus]').forEach(button=>button.onclick=()=>move(ctx,state,+button.dataset.plus,life));
  const pass=ctx.root.querySelector('#passTurn');
  if(pass)pass.onclick=()=>{
    state.passes[state.turn]=false;
    state.turn=(state.turn+1)%ctx.session.players.length;
    render(ctx,state,life);
  };
}

function move(ctx,state,value,life){
  if(life.destroyed||state.over)return;
  if(isBombMove(state.n,value,state.target)){
    state.n+=value;
    state.over=true;
    ctx.session.players.forEach((_,index)=>{if(index!==state.turn)ctx.session.addScore(index,1)});
    ctx.renderScorebar();
    ctx.root.innerHTML=`<div class="eyebrow">BOOM!</div><div class="prompt">💥 ${ctx.esc(ctx.session.players[state.turn])} 爆発！</div><div class="sub">${state.n}まで進めたため爆発。秘密の爆発地点は <b>${state.target}</b> でした。ほかのプレイヤー全員に +1点。</div><button class="btn primary" style="width:100%;margin-top:18px" id="again">次へ</button>`;
    const next=(state.turn+1)%ctx.session.players.length;
    ctx.root.querySelector('#again').onclick=()=>ctx.completeRound(()=>startBattle(ctx,next,life));
    return;
  }
  state.n+=value;
  state.turn=(state.turn+1)%ctx.session.players.length;
  render(ctx,state,life);
}
