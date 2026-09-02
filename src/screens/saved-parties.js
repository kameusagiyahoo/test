import {listGames} from '../core/registry.js';
import {summarizeSmartParty} from '../core/recommender.js';
import {escapeHtml as esc} from '../ui/presentation.js';

export function createSavedPartiesScreen({
  app,
  savedParties,
  disposeActiveGame,
  updateBadge,
  renderHome,
  startTrackedSchedule,
  renderPartyIntermission
}){
  function renderSavedParties(){
    disposeActiveGame();
    const games=listGames(),validIds=games.map(g=>g.id),byId=new Map(games.map(g=>[g.id,g]));
    const presets=savedParties.recent(validIds);
    updateBadge('SAVED PARTIES');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="savedPartyBack">←</button><div><div class="eyebrow">SAVED PARTIES</div><div class="screen-title">お気に入りの構成</div></div></div>
    <div class="lab-note">保存したゲーム順をそのまま再現します。Smart Partyや通常Partyのランダム化は行いません。</div>
    <section class="saved-party-manager">${presets.length?presets.map(preset=>{const rows=preset.schedule.map(id=>byId.get(id)).filter(Boolean),info=summarizeSmartParty(rows);return`<article class="saved-party-manager-row"><div><b>${esc(preset.name)}</b><small>${rows.map(g=>g.emoji+' '+g.title).join(' → ')}</small><small>${preset.schedule.length}R · 約${info.totalMinutes}分</small></div><div class="saved-party-manager-actions"><button class="btn primary" data-run-preset="${preset.id}">開始</button><button class="icon-btn danger-icon" data-delete-preset="${preset.id}" aria-label="${esc(preset.name)}を削除">×</button></div></article>`}).join(''):'<div class="catalog-empty">保存したParty構成はまだありません。</div>'}</section>
    <div class="vault-note">Party終了画面から最大8件まで保存できます。Data Vaultのバックアップにも含まれます。</div>`;
    app.querySelector('#savedPartyBack').onclick=renderHome;
    app.querySelectorAll('[data-run-preset]').forEach(button=>button.onclick=()=>{const preset=savedParties.get(button.dataset.runPreset,validIds);if(!preset)return;savedParties.touch(preset.id);startTrackedSchedule(preset.schedule);renderPartyIntermission(true)});
    app.querySelectorAll('[data-delete-preset]').forEach(button=>button.onclick=()=>{const preset=savedParties.get(button.dataset.deletePreset,validIds);if(!preset)return;if(!confirm(preset.name+'を削除しますか？'))return;savedParties.remove(preset.id);renderSavedParties()});
  }

  return renderSavedParties;
}
