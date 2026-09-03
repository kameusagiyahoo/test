const CACHE_NAME='party-pocket-v8.35.0';
const APP_SHELL=[
  './',
  './index.html',
  './styles.css',
  './strategy.css',
  './manifest.webmanifest',
  './icon.svg',
  './icon-maskable.svg',
  './src/bootstrap.js',
  './src/games/index.js',
  './src/ui/presentation.js',
  './src/ui/playtest-feedback.js',
  './src/ui/result-presentation.js',
  './src/app.js',
  './src/app/state.js',
  './src/app/context-contract.js',
  './src/app/experiment-workflow.js',
  './src/app/share-actions.js',
  './src/app/shell-ui.js',
  './src/app/pwa-lifecycle.js',
  './src/app/navigation.js',
  './src/app/runtime.js',
  './src/screens/data-vault.js',
  './src/screens/data-vault-context.js',
  './src/screens/player-groups.js',
  './src/screens/player-groups-context.js',
  './src/screens/party-history.js',
  './src/screens/party-history-context.js',
  './src/screens/saved-parties.js',
  './src/screens/saved-parties-context.js',
  './src/screens/party/play-flow.js',
  './src/screens/party/context.js',
  './src/screens/home/home.js',
  './src/screens/home/context.js',
  './src/screens/game-detail/game-detail.js',
  './src/screens/game-detail/context.js',
  './src/screens/analytics/playtest-lab.js',
  './src/screens/analytics/playtest-lab-context.js',
  './src/screens/analytics/player-analytics.js',
  './src/screens/analytics/player-analytics-context.js',
  './src/screens/analytics/improvement.js',
  './src/screens/analytics/improvement-context.js',
  './src/screens/analytics/game-insights.js',
  './src/screens/analytics/game-insights-context.js',
  './src/core/session.js',
  './src/core/preferences.js',
  './src/core/registry.js',
  './src/core/transport.js',
  './src/core/catalog.js',
  './src/core/game-guide.js',
  './src/core/stats.js',
  './src/core/health.js',
  './src/core/solo.js',
  './src/core/pwa.js',
  './src/core/backup.js',
  './src/core/groups.js',
  './src/core/recommender.js',
  './src/core/party-presets.js',
  './src/core/party-history.js',
  './src/core/player-profile.js',
  './src/core/achievements.js',
  './src/core/share-card.js',
  './src/core/season.js',
  './src/core/game-insights.js',
  './src/core/playtest-events.js',
  './src/core/solo-analytics.js',
  './src/core/improvement-queue.js',
  './src/core/experiment-evaluation.js',
  './src/core/experiment-learnings.js',
  './src/core/learned-recommendations.js',
  './src/games/sync.js',
  './src/games/bomb.js',
  './src/games/five.js',
  './src/games/minority.js',
  './src/games/sniper.js',
  './src/games/taboo.js',
  './src/games/clock.js',
  './src/games/ten.js',
  './src/games/code.js',
  './src/games/logic.js',
  './src/games/ev.js',
  './src/games/auction.js',
  './src/games/grid.js',
  './src/games/allocation.js',
  './src/games/portfolio.js',
  './src/games/sequence.js',
  './src/games/frontline.js',
  './src/games/priority.js',
  './src/games/isolation.js',
  './src/games/gate.js',
  './src/games/triad.js',
  './src/games/memory.js',
  './src/games/route.js',
  './src/games/pattern.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));
          return response;
        })
        .catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
