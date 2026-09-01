const WIDTH=1080,HEIGHT=1350;
const PAPER='#f3f1ec',INK='#252826',MUTED='#696d68',SAGE='#8b9a8d',LINE='#d7d7d0';

function xml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'
  }[ch]));
}
function short(value,max=28){
  const text=String(value??'');
  return text.length>max?text.slice(0,Math.max(1,max-1))+'…':text;
}
function safeNumber(value){return Number.isFinite(Number(value))?Number(value):0}
function rankScores(scores=[]){
  return scores.map((score,index)=>({score:safeNumber(score),index}))
    .sort((a,b)=>b.score-a.score||a.index-b.index)
    .map((row,i,rows)=>({...row,rank:i===0?1:(row.score===rows[i-1].score?rows[i-1].rank:i+1)}));
}
function font(size,weight=500){
  return `font-family="-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic',Arial,sans-serif";font-size:${size}px;font-weight:${weight}`;
}
function text(x,y,value,size=36,weight=500,fill=INK,anchor='start'){
  return `<text x="${x}" y="${y}" fill="${fill}" text-anchor="${anchor}" style="${font(size,weight)}">${xml(value)}</text>`;
}
function header(kicker,title,subtitle){
  return [
    text(84,102,kicker,22,760,MUTED),
    text(84,174,title,54,780,INK),
    text(84,222,subtitle,25,500,MUTED),
    `<line x1="84" y1="262" x2="996" y2="262" stroke="${LINE}" stroke-width="2"/>`
  ].join('');
}
function shell(body,footer='Party Pocket · Local Party Games'){
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}"/>
  <rect x="44" y="44" width="992" height="1262" rx="42" fill="${PAPER}" stroke="${INK}" stroke-width="3"/>
  ${body}
  ${text(84,1270,footer,20,650,MUTED)}
  </svg>`;
}

export function partyShareModel(entry,{gameNames={}}={}){
  const players=Array.isArray(entry?.players)?entry.players.map(String):[];
  const scores=Array.isArray(entry?.finalScores)?entry.finalScores.map(safeNumber):[];
  const ranking=rankScores(scores).map(row=>({
    rank:row.rank,
    name:players[row.index]||('Player '+(row.index+1)),
    score:row.score
  }));
  const winners=(Array.isArray(entry?.winners)?entry.winners:[]).map(i=>players[i]).filter(Boolean);
  const roundWins=Array(players.length).fill(0);
  for(const round of entry?.rounds||[])for(const i of round?.winners||[])if(Number.isInteger(i)&&i>=0&&i<roundWins.length)roundWins[i]++;
  const maxWins=Math.max(0,...roundWins),mvp=maxWins?roundWins.map((v,i)=>v===maxWins?players[i]:null).filter(Boolean):[];
  const rounds=(entry?.rounds||[]).slice(0,9).map((round,index)=>({
    index:index+1,
    game:gameNames[round.gameId]||round.gameId,
    winners:(round.winners||[]).map(i=>players[i]).filter(Boolean)
  }));
  return{
    type:'party',
    title:winners.length?(winners.join(' & ')+' WIN'):'PARTY RESULT',
    subtitle:`${players.length} players · ${entry?.schedule?.length||rounds.length} rounds`,
    ranking,
    mvp,
    rounds
  };
}

export function profileShareModel(profile,{gameNames={},achievements=[]}={}){
  const best=(profile?.gameStats||[]).slice(0,3).map(row=>({
    name:gameNames[row.gameId]||row.gameId,
    wins:safeNumber(row.wins),
    plays:safeNumber(row.plays)
  }));
  return{
    type:'profile',
    title:String(profile?.name||'PLAYER'),
    subtitle:`${safeNumber(profile?.plays)} games · ${safeNumber(profile?.wins)} wins · ${Math.round(safeNumber(profile?.winRate)*100)}%`,
    kpis:[
      ['WINS',safeNumber(profile?.wins)],
      ['PARTY WINS',safeNumber(profile?.partyWins)],
      ['MVP',safeNumber(profile?.mvpCount)],
      ['TITLES',safeNumber(profile?.gamesPlayed)]
    ],
    best,
    achievements:(achievements||[]).slice(0,6).map(row=>({symbol:String(row.symbol||''),title:String(row.title||'')}))
  };
}

export function renderPartyShareSvg(model){
  const ranking=model.ranking||[],rounds=model.rounds||[];
  let body=header('PARTY RECAP',short(model.title,30),model.subtitle||'');
  body+=text(84,322,'FINAL STANDINGS',21,760,MUTED);
  ranking.slice(0,8).forEach((row,i)=>{
    const y=382+i*62;
    body+=text(90,y,`${row.rank}. ${short(row.name,18)}`,30,row.rank===1?780:620,INK);
    body+=text(970,y,`${row.score} pt`,30,760,INK,'end');
    if(i<Math.min(ranking.length,8)-1)body+=`<line x1="90" y1="${y+21}" x2="970" y2="${y+21}" stroke="${LINE}" stroke-width="1"/>`;
  });
  const offset=382+Math.min(ranking.length,8)*62+38;
  body+=text(84,offset,'MVP',21,760,MUTED);
  body+=text(84,offset+50,model.mvp?.length?short(model.mvp.join(' & '),34):'—',36,760,INK);
  const roundY=offset+116;
  body+=text(84,roundY,'ROUNDS',21,760,MUTED);
  rounds.slice(0,6).forEach((round,i)=>{
    const y=roundY+52+i*68;
    body+=text(90,y,String(round.index).padStart(2,'0'),22,760,SAGE);
    body+=text(150,y,short(round.game,23),27,680,INK);
    body+=text(970,y,round.winners?.length?short(round.winners.join(' & '),16):'—',23,600,MUTED,'end');
  });
  return shell(body);
}

export function renderProfileShareSvg(model){
  let body=header('PLAYER PROFILE',short(model.title,28),model.subtitle||'');
  body+=text(84,322,'CAREER',21,760,MUTED);
  (model.kpis||[]).slice(0,4).forEach((row,i)=>{
    const x=84+i*228;
    body+=`<rect x="${x}" y="350" width="204" height="132" rx="18" fill="#ffffff" stroke="${LINE}"/>`;
    body+=text(x+18,390,row[0],16,760,MUTED);
    body+=text(x+18,452,String(row[1]),44,780,INK);
  });
  body+=text(84,548,'BEST GAMES',21,760,MUTED);
  (model.best||[]).slice(0,3).forEach((row,i)=>{
    const y=610+i*74;
    body+=text(90,y,`${i+1}. ${short(row.name,22)}`,29,680,INK);
    body+=text(970,y,`${row.wins}W / ${row.plays}G`,24,650,MUTED,'end');
    body+=`<line x1="90" y1="${y+22}" x2="970" y2="${y+22}" stroke="${LINE}" stroke-width="1"/>`;
  });
  body+=text(84,858,'ACHIEVEMENTS',21,760,MUTED);
  const achievements=(model.achievements||[]).slice(0,6);
  achievements.forEach((row,i)=>{
    const col=i%2,rowIndex=Math.floor(i/2),x=84+col*456,y=910+rowIndex*84;
    body+=`<circle cx="${x+26}" cy="${y-9}" r="25" fill="${INK}"/>`;
    body+=text(x+26,y-2,short(row.symbol,3),14,800,PAPER,'middle');
    body+=text(x+66,y,short(row.title,22),22,680,INK);
  });
  if(!achievements.length)body+=text(84,924,'No badges yet',25,600,MUTED);
  return shell(body);
}

export function shareCardFilename(kind,label,date=new Date()){
  const stamp=`${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const clean=String(label||kind).replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,32)||kind;
  return `party-pocket-${kind}-${clean}-${stamp}.png`;
}

export async function svgToPngBlob(svg,{width=WIDTH,height=HEIGHT}={}){
  if(typeof document==='undefined'||typeof Image==='undefined')throw new Error('image export unavailable');
  const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
  try{
    const image=new Image();
    image.decoding='async';
    image.src=url;
    await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('canvas unavailable');
    ctx.drawImage(image,0,0,width,height);
    return await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG export failed')),'image/png',0.96));
  }finally{
    URL.revokeObjectURL(url);
  }
}

export async function shareSvgCard(svg,{filename='party-pocket.png',title='Party Pocket'}={}){
  const blob=await svgToPngBlob(svg),file=new File([blob],filename,{type:'image/png'});
  try{
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      await navigator.share({files:[file],title});
      return'shared';
    }
  }catch(error){
    if(error?.name==='AbortError')return'cancelled';
  }
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  try{
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  }finally{
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return'downloaded';
}
