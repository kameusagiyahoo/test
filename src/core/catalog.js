export const CATEGORY_DEFS=[
  {id:'all',label:'すべて'},
  {id:'quick',label:'軽い'},
  {id:'social',label:'会話'},
  {id:'brain',label:'頭脳'},
  {id:'strategy',label:'戦略'},
  {id:'foresight',label:'先読み'},
  {id:'perfect',label:'完全情報'},
  {id:'solo',label:'1人向け'},
  {id:'duel',label:'2人向け'}
];

const GAME_CATEGORIES={
  sync:['quick','social'],
  bomb:['quick','strategy','duel'],
  five:['quick','social'],
  minority:['social'],
  sniper:['brain','strategy'],
  taboo:['quick','social'],
  clock:['quick'],
  ten:['quick','strategy','duel'],
  code:['brain','duel'],
  logic:['brain'],
  ev:['brain','strategy'],
  auction:['strategy','foresight'],
  grid:['strategy','foresight','perfect'],
  allocation:['strategy','social'],
  portfolio:['brain','strategy'],
  sequence:['strategy','foresight','duel'],
  frontline:['strategy','foresight'],
  priority:['strategy','foresight'],
  isolation:['strategy','foresight','perfect','duel'],
  gate:['strategy','foresight','perfect','duel'],
  triad:['brain','strategy','foresight','perfect','duel'],
  memory:['quick','brain','solo'],
  route:['brain','strategy','solo'],
  pattern:['quick','brain','solo']
};

const GAME_META={
  sync:{difficulty:1,minutes:4,minPlayers:3,maxPlayers:8},
  bomb:{difficulty:1,minutes:4,minPlayers:2,maxPlayers:6},
  five:{difficulty:1,minutes:3,minPlayers:3,maxPlayers:8},
  minority:{difficulty:1,minutes:5,minPlayers:4,maxPlayers:8},
  sniper:{difficulty:2,minutes:5,minPlayers:3,maxPlayers:8},
  taboo:{difficulty:1,minutes:5,minPlayers:3,maxPlayers:8},
  clock:{difficulty:1,minutes:3,minPlayers:2,maxPlayers:8},
  ten:{difficulty:1,minutes:5,minPlayers:2,maxPlayers:6},
  code:{difficulty:2,minutes:7,minPlayers:2,maxPlayers:4},
  logic:{difficulty:2,minutes:6,minPlayers:2,maxPlayers:6},
  ev:{difficulty:3,minutes:7,minPlayers:2,maxPlayers:6},
  auction:{difficulty:3,minutes:8,minPlayers:3,maxPlayers:6},
  grid:{difficulty:2,minutes:8,minPlayers:2,maxPlayers:5},
  allocation:{difficulty:2,minutes:6,minPlayers:4,maxPlayers:8},
  portfolio:{difficulty:3,minutes:7,minPlayers:2,maxPlayers:6},
  sequence:{difficulty:2,minutes:6,minPlayers:2,maxPlayers:5},
  frontline:{difficulty:3,minutes:8,minPlayers:3,maxPlayers:6},
  priority:{difficulty:3,minutes:8,minPlayers:3,maxPlayers:6},
  isolation:{difficulty:3,minutes:10,minPlayers:2,maxPlayers:4},
  gate:{difficulty:3,minutes:10,minPlayers:2,maxPlayers:4},
  triad:{difficulty:3,minutes:10,minPlayers:2,maxPlayers:4},
  memory:{difficulty:1,minutes:3,minPlayers:1,maxPlayers:8},
  route:{difficulty:2,minutes:5,minPlayers:1,maxPlayers:8},
  pattern:{difficulty:2,minutes:4,minPlayers:1,maxPlayers:8}
};

const RECOMMENDATIONS={
  1:['memory','route','pattern'],
  2:['isolation','code','gate'],
  small:['triad','logic','auction'],
  large:['minority','allocation','frontline']
};

export function categoriesFor(gameId){return GAME_CATEGORIES[gameId]||[]}

export function categoryLabel(id){
  return CATEGORY_DEFS.find(c=>c.id===id)?.label||id;
}

export function gameMeta(gameId){
  return GAME_META[gameId]||{difficulty:1,minutes:5,minPlayers:2,maxPlayers:8};
}

export function difficultyLabel(level){
  return level===1?'かるめ':level===2?'標準':'しっかり';
}

export function playerRangeLabel(meta){
  return meta.minPlayers===meta.maxPlayers?`${meta.minPlayers}人`:`${meta.minPlayers}〜${meta.maxPlayers}人`;
}

export function fitsRecommendedPlayers(gameId,playerCount){
  const meta=gameMeta(gameId);
  return playerCount>=meta.minPlayers&&playerCount<=meta.maxPlayers;
}

export function filterGames(games,{category='all',query='',difficulty='all',maxMinutes='all',playerCount=null,recommendedOnly=false}={}){
  const needle=String(query||'').trim().toLowerCase();
  const difficultyValue=difficulty==='all'?null:Number(difficulty);
  const minutesValue=maxMinutes==='all'?null:Number(maxMinutes);
  return games.filter(game=>{
    const meta=gameMeta(game.id);
    if(category!=='all'&&!categoriesFor(game.id).includes(category))return false;
    if(difficultyValue!=null&&meta.difficulty!==difficultyValue)return false;
    if(minutesValue!=null&&meta.minutes>minutesValue)return false;
    if(recommendedOnly&&playerCount!=null&&!fitsRecommendedPlayers(game.id,playerCount))return false;
    if(!needle)return true;
    const haystack=[
      game.title,game.description,...(game.tags||[]),
      ...categoriesFor(game.id).map(categoryLabel),
      difficultyLabel(meta.difficulty),`${meta.minutes}分`,playerRangeLabel(meta)
    ].join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}

export function pickGame(games,filters={},rng=Math.random){
  const candidates=filterGames(games,filters);
  if(!candidates.length)return null;
  const index=Math.min(candidates.length-1,Math.floor(rng()*candidates.length));
  return candidates[index];
}

export function recommendedIds(playerCount){
  if(playerCount<=1)return [...RECOMMENDATIONS[1]];
  if(playerCount<=2)return [...RECOMMENDATIONS[2]];
  if(playerCount<=4)return [...RECOMMENDATIONS.small];
  return [...RECOMMENDATIONS.large];
}

export function recommendedGames(games,playerCount){
  const byId=new Map(games.map(g=>[g.id,g]));
  return recommendedIds(playerCount).map(id=>byId.get(id)).filter(Boolean);
}
