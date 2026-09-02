import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
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
    './icon.svg','./icon-maskable.svg','./src/bootstrap.js','./src/app.js','./src/app/state.js','./src/app/experiment-workflow.js','./src/app/share-actions.js','./src/app/shell-ui.js','./src/app/pwa-lifecycle.js','./src/games/index.js','./src/ui/presentation.js','./src/ui/playtest-feedback.js','./src/ui/result-presentation.js','./src/screens/data-vault.js','./src/screens/player-groups.js','./src/screens/party-history.js','./src/screens/saved-parties.js','./src/screens/party/play-flow.js','./src/screens/home/home.js','./src/screens/game-detail/game-detail.js','./src/screens/analytics/playtest-lab.js','./src/screens/analytics/player-analytics.js','./src/screens/analytics/improvement.js','./src/screens/analytics/game-insights.js',
    './src/core/pwa.js','./src/core/backup.js','./src/core/groups.js','./src/core/recommender.js','./src/core/party-presets.js','./src/core/party-history.js','./src/core/player-profile.js','./src/core/achievements.js','./src/core/share-card.js','./src/core/season.js','./src/core/game-insights.js','./src/core/playtest-events.js','./src/core/solo-analytics.js','./src/core/improvement-queue.js','./src/core/experiment-evaluation.js','./src/core/experiment-learnings.js','./src/core/learned-recommendations.js','./src/core/session.js','./src/core/catalog.js',
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
  assert.ok(sw.includes(`CACHE_NAME='party-pocket-v${pkg.version}'`));
  assert.match(sw,/request\.mode==='navigate'/);
  assert.match(sw,/caches\.match\('\.\/index\.html'\)/);
  assert.match(sw,/SKIP_WAITING/);
});
