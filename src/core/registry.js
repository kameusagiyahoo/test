const games=new Map();

export function registerGame(game){
  if(!game?.id||typeof game.mount!=='function')throw new Error('Invalid game module');
  games.set(game.id,game);
}

export function getGame(id){return games.get(id)}
export function listGames(){return [...games.values()]}
