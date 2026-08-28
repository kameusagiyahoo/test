function orthogonal(index,size){
  const r=Math.floor(index/size),c=index%size,result=[];
  if(r>0)result.push(index-size);
  if(r<size-1)result.push(index+size);
  if(c>0)result.push(index-1);
  if(c<size-1)result.push(index+1);
  return result;
}

export function isolationSize(playerCount){return playerCount<=3?4:playerCount<=5?5:6}

export function perimeterCells(size){
  const cells=[];
  for(let c=0;c<size;c++)cells.push(c);
  for(let r=1;r<size;r++)cells.push(r*size+size-1);
  for(let c=size-2;c>=0;c--)cells.push((size-1)*size+c);
  for(let r=size-2;r>0;r--)cells.push(r*size);
  return cells;
}

export function isolationStarts(playerCount,size=isolationSize(playerCount)){
  const ring=perimeterCells(size);
  return Array.from({length:playerCount},(_,i)=>ring[Math.floor(i*ring.length/playerCount)]);
}

export function legalIsolationMoves(position,positions,blocked,size){
  const occupied=new Set(positions.filter(v=>v>=0));
  return orthogonal(position,size).filter(i=>!occupied.has(i)&&!blocked.has(i));
}

function rankGains(scores){
  const positive=[...new Set(scores.filter(v=>v>0))].sort((a,b)=>b-a);
  return scores.map(v=>v>0?(positive.indexOf(v)===0?2:positive.indexOf(v)===1?1:0):0);
}

export const isolationGame={
  id:'isolation',title:'アイソレーション',emoji:'⌗',
  description:'1マス動くたびに元のマスが永久封鎖。自分の逃げ道を残しながら、相手の合法手を削る。',
  tags:['2〜8人','完全情報','封鎖'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){
  if(life.destroyed)return;
  const n=ctx.session.players.length,size=isolationSize(n);
  const positions=isolationStarts(n,size);
  const state={size,positions,blocked:new Set(),active:Array(n).fill(true),eliminated:[],current:0,turns:0};
  ensurePlayable(ctx,state,life);
}

function nextActive(state,from){
  for(let step=1;step<=state.active.length;step++){
    const i=(from+step)%state.active.length;
    if(state.active[i])return i;
  }
  return -1;
}

function ensurePlayable(ctx,state,life){
  if(life.destroyed)return;
  while(state.active.filter(Boolean).length>1){
    const moves=legalIsolationMoves(state.positions[state.current],state.positions,state.blocked,state.size);
    if(moves.length)return render(ctx,state,life,moves);
    state.active[state.current]=false;
    state.eliminated.push(state.current);
    state.positions[state.current]=-1;
    const next=nextActive(state,state.current);
    if(next<0)break;
    state.current=next;
  }
  finish(ctx,state,life);
}

function cellHtml(ctx,state,i,moves){
  const owner=state.positions.indexOf(i),isBlocked=state.blocked.has(i),legal=moves.includes(i);
  if(owner>=0)return `<button class="tactical-cell owner-${owner}" disabled><b>${ctx.esc(ctx.session.players[owner].slice(0,2))}</b><small>駒</small></button>`;
  if(isBlocked)return '<button class="tactical-cell blocked-cell" disabled>×</button>';
  return `<button class="tactical-cell ${legal?'legal-cell':''}" data-iso="${i}" ${legal?'':'disabled'}>${legal?'○':''}</button>`;
}

function render(ctx,state,life,moves){
  if(life.destroyed)return;
  const p=state.current;ctx.renderScorebar(p);
  ctx.root.innerHTML=`<div class="eyebrow">ISOLATION · TURN ${state.turns+1}</div><div class="prompt compact">${ctx.esc(ctx.session.players[p])} の手番</div><div class="sub">上下左右へ1マス移動。移動前のマスは永久に封鎖されます。</div><div class="tactical-grid" style="grid-template-columns:repeat(${state.size},1fr)">${Array.from({length:state.size*state.size},(_,i)=>cellHtml(ctx,state,i,moves)).join('')}</div><div class="rules">○が現在の合法手。動けなくなったプレイヤーから脱落し、最後まで動けた人が勝ちです。</div>`;
  ctx.root.querySelectorAll('[data-iso]').forEach(b=>b.onclick=()=>{
    const dest=+b.dataset.iso,origin=state.positions[p];
    if(!moves.includes(dest))return;
    state.blocked.add(origin);state.positions[p]=dest;state.turns++;
    state.current=nextActive(state,p);ensurePlayable(ctx,state,life);
  });
}

function finish(ctx,state,life){
  if(life.destroyed)return;
  const n=ctx.session.players.length,raw=Array(n).fill(0);
  const winner=state.active.findIndex(Boolean);
  if(winner>=0)raw[winner]=2;
  const runner=state.eliminated.at(-1);
  if(runner!=null&&runner!==winner)raw[runner]=1;
  const gains=rankGains(raw);
  gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});
  ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">ISOLATION RESULT</div><div class="prompt compact">${winner>=0?ctx.esc(ctx.session.players[winner])+' が最後まで生存':'終了'}</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>${raw[i]} → +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="isoNext">次へ</button>`;
  ctx.root.querySelector('#isoNext').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
