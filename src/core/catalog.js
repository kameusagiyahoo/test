export const CATEGORY_DEFS=[
  {id:'all',label:'すべて'},
  {id:'quick',label:'軽い'},
  {id:'social',label:'会話'},
  {id:'brain',label:'頭脳'},
  {id:'strategy',label:'戦略'},
  {id:'foresight',label:'先読み'},
  {id:'perfect',label:'完全情報'},
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
  triad:['brain','strategy','foresight','perfect','duel']
};

const RECOMMENDATIONS={
  2:['isolation','code','gate'],
  small:['triad','logic','auction'],
  large:['minority','allocation','frontline']
};

export function categoriesFor(gameId){return GAME_CATEGORIES[gameId]||[]}

export function categoryLabel(id){
  return CATEGORY_DEFS.find(c=>c.id===id)?.label||id;
}

export function filterGames(games,{category='all',query=''}={}){
  const needle=String(query||'').trim().toLowerCase();
  return games.filter(game=>{
    const categoryMatch=category==='all'||categoriesFor(game.id).includes(category);
    if(!categoryMatch)return false;
    if(!needle)return true;
    const haystack=[game.title,game.description,...(game.tags||[]),...categoriesFor(game.id).map(categoryLabel)].join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}

export function recommendedIds(playerCount){
  if(playerCount<=2)return [...RECOMMENDATIONS[2]];
  if(playerCount<=4)return [...RECOMMENDATIONS.small];
  return [...RECOMMENDATIONS.large];
}

export function recommendedGames(games,playerCount){
  const byId=new Map(games.map(g=>[g.id,g]));
  return recommendedIds(playerCount).map(id=>byId.get(id)).filter(Boolean);
}
