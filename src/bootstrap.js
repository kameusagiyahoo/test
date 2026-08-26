import {registerGame} from './core/registry.js';
import {gridGame} from './games/grid.js';
import {allocationGame} from './games/allocation.js';
import {portfolioGame} from './games/portfolio.js';

[gridGame,allocationGame,portfolioGame].forEach(registerGame);

// Add newly introduced games to an existing saved Party selection once, without
// disturbing games the player intentionally excluded before this release.
try{
  const key='partyPocketPartySettingsV1',raw=localStorage.getItem(key);
  if(raw){
    const value=JSON.parse(raw);if(Array.isArray(value?.gameIds)){
      const ids=[...new Set([...value.gameIds,'grid','allocation','portfolio'])];
      localStorage.setItem(key,JSON.stringify({...value,gameIds:ids}));
    }
  }
}catch{}

await import('./app.js');
