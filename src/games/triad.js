function orthogonal(index,size){
  const r=Math.floor(index/size),c=index%size,result=[];
  if(r>0)result.push(index-size);
  if(r<size-1)result.push(index+size);
  if(c>0)result.push(index-1);
  if(c<size-1)result.push(index+1);
  return result;
}

export function triadSize(playerCount){return playerCount<=2?4:playerCount<=4?5:playerCount<=6?6:7}

export function lineWindows(size){
  const lines=[];
  for(let r=0;r<size;r++)for(let c=0;c<=size-3;c++)lines.push([r*size+c,r*size+c+1,r*size+c+2]);
  for(let c=0;c<size;c++)for(let r=0;r<=size-3;r++)lines.push([r*size+c,(r+1)*size+c,(r+2)*size+c]);
  for(let r=0;r<=size-3;r++)for(let c=0;c<=size-3;c++)lines.push([r*size+c,(r+1)*size+c+1,(r+2)*size+c+2]);
  for(let r=0;r<=size-3;r++)for(let c=2;c<size;c++)lines.push([r*size+c,(r+1)*size+c-1,(r+2)*size+c-2]);
  return lines;
}

export function hasTriad(board,size,player){
  return lineWindows(size).some(line=>line.every(i=>board[i]===player));
}

export function triadPotential(board,size,player){
  let best=0;
  for(const line of lineWindows(size)){
    if(line.some(i=>board[i]>=0&&board[i]!==player))continue;
    const own=line.filter(i=>board[i]===player).length;
    best=Math.max(best,own*2);
  }
  return best;
}

export function legalTriadShifts(board,size,player){
  const result=[];
  board.forEach((owner,from)=>{
    if(owner!==player)return;
    for(const to of orthogonal(from,size))if(board[to]<0)result.push({from,to});
  });
  return result;
}

function snakeOrder(playerCount,rounds){
  const order=[];
  for(let r=0;r<rounds;r++){
    const row=Array.from({length:playerCount},(_,i)=>i);
    if(r%2)row.reverse();order.push(...row);
  }
  return order;
}

function rankGains(scores){
  const distinct=[...new Set(scores)].sort((a,b)=>b-a);
  return scores.map(v=>distinct.indexOf(v)===0?2:distinct.indexOf(v)===1?1:0);
}

export const triadGame={
  id:'triad',title:'トライアド・シフト',emoji:'△',
  description:'3駒を配置した後、1マスずつ動かして縦・横・斜めの3連を作る。相手の完成手も同時に潰す。',
  tags:['2〜8人','完全情報','盤面評価'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function start(ctx,life){
  if(life.destroyed)return;
  const n=ctx.session.players.length,size=triadSize(n);
  const board=Array(size*size).fill(-1),placementOrder=snakeOrder(n,3);
  place(ctx,{size,board,placementOrder,turn:0,shiftOrder:snakeOrder(n,4),shiftTurn:0,selected:-1},life);
}

function boardHtml(ctx,state,clickAttr,legalSet=new Set(),selected=-1){
  return `<div class="tactical-grid" style="grid-template-columns:repeat(${state.size},1fr)">${state.board.map((owner,i)=>{
    const legal=legalSet.has(i),sel=i===selected;
    if(owner>=0)return `<button class="tactical-cell owner-${owner} ${sel?'selected-piece':''}" ${clickAttr?'data-piece="'+i+'"':''}><b>${ctx.esc(ctx.session.players[owner].slice(0,2))}</b><small>駒</small></button>`;
    return `<button class="tactical-cell ${legal?'legal-cell':''}" ${legal?clickAttr+'="'+i+'"':'disabled'}>${legal?'○':''}</button>`;
  }).join('')}</div>`;
}

function place(ctx,state,life){
  if(life.destroyed)return;
  if(state.turn>=state.placementOrder.length)return shift(ctx,state,life);
  const p=state.placementOrder[state.turn],empty=new Set(state.board.map((v,i)=>v<0?i:-1).filter(i=>i>=0));
  ctx.renderScorebar(p);
  ctx.root.innerHTML=`<div class="eyebrow">TRIAD · PLACE ${state.turn+1}/${state.placementOrder.length}</div><div class="prompt compact">${ctx.esc(ctx.session.players[p])} の配置</div><div class="sub">各自3駒。完成形だけでなく、後で動かしやすい形を作ります。</div>${boardHtml(ctx,state,'data-place',empty)}<div class="rules">縦・横・斜めに自分の3駒が連続すると即勝利。配置順はラウンドごとに反転します。</div>`;
  ctx.root.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.place;if(state.board[i]>=0)return;state.board[i]=p;
    if(hasTriad(state.board,state.size,p))return win(ctx,state,life,p);
    state.turn++;place(ctx,state,life);
  });
}

function shift(ctx,state,life){
  if(life.destroyed)return;
  while(state.shiftTurn<state.shiftOrder.length){
    const p=state.shiftOrder[state.shiftTurn],moves=legalTriadShifts(state.board,state.size,p);
    if(!moves.length){state.shiftTurn++;continue}
    return renderShift(ctx,state,life,p,moves);
  }
  positional(ctx,state,life);
}

function renderShift(ctx,state,life,p,moves){
  const selected=state.selected,fromMoves=selected>=0?moves.filter(m=>m.from===selected):[];
  const legalTargets=new Set(fromMoves.map(m=>m.to));ctx.renderScorebar(p);
  ctx.root.innerHTML=`<div class="eyebrow">TRIAD · SHIFT ${state.shiftTurn+1}/${state.shiftOrder.length}</div><div class="prompt compact">${ctx.esc(ctx.session.players[p])} の移動</div><div class="sub">${selected>=0?'○へ1マス移動':'自分の駒を1つ選択'}</div>${boardHtml(ctx,state,'data-target',legalTargets,selected)}<div class="rules">移動は上下左右へ1マス。自分の3連を作るだけでなく、相手の次の完成マスを塞ぐことも重要です。</div>`;
  ctx.root.querySelectorAll('[data-piece]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.piece;if(state.board[i]!==p)return;state.selected=i;renderShift(ctx,state,life,p,moves);
  });
  ctx.root.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>{
    const to=+b.dataset.target;if(!fromMoves.some(m=>m.to===to))return;
    state.board[to]=p;state.board[selected]=-1;state.selected=-1;
    if(hasTriad(state.board,state.size,p))return win(ctx,state,life,p);
    state.shiftTurn++;shift(ctx,state,life);
  });
}

function win(ctx,state,life,winner){
  const raw=Array(ctx.session.players.length).fill(0);raw[winner]=2;raw.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">TRIAD COMPLETE</div><div class="prompt compact">${ctx.esc(ctx.session.players[winner])} が3連完成</div>${boardHtml(ctx,state,'',new Set())}<button class="btn primary full" id="triadWin">次へ</button>`;
  ctx.root.querySelector('#triadWin').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}

function positional(ctx,state,life){
  const raw=ctx.session.players.map((_,i)=>triadPotential(state.board,state.size,i)),gains=rankGains(raw);
  gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">POSITIONAL RESULT</div><div class="prompt compact">移動上限 · 3連への近さで判定</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>形勢 ${raw[i]} → +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="triadNext">次へ</button>`;
  ctx.root.querySelector('#triadNext').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
