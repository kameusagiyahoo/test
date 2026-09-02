import {registerGame} from '../core/registry.js';
import {syncGame} from './sync.js';
import {bombGame} from './bomb.js';
import {fiveGame} from './five.js';
import {minorityGame} from './minority.js';
import {sniperGame} from './sniper.js';
import {tabooGame} from './taboo.js';
import {clockGame} from './clock.js';
import {tenGame} from './ten.js';
import {codeGame} from './code.js';
import {logicGame} from './logic.js';
import {evGame} from './ev.js';
import {auctionGame} from './auction.js';
import {gridGame} from './grid.js';
import {allocationGame} from './allocation.js';
import {portfolioGame} from './portfolio.js';
import {sequenceGame} from './sequence.js';
import {frontlineGame} from './frontline.js';
import {priorityGame} from './priority.js';
import {isolationGame} from './isolation.js';
import {gateGame} from './gate.js';
import {triadGame} from './triad.js';
import {memoryGame} from './memory.js';
import {routeGame} from './route.js';
import {patternGame} from './pattern.js';

export const ALL_GAMES=Object.freeze([
  syncGame,
  bombGame,
  fiveGame,
  minorityGame,
  sniperGame,
  tabooGame,
  clockGame,
  tenGame,
  codeGame,
  logicGame,
  evGame,
  auctionGame,
  gridGame,
  allocationGame,
  portfolioGame,
  sequenceGame,
  frontlineGame,
  priorityGame,
  isolationGame,
  gateGame,
  triadGame,
  memoryGame,
  routeGame,
  patternGame
]);

export function registerAllGames(){
  ALL_GAMES.forEach(registerGame);
  return ALL_GAMES;
}
