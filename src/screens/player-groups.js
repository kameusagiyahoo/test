import {escapeHtml as esc} from '../ui/presentation.js';

export function createPlayerGroupsScreen({app,context}){
  const {session,playerGroups}=context.stores;
  const {disposeActiveGame,renderHome}=context.routes;
  const {updateBadge,toast}=context.services;
  function renderPlayerGroups(){
    disposeActiveGame();
    const groups=playerGroups.recent();
    updateBadge('PLAYER GROUPS');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="groupsBack">←</button><div><div class="eyebrow">PLAYER GROUPS</div><div class="screen-title">いつものメンバー</div></div></div>
    <section class="panel group-save-panel"><div><div class="eyebrow">SAVE CURRENT</div><h3>現在の${session.players.length}人を保存</h3><p>${session.players.map(esc).join(' · ')}</p></div><div class="group-save-form"><input id="groupName" maxlength="24" placeholder="例: 家族 / いつもの4人"><button class="btn primary" id="saveGroup">グループ保存</button></div><div class="helper">同じ名前で保存するとメンバーを上書きします。最大8グループ。</div></section>
    <div class="section-head"><h2>Saved Groups</h2><span class="muted">${groups.length} / 8</span></div>
    <section class="group-manager-list">${groups.length?groups.map(group=>`<article class="group-manager-row"><div><b>${esc(group.name)}</b><small>${group.players.length}人 · ${group.players.map(esc).join(' · ')}</small></div><div class="group-manager-actions"><button class="btn quiet" data-use-group="${group.id}">呼び出す</button><button class="icon-btn danger-icon" data-delete-group="${group.id}" aria-label="${esc(group.name)}を削除">×</button></div></article>`).join(''):'<div class="catalog-empty">まだ保存グループがありません。</div>'}</section>
    <div class="vault-note">グループ情報もData Vaultのバックアップに自動で含まれます。</div>`;

    app.querySelector('#groupsBack').onclick=renderHome;
    app.querySelector('#saveGroup').onclick=()=>{
      const name=app.querySelector('#groupName').value.trim();
      if(!name)return toast('グループ名を入力してください');
      try{playerGroups.save(name,session.players);renderPlayerGroups();toast(name+'を保存しました')}
      catch(error){toast(error?.message||'保存できませんでした')}
    };
    app.querySelectorAll('[data-use-group]').forEach(button=>button.onclick=()=>{
      const group=playerGroups.get(button.dataset.useGroup);if(!group)return;
      session.savePlayers(group.players);playerGroups.touch(group.id);renderHome();toast(group.name+'を呼び出しました');
    });
    app.querySelectorAll('[data-delete-group]').forEach(button=>button.onclick=()=>{
      const group=playerGroups.get(button.dataset.deleteGroup);if(!group)return;
      if(!confirm(group.name+'を削除しますか？'))return;
      playerGroups.remove(group.id);renderPlayerGroups();
    });
  }

  return renderPlayerGroups;
}
