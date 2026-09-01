const CACHE_NAME='party-pocket-v8.27.0';
const APP_SHELL=[
  './',
  './index.html',
  './styles.css',
  './strategy.css',
  './manifest.webmanifest',
  './icon.svg',
  './icon-maskable.svg',
  './src/bootstrap.js',
  './src/app.js',
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
