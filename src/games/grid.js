const VALUES_3=[1,2,1,2,4,2,1,2,1];
const VALUES_4=[1,2,2,1,2,3,4,2,2,4,3,2,1,2,2,1];

export function makeGrid(playerCount){
  const size=playerCount<=3?3:4;
  return{size,values:[...(size===3?VALUES_3:VALUES_4)],owners:Array(size*size).fill(-1),placementsPerPlayer:playerCount<=3?3:2};
}

export function territoryScores(board,size,playerCount){
  const scores=Array(playerCount).fill(0);
  board.forEach((cell,i)=>{if(cell.owner>=0)scores[cell.owner]+=cell.value});
  const dirs=[[1,0],[0,1]];
  for(let r=0;r<size;r++)for(let c=0;c<size;c++){
    const i=r*size+c,owner=board[i].owner;if(owner<0)continue;
    for(const [dr,dc] of dirs){const nr=r+dr,nc=c+dc;if(nr<size&&nc<size&&board[nr*size+nc].owner===owner)scores[owner]+=2}
  }
  return scores;
}

export function rankGains(values){
  const distinct=[...new Set(values)].sort((a,b)=>b-a);
  return values.map(v=>distinct.indexOf(v)===0?2:distinct.indexOf(v)===1?1:0);
}

export const gridGame={
  id:'grid',title:'グリッド・ドミニオン',emoji:'▦',description:'価値の違うマスを取り、隣接ボーナスまで読んで盤面を支配する。',tags:['2〜8人','盤面','先読み'],
  mount(ctx){const life={destroyed:false};start(ctx,life);return()=>{life.destroyed=true}}
};

function turnOrder(playerCount,placements){
  const order=[];
  for(let round=0;round<placements;round++){
    const row=Array.from({length:playerCount},(_,i)=>i);
    if(round%2)row.reverse();order.push(...row);
  }
  return order;
}

function start(ctx,life){
  if(life.destroyed)return;const base=makeGrid(ctx.session.players.length);
  const board=base.values.map(value=>({value,owner:-1}));
  play(ctx,{...base,board,order:turnOrder(ctx.session.players.length,base.placementsPerPlayer),turn:0},life);
}

function cellLabel(ctx,cell){
  if(cell.owner<0)return`<span>${cell.value}</span>`;
  const name=ctx.session.players[cell.owner];return`<b>${ctx.esc(name.slice(0,2))}</b><small>${cell.value}</small>`;
}

function play(ctx,state,life){
  if(life.destroyed)return;if(state.turn>=state.order.length)return finish(ctx,state,life);
  const player=state.order[state.turn];ctx.renderScorebar(player);
  const cols=`repeat(${state.size},1fr)`;
  ctx.root.innerHTML=`<div class="eyebrow">GRID DOMINION · ${state.turn+1}/${state.order.length}</div><div class="prompt compact">${ctx.esc(ctx.session.players[player])} の手番</div><div class="sub">数字はマスの基本点。同じ自分のマスが上下左右で隣接すると、その辺ごとに +2。</div><div class="tactical-grid" style="grid-template-columns:${cols}">${state.board.map((cell,i)=>`<button class="tactical-cell owner-${cell.owner}" data-cell="${i}" ${cell.owner>=0?'disabled':''}>${cellLabel(ctx,cell)}</button>`).join('')}</div><div class="rules">手番順はラウンドごとに反転します。高得点マスを取るか、連結を作るか、相手の連結を切るかを選びます。</div>`;
  ctx.root.querySelectorAll('[data-cell]').forEach(button=>button.onclick=()=>{
    const i=+button.dataset.cell;if(state.board[i].owner>=0)return;state.board[i].owner=player;state.turn++;play(ctx,state,life);
  });
}

function finish(ctx,state,life){
  if(life.destroyed)return;const raw=territoryScores(state.board,state.size,ctx.session.players.length),gains=rankGains(raw);
  gains.forEach((g,i)=>{if(g)ctx.session.addScore(i,g)});ctx.renderScorebar();
  ctx.root.innerHTML=`<div class="eyebrow">FINAL TERRITORY</div><div class="prompt compact">盤面得点</div><div class="result-list">${ctx.session.players.map((n,i)=>`<div class="result-row"><span>${ctx.esc(n)}</span><span>${raw[i]} → +${gains[i]}点</span></div>`).join('')}</div><button class="btn primary full" id="gridNext">次へ</button>`;
  ctx.root.querySelector('#gridNext').onclick=()=>ctx.completeRound(()=>start(ctx,life));
}
