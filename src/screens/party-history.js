import {rankScores} from '../core/session.js';
import {listGames} from '../core/registry.js';
import {partyLeadChanges,partyMvp} from '../core/party-history.js';
import {escapeHtml as esc} from '../ui/presentation.js';

export function formatPartyDate(value){
  const date=new Date(value);if(Number.isNaN(date.getTime()))return'日時不明';
  return date.toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
}

export function createPartyHistoryScreens({app,context}){
  const {partyHistory,savedParties}=context.stores;
  const {
    disposeActiveGame,
    renderHome,
    startTrackedSchedule,
    renderPartyIntermission
  }=context.routes;
  const {updateBadge,toast,sharePartyCard}=context.services;
  function partyRecapHtml(entry,{compact=false}={}){
    if(!entry)return'';
    const games=new Map(listGames().map(g=>[g.id,g])),mvp=partyMvp(entry),leadChanges=partyLeadChanges(entry);
    const ranking=rankScores(entry.finalScores);
    return `<section class="party-recap ${compact?'compact':''}"><div class="party-recap-head"><div><div class="eyebrow">PARTY RECAP</div><b>${entry.rounds.length}/${entry.schedule.length} rounds recorded</b></div><div class="party-recap-facts"><span>MVP ${mvp?mvp.names.map(esc).join(' & '):'—'}</span><span>首位交代 ${leadChanges}回</span></div></div><div class="party-recap-ranking">${ranking.map(row=>`<div><span>${row.rank}. ${esc(entry.players[row.index])}</span><b>${row.score} pt</b></div>`).join('')}</div><div class="party-recap-rounds">${entry.rounds.map((round,index)=>{const game=games.get(round.gameId),winnerNames=round.winners.map(i=>entry.players[i]).filter(Boolean);return`<div class="party-recap-round"><span class="smart-order">${String(index+1).padStart(2,'0')}</span><span><b>${game?.emoji||''} ${esc(game?.title||round.gameId)}</b><small>${winnerNames.length?`勝者 ${winnerNames.map(esc).join(' & ')}`:'勝者なし'} · ${round.awards.map((v,i)=>v>0?`${esc(entry.players[i])} +${v}`:null).filter(Boolean).join(' / ')||'Party pt なし'}</small></span></div>`}).join('')}</div></section>`;
  }

  function renderPartyHistory(){
    disposeActiveGame();
    const games=listGames(),ids=games.map(g=>g.id),entries=partyHistory.history(ids);
    updateBadge('PARTY HISTORY');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="historyBack">←</button><div><div class="eyebrow">PARTY HISTORY</div><div class="screen-title">完了したParty</div></div></div><section class="lab-summary"><div><b>${entries.length}</b><span>保存Party</span></div><div><b>${entries.reduce((sum,e)=>sum+e.rounds.length,0)}</b><span>記録ラウンド</span></div><div><b>${new Set(entries.flatMap(e=>e.players)).size}</b><span>players</span></div></section><div class="lab-note">完走したPartyだけを最大50件保存します。途中離脱は完了履歴には入りません。</div><section class="party-history-list">${entries.length?entries.map(entry=>{const winners=entry.winners.map(i=>entry.players[i]).filter(Boolean);return`<button class="party-history-row" data-history-id="${entry.id}"><span><b>${winners.length?`${winners.map(esc).join(' & ')} 勝利`:'Party結果'}</b><small>${formatPartyDate(entry.completedAt)} · ${entry.players.map(esc).join(' · ')}</small><small>${entry.schedule.length}R · ${entry.finalScores.map((v,i)=>`${esc(entry.players[i])} ${v}`).join(' / ')}</small></span><span class="recommend-arrow">→</span></button>`}).join(''):'<div class="catalog-empty">完了したPartyはまだありません。</div>'}</section>`;
    app.querySelector('#historyBack').onclick=renderHome;
    app.querySelectorAll('[data-history-id]').forEach(button=>button.onclick=()=>renderPartyHistoryDetail(button.dataset.historyId));
  }

  function renderPartyHistoryDetail(id){
    disposeActiveGame();
    const games=listGames(),validIds=games.map(g=>g.id),entry=partyHistory.get(id,validIds);
    if(!entry)return renderPartyHistory();
    updateBadge('PARTY RECAP');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="recapBack">←</button><div><div class="eyebrow">PARTY RECAP</div><div class="screen-title">${formatPartyDate(entry.completedAt)}</div></div></div>${partyRecapHtml(entry)}<section class="panel recap-actions"><div><div class="eyebrow">SHARE / REPLAY</div><p>結果画像を共有するか、${entry.schedule.length}ラウンドを同じ順番で再現できます。</p></div><div class="actions"><button class="btn quiet" id="shareHistoryCard">結果画像を共有</button><button class="btn quiet" id="saveHistoryPreset">Saved Partyに保存</button><button class="btn primary" id="replayHistory">同じ構成で再戦</button></div></section>`;
    app.querySelector('#recapBack').onclick=renderPartyHistory;
    app.querySelector('#shareHistoryCard').onclick=()=>sharePartyCard(entry);
    app.querySelector('#replayHistory').onclick=()=>{startTrackedSchedule(entry.schedule);renderPartyIntermission(true)};
    app.querySelector('#saveHistoryPreset').onclick=()=>{
      const defaultName='Party '+formatPartyDate(entry.completedAt).replace(/[/:]/g,'-');
      const name=prompt('Saved Party名',defaultName);if(!name?.trim())return;
      try{savedParties.save(name.trim(),entry.schedule);toast('Saved Partyに保存しました')}catch(error){toast(error?.message||'保存できませんでした')}
    };
  }

  return{partyRecapHtml,renderPartyHistory,renderPartyHistoryDetail};
}
