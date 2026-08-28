import {registerGame} from './core/registry.js';
import {gridGame} from './games/grid.js';
import {allocationGame} from './games/allocation.js';
import {portfolioGame} from './games/portfolio.js';
import {sequenceGame} from './games/sequence.js';
import {frontlineGame} from './games/frontline.js';
import {priorityGame} from './games/priority.js';

[gridGame,allocationGame,portfolioGame,sequenceGame,frontlineGame,priorityGame].forEach(registerGame);

try{
  const settingsKey='partyPocketPartySettingsV1';
  const migrationKey='partyPocketExtraGamesMigrationV2';
  if(!localStorage.getItem(migrationKey)){
    const raw=localStorage.getItem(settingsKey);
    if(raw){
      const value=JSON.parse(raw);
      if(Array.isArray(value?.gameIds)){
        const extras=['grid','allocation','portfolio','sequence','frontline','priority'];
        const ids=[...new Set([...value.gameIds,...extras])];
        localStorage.setItem(settingsKey,JSON.stringify({...value,gameIds:ids}));
      }
    }
    localStorage.setItem(migrationKey,'1');
  }
}catch{}

await import('./app.js');
