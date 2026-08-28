function orthogonal(index,size){
  const r=Math.floor(index/size),c=index%size,result=[];
  if(r>0)result.push(index-size);
  if(r<size-1)result.push(index+size);
  if(c>0)result.push(index-1);
  if(c<size-1)result.push(index+1);
  return result;
}

export function gateSize(playerCount){return playerCount<=4?5:playerCount<=6?6:7}

export function gateSetup(playerCount,size=gateSize(playerCount)){
  const positions=[],goals=[];
  for(let i=0;i<playerCount;i++){
    const side=i%4,group=Math.floor(i/4);
    const lane=playerCount<=4?Math.floor(size/2):(group===0?Math.floor(size/3):Math.floor(size*2/3));
    if(side===0){positions.push(lane);goals.push('bottom')}
    if(side===1){positions.push((size-1)*size+lane);goals.push('top')}
    if(side===2){positions.push(lane*size);goals.push('right')}
    if(side===3){positions.push(lane*size+size-1);goals.push('left')}
  }
  return{positions,goals};
}

export function onGoal(index,goal,size){
  const r=Math.floor(index/size),c=index%size;
  return goal==='top'?r===0:goal==='bottom'?r===size-1:goal==='left'?c===0:c===size-1;
}

export function goalDistance(index,goal,size){
  const r=Math.floor(index/size),c=index%size;
  return goal==='top'?r:goal==='bottom'?size-1-r:goal==='left'?c:size-1-c;
}

export function pathExists(start,goal,blocked,size){
  const queue=[start],seen=new Set([start]);
  while(queue.length){
    const cur=queue.shift();if(onGoal(cur,goal,size))return true;
    for(const next of orthogonal(cur,size))if(!blocked.has(next)&&!seen.has(next)){seen.add(next);queue.push(next)}
  }
  return false;
}

export function legalBarrierCells(state){
  const occupied=new Set(state.positions.filter(v=>v>=0)),result=[];
  for(let cell=0;cell<state.size*state.size;cell++){
    if(occupied.has(cell)||state.blocked.has(cell))continue;
    const test=new Set(state.blocked);test.add(cell);
    if(state.goals.every((goal,i)=>state.finished[i]||pathExists(state.positions[i],goal,test,state.size)))result.push(cell);
  }
  return result;
}

function rankGains(scores){
  const distinct=[...new Set(scores)].sort((a,b)=>b-a);
  return scores.map(v=>distinct.indexOf(v)===0?2:distinct.indexOf(v)===1?1:0);
}

export const gateGame={
  id:'gate',title:'ゲートライン',emoji:'⇥',
  description:'対岸を目指して1マス進むか、壁を置く。全員の経路を残しつつ、自分だけ近道を確保する。',
  tags:['2〜8人','完全情報','経路'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){
  if(life.destroyed)return;
  const n=ctx.session.players.length,size=gateSize(n),setup=gateSetup(n,size);
  play(ctx,{size,...setup,blocked:new Set(),barriers:Array(n).fill(2),finished:Array(n).fill(false),current:0,turns:0,maxTurns:n*12,mode:'move'},life);
}

function nextPlayer(state,from){
  for(let s=1;s<=state.finished.length;s++){const i=(from+s)%state.finished.length;if(!state.finished[i])return i}
  return -1;
}

function legalMoves(state,p){
  const occupied=new Set(state.positions.filter((v,i)=>i!==p&&v>=0));
  return orthogonal(state.positions[p],state.size).filter(i=>!state.blocked.has(i)&&!occupied.has(i));
}

function labelGoal(goal){return({top:'上端',bottom:'下端',left:'左端',right:'右端'})[goal]}

function render(ctx,state,life){
  if(life.destroyed)return;
  if(state.turns>=state.maxTurns)return timeout(ctx,state,life);
  const p=state.current;if(p<0)return timeout(ctx,state,life);
  const moves=legalMoves(state,p),barriers=state.barriers[p]>0?legalBarrierCells(state):[];
  ctx.renderScorebar(p);
  const selectable=state.mode==='move'?new Set(moves):new Set(barriers);
  ctx.root.innerHTML=`<div class="eyebrow">GATE LINE · ${state.turns+1}/${state.maxTurns}</div><div class="prompt compact">${ctx.esc(ctx.session.players[p])} → ${labelGoal(state.goals[p])}</div><div class="gate-actions"><button class="choice ${state.mode==='move'?'selected':''}" id="modeMove">移動</button><button class="choice ${state.mode==='wall'?'selected':''}" id="modeWall" ${state.barriers[p]<=0?'disabled':''}>壁 ${state.barriers[p]}枚</button></div><div class="tactical-grid" style="grid-template-columns:repeat(${state.size},1fr)">${Array.from({length:state.size*state.size},(_,i)=>{
    const owner=state.positions.indexOf(i),blocked=state.blocked.has(i),legal=selectable.has(i);
    if(owner>=0)return `<button class="tactical-cell owner-${owner}" disabled><b>${ctx.esc(ctx.session.players[owner].slice(0,2))}</b><small>${labelGoal(state.goals[owner])}</small></button>`;
    if(blocked)return '<button class="tactical-cell blocked-cell" disabled>×</button>';
    return `<button class="tactical-cell ${legal?'legal-cell':''}" data-gate="${i}" ${legal?'':'disabled'}>${legal?(state.mode==='move'?'○':'＋'):''}</button>`;
  }).join('')}</div><div class="rules">移動は上下左右へ1マス。壁は全プレイヤーに少なくとも1本の到達経路が残る場所だけ置けます。</div>`;
  ctx.root.querySelector('#modeMove').onclick=()=>{state.mode='move';render(ctx,state,life)};
  ctx.root.querySelector('#modeWall').onclick=()=>{if(state.barriers[p]>0){state.mode='wall';render(ctx,state,life)}};
  ctx.root.querySelectorAll('[data-gate]').forEach(b=>b.onclick=()=>{
    const cell=+b.dataset.gate;
    if(state.mode==='move'){
      if(!moves.includes(cell))return;
      state.positions[p]=cell;
      if(onGoal(cell,state.goals[p],state.size)){
        state.finished[p]=true;state.positions[p]=-1;return finishWinner(ctx,state,life,p);
      }
    }else{
      if(!barriers.includes(cell))return;
      state.blocked.add(cell);state.barriers[p]--;
    }
    state.turns++;state.mode='move';state.current=nextPlayer(state,p);render(ctx,state,life);
  });
}

function finishWinner(ctx,state,life,winner){
  const raw=Array(ctx.session.players.length).fill(0);raw[winner]=2;
  raw.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">GATE REACHED</div><div class="prompt compact">${ctx.esc(ctx.session.players[winner])} が対岸へ到達</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>${i===winner?'+2点':'0点'}</span></div>`).join('')}</div><button class="btn primary full" id="gateNext">次へ</button>`;
  ctx.root.querySelector('#gateNext').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}

function timeout(ctx,state,life){
  if(life.destroyed)return;
  const progress=state.positions.map((pos,i)=>state.finished[i]?state.size:(state.size-goalDistance(pos,state.goals[i],state.size)));
  const gains=rankGains(progress);gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">POSITIONAL RESULT</div><div class="prompt compact">手数上限 · 対岸への進行度で判定</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>進行 ${progress[i]} → +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="gateTimeout">次へ</button>`;
  ctx.root.querySelector('#gateTimeout').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
