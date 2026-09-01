import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const sw=fs.readFileSync('sw.js','utf8');
const index=fs.readFileSync('index.html','utf8');

test('PWA manifest stays scoped to the GitHub Pages subdirectory',()=>{
  assert.equal(manifest.start_url,'./');
  assert.equal(manifest.scope,'./');
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.theme_color,'#f3f1ec');
  assert.ok(manifest.icons.some(icon=>icon.purpose==='any'));
  assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
});

test('index exposes manifest and iOS standalone metadata',()=>{
  assert.match(index,/rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(index,/apple-mobile-web-app-capable/);
  assert.match(index,/apple-mobile-web-app-title/);
  assert.match(index,/apple-touch-icon/);
});

test('service worker precaches core PWA assets and all 24 game modules',()=>{
  const required=[
    './index.html','./styles.css','./strategy.css','./manifest.webmanifest',
    './icon.svg','./icon-maskable.svg','./src/bootstrap.js','./src/app.js',
    './src/core/pwa.js','./src/core/backup.js','./src/core/groups.js','./src/core/recommender.js','./src/core/party-presets.js','./src/core/party-history.js','./src/core/player-profile.js','./src/core/achievements.js','./src/core/share-card.js','./src/core/season.js','./src/core/game-insights.js','./src/core/playtest-events.js','./src/core/solo-analytics.js','./src/core/session.js','./src/core/catalog.js',
    'sync','bomb','five','minority','sniper','taboo','clock','ten',
    'code','logic','ev','auction','grid','allocation','portfolio','sequence',
    'frontline','priority','isolation','gate','triad','memory','route','pattern'
  ];
  for(const item of required){
    const needle=item.startsWith('.')?item:"./src/games/"+item+".js";
    assert.ok(sw.includes("'"+needle+"'"),needle);
  }
});

test('service worker has navigation fallback and versioned cache',()=>{
  assert.match(sw,/CACHE_NAME='party-pocket-v8\.28\.0'/);
  assert.match(sw,/request\.mode==='navigate'/);
  assert.match(sw,/caches\.match\('\.\/index\.html'\)/);
  assert.match(sw,/SKIP_WAITING/);
});
