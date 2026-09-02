import {SessionStore} from '../core/session.js';
import {RatingStore,PartySettingsStore,LibraryStore,PlaytestStore} from '../core/preferences.js';
import {createLocalTransport} from '../core/transport.js';
import {StatsStore} from '../core/stats.js';
import {SoloProgressStore} from '../core/solo.js';
import {PlayerGroupStore} from '../core/groups.js';
import {SavedPartyStore} from '../core/party-presets.js';
import {PartyHistoryStore} from '../core/party-history.js';
import {PlaytestEventStore} from '../core/playtest-events.js';
import {ImprovementQueueStore} from '../core/improvement-queue.js';

export function createAppState({storage=globalThis.localStorage}={}){
  const transport=createLocalTransport();
  return{
    session:new SessionStore({storage,transport}),
    ratings:new RatingStore(storage),
    partySettings:new PartySettingsStore(storage),
    library:new LibraryStore(storage),
    playtests:new PlaytestStore(storage),
    playtestEvents:new PlaytestEventStore(storage),
    stats:new StatsStore(storage),
    soloProgress:new SoloProgressStore(storage),
    playerGroups:new PlayerGroupStore(storage),
    savedParties:new SavedPartyStore(storage),
    partyHistory:new PartyHistoryStore(storage),
    improvementQueue:new ImprovementQueueStore(storage)
  };
}
