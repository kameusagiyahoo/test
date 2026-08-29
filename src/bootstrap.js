import {registerGame} from './core/registry.js';
import {gridGame} from './games/grid.js';
import {allocationGame} from './games/allocation.js';
import {portfolioGame} from './games/portfolio.js';
import {sequenceGame} from './games/sequence.js';
import {frontlineGame} from './games/frontline.js';
import {priorityGame} from './games/priority.js';
import {isolationGame} from './games/isolation.js';
import {gateGame} from './games/gate.js';
import {triadGame} from './games/triad.js';
import {memoryGame} from './games/memory.js';
import {routeGame} from './games/route.js';
import {patternGame} from './games/pattern.js';

[gridGame,allocationGame,portfolioGame,sequenceGame,frontlineGame,priorityGame,isolationGame,gateGame,triadGame,memoryGame,routeGame,patternGame].forEach(registerGame);

try{
  const settingsKey='partyPocketPartySettingsV1';
  const migrationKey='partyPocketExtraGamesMigrationV4';
  if(!localStorage.getItem(migrationKey)){
    const raw=localStorage.getItem(settingsKey);
    if(raw){
      const value=JSON.parse(raw);
      if(Array.isArray(value?.gameIds)){
        const extras=['memory','route','pattern'];
        const ids=[...new Set([...value.gameIds,...extras])];
        localStorage.setItem(settingsKey,JSON.stringify({...value,gameIds:ids}));
      }
    }
    localStorage.setItem(migrationKey,'1');
  }
}catch{}

await import('./app.js');
