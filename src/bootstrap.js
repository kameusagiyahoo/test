import {registerAllGames} from './games/index.js';

registerAllGames();

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
