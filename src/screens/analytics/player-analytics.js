import {listGames} from '../../core/registry.js';
import {buildPlayerProfile,buildPlayerProfiles,topPlayerRecords} from '../../core/player-profile.js';
import {achievementBoard,achievementSummary,nextMilestones,playerAchievements,unlockedAchievements} from '../../core/achievements.js';
import {availableSeasonKeys,buildSeasonView,currentSeasonKey,seasonLabel} from '../../core/season.js';
import {escapeHtml as esc} from '../../ui/presentation.js';
import {formatPartyDate} from '../party-history.js';

export function percent(value){
  return `${Math.round((Number(value)||0)*100)}%`;
}

export function formatPlayedAt(at){
  try{return new Date(at).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
  catch{return''}
}

export function seasonDelta(value){
  const number=Number(value)||0;
  return number>0?'+'+number:String(number);
}

export function profileResultLabel(result){
  return result==='win'?'勝':result==='draw'?'分':'敗';
}

export function createPlayerAnalyticsScreens({
  app,
  stats,
  partyHistory,
  disposeActiveGame,
  updateBadge,
  renderHome,
  renderGameDetail,
  shareProfileCard,
  renderPartyHistoryDetail
}){
  function renderSeasonBoard(selectedKey=currentSeasonKey()){
    disposeActiveGame();
    const games=listGames(),ids=games.map(game=>game.id);
    const statEntries=stats.history().filter(entry=>ids.includes(entry.gameId));
    const partyEntries=partyHistory.history(ids);
    const keys=availableSeasonKeys(statEntries,partyEntries);
    if(!keys.includes(selectedKey))keys.unshift(selectedKey);
    const view=buildSeasonView(selectedKey,statEntries,partyEntries);
    updateBadge('SEASON BOARD');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="seasonBack">←</button><div><div class="eyebrow">SEASON BOARD</div><div class="screen-title">${esc(view.label)}</div></div></div>
    <section class="season-tabs">${keys.slice(0,12).map(key=>`<button class="season-tab ${key===selectedKey?'active':''}" data-season-key="${key}">${esc(seasonLabel(key))}</button>`).join('')}</section>
    <section class="lab-summary season-summary"><div><b>${view.totalPlays}</b><span>記録試合</span></div><div><b>${view.partySessions}</b><span>Party</span></div><div><b>${view.players}</b><span>players</span></div><div><b>${view.gamesPlayed}</b><span>titles</span></div></section>
    <div class="lab-note">順位は「勝利数 → Party総合優勝 → MVP → 勝率 → 試合数」。前月差は同じプレイヤーの前月実績との差です。</div>
    <section class="season-standings">${view.rows.length?view.rows.map(row=>`<button class="season-row" data-season-player="${encodeURIComponent(row.name)}"><span class="season-rank">${String(row.rank).padStart(2,'0')}</span><span class="season-player"><b>${esc(row.name)}</b><small>${row.plays}試合 · 勝率 ${percent(row.winRate)} · ${row.gamesPlayed} titles</small></span><span class="season-main"><b>${row.wins}勝</b><small>前月比 ${seasonDelta(row.deltaWins)}</small></span><span class="season-extra"><b>Party ${row.partyWins}</b><small>MVP ${row.mvpCount} · ${row.partyPoints} pt</small></span></button>`).join(''):'<div class="catalog-empty">この月の完了試合はまだありません。</div>'}</section>
    ${view.rows.length>=2?`<section class="season-podium"><div class="eyebrow">TOP 3</div><div class="season-podium-grid">${view.rows.slice(0,3).map(row=>`<div><span>${row.rank}</span><b>${esc(row.name)}</b><small>${row.wins}勝 · Party ${row.partyWins}勝 · MVP ${row.mvpCount}</small></div>`).join('')}</div></section>`:''}`;
    app.querySelector('#seasonBack').onclick=renderHome;
    app.querySelectorAll('[data-season-key]').forEach(button=>button.onclick=()=>renderSeasonBoard(button.dataset.seasonKey));
    app.querySelectorAll('[data-season-player]').forEach(button=>button.onclick=()=>renderPlayerProfile(decodeURIComponent(button.dataset.seasonPlayer)));
  }

  function renderStatsDashboard(){
    disposeActiveGame();
    const games=listGames(),ids=games.map(game=>game.id),byId=new Map(games.map(game=>[game.id,game])),report=stats.report(ids);
    const gameRows=report.gameStats.map(row=>({...row,game:byId.get(row.gameId)}));
    const profiles=buildPlayerProfiles(stats.history().filter(entry=>ids.includes(entry.gameId)),partyHistory.history(ids));
    const records=topPlayerRecords(profiles);
    const mostPlayed=gameRows[0];
    updateBadge('LOCAL STATS');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="statsBack">←</button><div><div class="eyebrow">LOCAL STATS</div><div class="screen-title">プレイ履歴と勝率</div></div></div>
    <section class="lab-summary stats-summary"><div><b>${report.totalPlays}</b><span>記録試合</span></div><div><b>${report.gamesPlayed}</b><span>/ ${games.length} games</span></div><div><b>${report.playerStats.length}</b><span>players</span></div></section>
    <div class="lab-note">Singleは5点先取で完走した時に1試合、Partyは各ラウンド終了時に1試合として記録します。途中離脱は集計しません。</div>
    ${mostPlayed?`<section class="stat-highlight"><div class="eyebrow">MOST PLAYED</div><b>${mostPlayed.game?.emoji||''} ${esc(mostPlayed.game?.title||mostPlayed.gameId)}</b><span>${mostPlayed.plays}試合</span></section>`:''}
    ${profiles.length?`<section class="record-strip"><div><span>最多勝</span><b>${records.mostWins?esc(records.mostWins.name)+' '+records.mostWins.wins+'勝':'—'}</b></div><div><span>最高勝率</span><b>${records.bestWinRate?esc(records.bestWinRate.name)+' '+percent(records.bestWinRate.winRate):'5試合以上で表示'}</b></div><div><span>Party最多勝</span><b>${records.mostPartyWins?esc(records.mostPartyWins.name)+' '+records.mostPartyWins.partyWins+'勝':'—'}</b></div><div><span>MVP</span><b>${records.mostMvp?esc(records.mostMvp.name)+' '+records.mostMvp.mvpCount+'回':'—'}</b></div></section>`:''}
    <div class="section-head compact-head"><h2>Players</h2><span class="muted">タップでプロフィール</span></div>
    <section class="stats-list">${profiles.length?profiles.map((profile,index)=>`<button class="stats-row player-profile-row" data-player-profile="${encodeURIComponent(profile.name)}"><span class="stats-rank">${String(index+1).padStart(2,'0')}</span><span><b>${esc(profile.name)}</b><small>${profile.plays}試合 · ${profile.partySessions} Party · MVP ${profile.mvpCount}回</small></span><span class="stats-value"><b>${profile.wins}勝</b><small>${percent(profile.winRate)}</small></span></button>`).join(''):'<div class="catalog-empty">まだ完了した試合がありません。</div>'}</section>
    <div class="section-head compact-head"><h2>Games</h2><span class="muted">プレイ回数</span></div>
    <section class="stats-list">${gameRows.length?gameRows.map(row=>`<button class="stats-row game-stat-row" data-game="${row.gameId}"><span class="lab-symbol">${row.game?.emoji||''}</span><span><b>${esc(row.game?.title||row.gameId)}</b><small>Single ${row.single} · Party ${row.party}${row.leader?` ·最多勝 ${esc(row.leader.name)} ${row.leader.wins}勝`:''}</small></span><span class="stats-value"><b>${row.plays}</b><small>plays</small></span></button>`).join(''):'<div class="catalog-empty">ゲーム別データはまだありません。</div>'}</section>
    <div class="section-head compact-head"><h2>Recent results</h2><span class="muted">最大20件</span></div>
    <section class="history-list">${report.recent.length?report.recent.map(entry=>{const game=byId.get(entry.gameId),winnerNames=entry.winners.map(index=>entry.players[index]).filter(Boolean);return`<div class="history-row"><span class="history-symbol">${game?.emoji||''}</span><span><b>${esc(game?.title||entry.gameId)}</b><small>${entry.mode==='party'?'Party round':'Single'} · ${winnerNames.length?`勝者 ${winnerNames.map(esc).join(' & ')}`:'勝者なし'}</small></span><time>${formatPlayedAt(entry.at)}</time></div>`}).join(''):'<div class="catalog-empty">履歴はまだありません。</div>'}</section>`;
    app.querySelector('#statsBack').onclick=renderHome;
    app.querySelectorAll('[data-player-profile]').forEach(button=>button.onclick=()=>renderPlayerProfile(decodeURIComponent(button.dataset.playerProfile)));
    app.querySelectorAll('.game-stat-row[data-game]').forEach(button=>button.onclick=()=>renderGameDetail(button.dataset.game));
  }

  function renderPlayerProfile(name){
    disposeActiveGame();
    const games=listGames(),ids=games.map(game=>game.id),byId=new Map(games.map(game=>[game.id,game]));
    const profile=buildPlayerProfile(name,stats.history().filter(entry=>ids.includes(entry.gameId)),partyHistory.history(ids));
    if(!profile.plays&&!profile.partySessions)return renderStatsDashboard();
    const topGames=profile.gameStats.slice(0,3),badges=playerAchievements(profile),unlocked=unlockedAchievements(profile),next=nextMilestones(profile,3);
    updateBadge('PLAYER PROFILE');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="profileBack">←</button><div><div class="eyebrow">PLAYER PROFILE</div><div class="screen-title">${esc(profile.name)}</div></div></div>
    <section class="profile-hero"><div class="profile-monogram">${esc(profile.name.slice(0,1).toUpperCase())}</div><div><div class="eyebrow">CAREER</div><h2>${esc(profile.name)}</h2><p>${profile.plays}試合 · ${profile.wins}勝 · 勝率 ${percent(profile.winRate)}</p></div></section>
    <div class="profile-share-row"><button class="btn quiet" id="shareProfileCard">プロフィール画像を共有</button></div>
    <section class="profile-kpis"><div><b>${profile.plays}</b><span>games</span></div><div><b>${profile.wins}</b><span>wins</span></div><div><b>${percent(profile.winRate)}</b><span>win rate</span></div><div><b>${profile.gamesPlayed}</b><span>titles</span></div></section>
    <div class="section-head compact-head"><h2>Party Career</h2><span class="muted">完了Party単位</span></div>
    <section class="profile-kpis party-kpis"><div><b>${profile.partySessions}</b><span>Party</span></div><div><b>${profile.partyWins}</b><span>Party wins</span></div><div><b>${profile.mvpCount}</b><span>MVP</span></div><div><b>${profile.partyPoints}</b><span>Party pt</span></div></section>
    <div class="section-head compact-head"><h2>Achievements</h2><span class="muted">${unlocked.length} / ${badges.length} unlocked</span></div>
    <section class="achievement-badges">${unlocked.length?unlocked.map(row=>`<div class="achievement-badge ${row.tier}"><span class="achievement-symbol">${esc(row.symbol)}</span><span><b>${esc(row.title)}</b><small>${esc(row.description)}</small></span></div>`).join(''):'<div class="catalog-empty">まだ解除済み実績はありません。</div>'}</section>
    <div class="section-head compact-head"><h2>Next Milestones</h2><span class="muted">達成に近い順</span></div>
    <section class="milestone-list">${next.length?next.map(row=>`<div class="milestone-row"><span class="achievement-symbol locked">${esc(row.symbol)}</span><span><b>${esc(row.title)}</b><small>${esc(row.description)} · ${row.current}/${row.target}</small><span class="milestone-track"><i style="width:${Math.round(row.progress*100)}%"></i></span></span><strong>${Math.round(row.progress*100)}%</strong></div>`).join(''):'<div class="catalog-empty">すべての実績を解除しています。</div>'}</section>
    <div class="section-head compact-head"><h2>Best Games</h2><span class="muted">勝数 → 勝率</span></div>
    <section class="profile-game-list">${topGames.length?topGames.map((row,index)=>{const game=byId.get(row.gameId);return`<button class="profile-game-row" data-game="${row.gameId}"><span class="stats-rank">${String(index+1).padStart(2,'0')}</span><span class="lab-symbol">${game?.emoji||''}</span><span><b>${esc(game?.title||row.gameId)}</b><small>${row.plays}試合 · ${row.wins}勝</small></span><span class="stats-value"><b>${percent(row.winRate)}</b><small>win rate</small></span></button>`}).join(''):'<div class="catalog-empty">ゲーム別データがありません。</div>'}</section>
    <div class="section-head compact-head"><h2>Rivals</h2><span class="muted">Party最終スコア比較</span></div>
    <section class="rival-list">${profile.rivals.length?profile.rivals.map(rival=>`<div class="rival-row"><span><b>${esc(rival.name)}</b><small>${rival.meetings} Partyで対戦</small></span><span class="rival-record"><b>${rival.wins}-${rival.draws}-${rival.losses}</b><small>勝-分-敗</small></span></div>`).join(''):'<div class="catalog-empty">対戦相手データがありません。</div>'}</section>
    <div class="section-head compact-head"><h2>Recent Party Form</h2><span class="muted">直近5回</span></div>
    <section class="form-strip">${profile.recentParty.length?profile.recentParty.map(row=>`<button class="form-result ${row.result}" data-profile-party="${row.id}" title="${formatPartyDate(row.completedAt)}">${profileResultLabel(row.result)}</button>`).join(''):'<span class="muted">Party履歴なし</span>'}</section>`;
    app.querySelector('#profileBack').onclick=renderStatsDashboard;
    app.querySelector('#shareProfileCard').onclick=()=>shareProfileCard(profile,unlocked);
    app.querySelectorAll('[data-game]').forEach(button=>button.onclick=()=>renderGameDetail(button.dataset.game));
    app.querySelectorAll('[data-profile-party]').forEach(button=>button.onclick=()=>renderPartyHistoryDetail(button.dataset.profileParty));
  }

  function renderAchievements(){
    disposeActiveGame();
    const games=listGames(),ids=games.map(game=>game.id);
    const profiles=buildPlayerProfiles(stats.history().filter(entry=>ids.includes(entry.gameId)),partyHistory.history(ids));
    const board=achievementBoard(profiles),summary=achievementSummary(profiles);
    updateBadge('ACHIEVEMENTS');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="achievementBack">←</button><div><div class="eyebrow">ACHIEVEMENTS</div><div class="screen-title">実績とMilestones</div></div></div>
    <section class="achievement-summary"><div><b>${summary.unlocked}</b><span>unlocked</span></div><div><b>${summary.players}</b><span>players</span></div><div><b>${summary.possible}</b><span>possible</span></div></section>
    <div class="lab-note">StatsとParty Historyから毎回再計算します。勝率系ではなく、プレイ・勝利・Party・MVP・ゲーム幅・対戦継続などの到達実績です。</div>
    <section class="achievement-board">${board.length?board.map((row,index)=>{const profile=profiles.find(item=>item.name===row.name),badges=unlockedAchievements(profile);return`<button class="achievement-player" data-achievement-player="${encodeURIComponent(row.name)}"><span class="stats-rank">${String(index+1).padStart(2,'0')}</span><span><b>${esc(row.name)}</b><small>${row.unlocked}/${row.total} badges · ${row.plays}試合</small><span class="mini-badges">${badges.slice(-6).map(achievement=>`<i class="${achievement.tier}">${esc(achievement.symbol)}</i>`).join('')||'<em>まだ実績なし</em>'}</span></span><span class="achievement-next">${row.next?`次: ${esc(row.next.title)}<small>${row.next.current}/${row.next.target}</small>`:'COMPLETE'}</span></button>`}).join(''):'<div class="catalog-empty">まだ実績データがありません。</div>'}</section>`;
    app.querySelector('#achievementBack').onclick=renderHome;
    app.querySelectorAll('[data-achievement-player]').forEach(button=>button.onclick=()=>renderPlayerProfile(decodeURIComponent(button.dataset.achievementPlayer)));
  }

  return{renderSeasonBoard,renderStatsDashboard,renderPlayerProfile,renderAchievements};
}
