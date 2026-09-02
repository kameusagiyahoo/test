import {getGame,listGames} from '../../core/registry.js';
import {
  CATEGORY_DEFS,
  categoriesFor,
  categoryLabel,
  difficultyLabel,
  filterGames,
  gameMeta,
  pickGame,
  playerRangeLabel,
  recommendedGames
} from '../../core/catalog.js';
import {SOLO_GAME_IDS,soloDifficultyLabel} from '../../core/solo.js';
import {canPromptInstall,isIOS,isOnline,isStandalone,requestInstall} from '../../core/pwa.js';
import {samePlayers} from '../../core/groups.js';
import {buildPlayerProfiles} from '../../core/player-profile.js';
import {achievementSummary} from '../../core/achievements.js';
import {buildSeasonView,currentSeasonKey} from '../../core/season.js';
import {buildExperimentLearnings} from '../../core/experiment-learnings.js';
import {summarizeSmartParty} from '../../core/recommender.js';
import {escapeHtml as esc,oneDecimal} from '../../ui/presentation.js';

export function pwaStatusLabel(){
  return isStandalone()?'APP':isOnline()?'ONLINE':'OFFLINE';
}

export function createCatalogState(playerCount){
  return{
    category:'all',
    query:'',
    difficulty:'all',
    maxMinutes:'all',
    playerCount:Number(playerCount)||1,
    recommendedOnly:true
  };
}

export function smartPartyRoundsForCatalog(allowedCount){
  return Math.min(6,Math.max(3,Number(allowedCount)||0));
}

export function createHomeScreen({app,context}){
  const {
    session,
    ratings,
    library,
    playtests,
    stats,
    soloProgress,
    playerGroups,
    savedParties,
    partyHistory,
    improvementQueue
  }=context.stores;
  const {
    disposeActiveGame,
    renderPlayerGroups,
    renderSavedParties,
    renderPartyHistory,
    renderPartyHistoryDetail,
    renderPartySetup,
    startSmartParty,
    startTrackedSchedule,
    renderPartyIntermission,
    startGame,
    renderGameDetail,
    renderSmartPartyPreview,
    renderPlaytestLab,
    renderStatsDashboard,
    renderSeasonBoard,
    renderAchievements,
    renderGameHealth,
    renderImprovementQueue,
    renderExperimentLearnings,
    renderDataVault
  }=context.routes;
  const {updateBadge,toast,soloDifficultyDetail}=context.services;
  let draftPlayers=[...session.players];
  let installReady=false;
  let updateRegistration=null;

  function ratingSummary(gameId){
    const playtest=playtests.get(gameId);
    if(playtest.responses)return `評価 ${playtest.responses}回 · 面白さ ${oneDecimal(playtest.fun.average)}`;
    const rating=ratings.get(gameId);
    return rating.total?`旧評価 ${rating.total}回`:'';
  }

  function gameCardHtml(game,index){
    const categoryTags=categoriesFor(game.id).slice(0,2).map(categoryLabel),meta=gameMeta(game.id),favorite=library.isFavorite(game.id);
    const summary=ratingSummary(game.id);
    return `<button class="game-card" data-game="${game.id}"><div class="game-card-top"><span class="game-index">${String(index+1).padStart(2,'0')}</span><span class="game-card-tools"><span class="favorite-mark">${favorite?'★':''}</span><span class="game-symbol">${game.emoji}</span></span></div><h3>${game.title}</h3><p>${game.description}</p><div class="game-facts"><span>${difficultyLabel(meta.difficulty)}</span><span>約${meta.minutes}分</span><span>${playerRangeLabel(meta)}推奨</span></div><div class="game-meta">${categoryTags.map(tag=>`<span>${tag}</span>`).join('')}${summary?`<span class="rating-summary">${summary}</span>`:''}</div></button>`;
  }

  function recommendationHtml(game){
    const meta=gameMeta(game.id);
    return `<button class="recommend-card" data-game="${game.id}"><span class="recommend-symbol">${game.emoji}</span><span><b>${game.title}</b><small>${difficultyLabel(meta.difficulty)} · 約${meta.minutes}分 · ${playerRangeLabel(meta)}推奨</small></span><span class="recommend-arrow">→</span></button>`;
  }

  function libraryRowHtml(game){
    const meta=gameMeta(game.id);
    return `<button class="library-row" data-game="${game.id}"><span class="recommend-symbol">${game.emoji}</span><span><b>${game.title}</b><small>${difficultyLabel(meta.difficulty)} · 約${meta.minutes}分</small></span><span class="recommend-arrow">→</span></button>`;
  }

  function saveDraft({quiet=false}={}){
    session.savePlayers(draftPlayers);
    draftPlayers=[...session.players];
    updateBadge();
    if(!quiet)toast('プレイヤーを保存しました');
  }

  function renderPlayers(){
    const box=app.querySelector('#playerList');if(!box)return;
    box.innerHTML=draftPlayers.map((name,index)=>`<div class="player-row"><div class="avatar">${String(index+1).padStart(2,'0')}</div><input data-player="${index}" maxlength="16" value="${esc(name)}"><button class="icon-btn" data-remove="${index}" aria-label="削除" ${draftPlayers.length<=1?'disabled':''}>×</button></div>`).join('');
    box.querySelectorAll('[data-player]').forEach(input=>input.oninput=event=>draftPlayers[+event.target.dataset.player]=event.target.value);
    box.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{
      if(draftPlayers.length>1){
        draftPlayers.splice(+button.dataset.remove,1);
        renderPlayers();
      }
    });
  }

  function bindGameLaunch(container=app){
    container.querySelectorAll('[data-game]').forEach(button=>button.onclick=()=>{
      saveDraft({quiet:true});
      renderGameDetail(button.dataset.game);
    });
  }

  function renderHome(){
    disposeActiveGame();
    draftPlayers=[...session.players];

    const games=listGames(),saved=session.savedPartyInfo(),savedGame=saved?getGame(saved.nextGameId):null;
    const validIds=games.map(game=>game.id),byId=new Map(games.map(game=>[game.id,game]));
    const favoriteGames=library.favorites(validIds).map(id=>byId.get(id)).filter(Boolean);
    const recentGames=library.recent(validIds).map(id=>byId.get(id)).filter(Boolean);
    const groups=playerGroups.recent();
    const partyPresets=savedParties.recent(validIds);
    const recentParties=partyHistory.history(validIds).slice(0,3);
    const statEntries=stats.history().filter(entry=>validIds.includes(entry.gameId));
    const partyEntries=partyHistory.history(validIds);
    const profileRows=buildPlayerProfiles(statEntries,partyEntries);
    const achievementData=achievementSummary(profileRows);
    const currentSeason=buildSeasonView(currentSeasonKey(),statEntries,partyEntries);
    const improvementRows=improvementQueue.all(validIds);
    const improvementSummary=improvementQueue.summary(validIds);
    const learningSummary=buildExperimentLearnings(improvementRows);
    const daily=soloProgress.daily(),dailyGame=byId.get(daily.gameId),soloSummary=soloProgress.summary();

    updateBadge(`${session.players.length}人 · ${games.length} games · ${pwaStatusLabel()}`);
    const resumeHtml=saved&&savedGame?`<section class="resume-card"><div><div class="eyebrow">SAVED PARTY</div><h3>Round ${saved.round+1}/${saved.totalRounds} から再開</h3><p>${esc(savedGame.title)}から続けます。ラウンド途中で閉じた場合、そのラウンドは最初から始まります。</p></div><div class="resume-actions"><button class="btn primary" id="resumeParty">再開する</button><button class="btn quiet" id="discardParty">保存を破棄</button></div></section>`:'';

    app.innerHTML=`<section class="hero"><div class="eyebrow hero-label">LOCAL PARTY GAMES</div><h1>ひとつのスマホで、<br>場を動かす。</h1><p>1〜8人。ひとりでも、みんなでも。準備なしで始められる短いゲームのコレクション。</p></section>
    ${resumeHtml}
    <div class="section-head"><h2>Players</h2><button class="section-action" id="manageGroups">グループ管理</button></div>
    ${groups.length?`<section class="group-list" id="savedGroups">${groups.map(group=>`<article class="group-card ${samePlayers(group.players,session.players)?'active':''}" data-group-card="${group.id}"><div class="group-card-main"><div><div class="eyebrow">${group.players.length===1?'SOLO GROUP':'PLAYER GROUP'}</div><h3>${esc(group.name)}</h3><p>${group.players.map(esc).join(' · ')}</p></div><span class="group-count">${group.players.length}人</span></div><div class="group-actions"><button class="btn quiet" data-load-group="${group.id}">呼び出す</button><button class="btn primary" data-quick-group="${group.id}">${group.players.length===1?'Quick Solo':'Quick Party 3R'}</button></div></article>`).join('')}</section>`:''}
    <section class="panel"><div id="playerList" class="stack"></div><div class="actions"><button class="btn quiet" id="addPlayer">プレイヤー追加</button><button class="btn primary" id="savePlayers">保存</button></div></section>
    <div class="section-head"><h2>Play</h2><span class="muted">おすすめは Party</span></div>
    <section class="mode-grid"><button class="mode-card featured" id="partyMode" ${session.players.length<2?'disabled':''}><div class="mode-kicker">PARTY</div><h3>${session.players.length<2?'2人以上でParty':'総合戦を組む'}</h3><p>${session.players.length<2?'1人のときは下のSingleゲームを遊べます。':'3 / 6 / 9ラウンド。遊ぶゲームを選んで、その場に合う構成にできます。'}</p><span class="text-link">${session.players.length<2?'プレイヤーを追加すると利用可能':'手動で設定 →'}</span></button><div class="mode-card static"><div class="mode-kicker">SINGLE</div><h3>1ゲームだけ遊ぶ</h3><p>${session.players.length===1?'1人向けゲームで自己ベストを狙えます。':'下の一覧から選択。先に5点取ったプレイヤーが勝ちです。'}</p></div></section>
    ${session.players.length>=2?`<section class="smart-party-home"><div><div class="eyebrow">SMART PARTY</div><h3>この${session.players.length}人に合わせて自動構成</h3><p>最近遊んだゲームを避け、人数・お気に入り・評価・Game Health・カテゴリの偏りを見て組みます。</p></div><div class="smart-round-buttons">${[3,6,9].map(rounds=>`<button class="btn ${rounds===3?'primary':'quiet'}" data-smart-rounds="${rounds}">${rounds}R</button>`).join('')}</div></section>`:''}
    ${partyPresets.length?`<div class="section-head"><h2>Saved Parties</h2><button class="section-action" id="manageSavedParties">管理</button></div><section class="saved-party-list">${partyPresets.map(preset=>{const presetGames=preset.schedule.map(id=>byId.get(id)).filter(Boolean),info=summarizeSmartParty(presetGames);return`<article class="saved-party-card"><div><div class="eyebrow">FIXED ORDER</div><h3>${esc(preset.name)}</h3><p>${presetGames.map(game=>game.emoji+' '+game.title).join(' → ')}</p><small>${preset.schedule.length}R · 約${info.totalMinutes}分</small></div><button class="btn primary" data-start-saved-party="${preset.id}">同じ順番で開始</button></article>`}).join('')}</section>`:''}
    ${recentParties.length?`<div class="section-head"><h2>Recent Parties</h2><button class="section-action" id="partyHistory">履歴を見る</button></div><section class="party-history-home">${recentParties.map(entry=>{const winners=entry.winners.map(index=>entry.players[index]).filter(Boolean),entryGames=entry.schedule.map(id=>byId.get(id)).filter(Boolean);return`<button class="party-history-home-row" data-party-history="${entry.id}"><span><b>${winners.length?winners.map(esc).join(' & ')+' 勝利':'Party結果'}</b><small>${entry.players.map(esc).join(' · ')} · ${entry.schedule.length}R</small><small>${entryGames.slice(0,4).map(game=>game.emoji).join(' ')}${entryGames.length>4?' …':''}</small></span><span class="recommend-arrow">→</span></button>`}).join('')}</section>`:''}
    ${!isStandalone()?`<section class="install-card"><div><div class="eyebrow">INSTALL</div><h3>ホーム画面から起動する</h3><p>${isIOS()?'Safariの共有ボタン →「ホーム画面に追加」で、アプリのように独立起動できます。':'対応ブラウザではParty Pocketを端末へインストールできます。'}</p></div><button class="btn quiet" id="installApp">${installReady&&canPromptInstall()?'インストール':'追加方法'}</button></section>`:''}
    ${!isOnline()?'<div class="offline-banner">OFFLINE · キャッシュ済みゲームはそのまま遊べます</div>':''}
    ${updateRegistration?'<section class="update-card"><div><div class="eyebrow">UPDATE READY</div><b>新しいParty Pocketがあります</b></div><button class="btn primary" id="applyUpdate">更新する</button></section>':''}
    ${session.players.length===1&&dailyGame?`<section class="solo-daily ${daily.cleared?'cleared':''}"><div><div class="eyebrow">DAILY SOLO · ${soloDifficultyLabel(daily.difficulty).toUpperCase()}</div><h3>${dailyGame.emoji} ${dailyGame.title}</h3><p>${soloDifficultyLabel(daily.difficulty)} · ${soloDifficultyDetail(daily.gameId,daily.difficulty)}。 ${daily.maxRounds}ラウンド以内に5点到達でクリア。</p><div class="solo-daily-meta"><span>${daily.cleared?'今日クリア済み':'今日の挑戦'}</span><span>連続 ${daily.streak}日</span><span>Solo完走 ${soloSummary.totalClears}回</span></div></div><button class="btn primary" id="dailySolo">${daily.cleared?'もう一度':'挑戦する'}</button></section><div class="section-head"><h2>Solo Progress</h2><span class="muted">難易度別ベスト</span></div><section class="solo-progress-list">${SOLO_GAME_IDS.map(id=>{const game=byId.get(id),progress=soloProgress.game(id),easy=progress?.difficulties?.easy,normal=progress?.difficulties?.normal,hard=progress?.difficulties?.hard;return`<button class="solo-progress-row" data-game="${id}"><span class="recommend-symbol">${game?.emoji||''}</span><span><b>${esc(game?.title||id)}</b><small>E ${easy?.bestRounds??'—'}R · N ${normal?.bestRounds??'—'}R · H ${hard?.bestRounds??'—'}R · 完走 ${progress?.clears||0}回</small></span><span class="recommend-arrow">→</span></button>`}).join('')}</section>`:''}
    <section class="playtest-entry"><div><div class="eyebrow">PLAYTEST LAB</div><h3>24ゲームの弱点を見る</h3><p>面白さ・分かりやすさ・頭を使う度・再プレイ意向を端末内で集計します。</p></div><button class="btn quiet" id="playtestLab">評価を見る</button></section>
    <section class="playtest-entry stats-entry"><div><div class="eyebrow">LOCAL STATS</div><h3>プレイ履歴と勝率を見る</h3><p>Singleの完走とParty各ラウンドを記録し、プレイヤー別・ゲーム別に集計します。</p></div><button class="btn quiet" id="statsDashboard">成績を見る</button></section>
    <section class="playtest-entry season-entry"><div><div class="eyebrow">SEASON BOARD · ${esc(currentSeason.label)}</div><h3>${currentSeason.rows.length?`${esc(currentSeason.rows[0].name)}が${currentSeason.rows[0].wins}勝で首位`:'今月のランキングを始める'}</h3><p>${currentSeason.totalPlays}試合 · ${currentSeason.partySessions} Party · ${currentSeason.players} players。前月との差も自動比較します。</p></div><button class="btn quiet" id="seasonBoard">月間順位</button></section>
    <section class="playtest-entry achievement-entry"><div><div class="eyebrow">ACHIEVEMENTS</div><h3>${achievementData.unlocked} badges unlocked</h3><p>${achievementData.players?`${achievementData.players}人の実績を履歴から自動判定。${achievementData.leader?` 現在トップは${esc(achievementData.leader.name)}の${achievementData.leader.unlocked}個。`:''}`:'プレイすると実績と次のMilestoneが自動で増えていきます。'}</p></div><button class="btn quiet" id="achievements">実績を見る</button></section>
    <section class="playtest-entry health-entry"><div><div class="eyebrow">GAME HEALTH</div><h3>改善すべきゲームを自動検出</h3><p>プレイ回数・勝率・4軸評価を統合し、問題の種類と次の改善アクションを出します。</p></div><button class="btn quiet" id="gameHealth">分析を見る</button></section>
    <section class="playtest-entry improvement-entry"><div><div class="eyebrow">IMPROVEMENT QUEUE</div><h3>${improvementSummary.testing} testing · ${improvementSummary.planned} planned</h3><p>HealthやContext Signalから改善実験を作り、PLANNED → TESTING → DONEまで追跡します。</p></div><button class="btn quiet" id="improvementQueue">実験を見る</button></section>
    <section class="playtest-entry learning-entry"><div><div class="eyebrow">EXPERIMENT LEARNINGS</div><h3>${learningSummary.completed?`${learningSummary.improved}/${learningSummary.completed} improved`:'完了実験から学びを蓄積'}</h3><p>${learningSummary.completed?`改善率 ${Math.round((learningSummary.successRate||0)*100)}% · 平均Quality差 ${Number.isFinite(learningSummary.averageQualityDelta)?(learningSummary.averageQualityDelta>0?'+':'')+learningSummary.averageQualityDelta.toFixed(1):'—'}`:'Before/After評価が完了すると、効いた改善と失敗した改善を横断比較できます。'}</p></div><button class="btn quiet" id="experimentLearnings">学びを見る</button></section>
    <section class="playtest-entry data-entry"><div><div class="eyebrow">DATA VAULT</div><h3>端末データをバックアップ</h3><p>プレイヤー・履歴・評価・お気に入り・Solo進捗をJSONへ保存し、別端末でも復元できます。</p></div><button class="btn quiet" id="dataVault">管理する</button></section>
    <div class="section-head"><h2>For this group</h2><span class="muted">${session.players.length}人向け</span></div>
    <section class="recommend-grid" id="recommendGrid">${recommendedGames(games,session.players.length).map(recommendationHtml).join('')}</section>
    ${favoriteGames.length?`<div class="section-head"><h2>Favorites</h2><span class="muted">${favoriteGames.length} games</span></div><section class="library-list" id="favoriteList">${favoriteGames.map(libraryRowHtml).join('')}</section>`:''}
    ${recentGames.length?`<div class="section-head"><h2>Recent</h2><span class="muted">最近遊んだ</span></div><section class="library-list" id="recentList">${recentGames.map(libraryRowHtml).join('')}</section>`:''}
    <div class="section-head"><h2>Games</h2><span class="muted" id="catalogCount">${games.length} titles</span></div>
    <section class="catalog-tools"><input id="gameSearch" type="search" inputmode="search" placeholder="ゲーム名・特徴で検索" aria-label="ゲーム検索"><div class="catalog-chips">${CATEGORY_DEFS.map(category=>`<button class="catalog-chip ${category.id==='all'?'active':''}" data-catalog-category="${category.id}">${category.label}</button>`).join('')}</div><div class="smart-filter-grid"><label><span>難易度</span><select id="difficultyFilter"><option value="all">指定なし</option><option value="1">かるめ</option><option value="2">標準</option><option value="3">しっかり</option></select></label><label><span>時間</span><select id="timeFilter"><option value="all">指定なし</option><option value="3">3分以内</option><option value="5">5分以内</option><option value="8">8分以内</option><option value="10">10分以内</option></select></label></div><button class="catalog-chip active-fit" id="recommendedOnly" aria-pressed="true">この${session.players.length}人におすすめだけ</button><button class="btn primary full picker-button" id="pickOne">この条件で1本選ぶ</button><button class="btn quiet full" id="buildPartyFromFilter" ${session.players.length<2?'disabled':''}>この条件でSmart Party</button><div class="picker-result" id="pickerResult" hidden></div></section>
    <section class="games" id="gameCatalog"></section>
    <div class="catalog-empty" id="catalogEmpty" hidden>条件に合うゲームがありません。</div>
    <div class="footer">Party Pocket · local play on GitHub Pages</div>`;

    renderPlayers();
    app.querySelector('#addPlayer').onclick=()=>{
      if(draftPlayers.length>=8)return toast('最大8人です');
      draftPlayers.push(`プレイヤー${draftPlayers.length+1}`);
      renderPlayers();
    };
    app.querySelector('#savePlayers').onclick=()=>saveDraft();
    app.querySelector('#manageGroups').onclick=()=>{saveDraft({quiet:true});renderPlayerGroups()};
    app.querySelectorAll('[data-load-group]').forEach(button=>button.onclick=()=>{
      const group=playerGroups.get(button.dataset.loadGroup);if(!group)return;
      session.savePlayers(group.players);playerGroups.touch(group.id);renderHome();toast(group.name+'を呼び出しました');
    });
    app.querySelectorAll('[data-quick-group]').forEach(button=>button.onclick=()=>{
      const group=playerGroups.get(button.dataset.quickGroup);if(!group)return;
      session.savePlayers(group.players);playerGroups.touch(group.id);
      if(group.players.length===1){
        const dailySolo=soloProgress.daily();
        session.startSingle();
        return startGame(dailySolo.gameId,{difficulty:dailySolo.difficulty});
      }
      return startSmartParty(3,{players:group.players});
    });
    app.querySelector('#partyMode').onclick=()=>{
      if(session.players.length<2)return toast('Partyは2人以上で遊べます');
      saveDraft({quiet:true});
      renderPartySetup();
    };
    app.querySelectorAll('[data-smart-rounds]').forEach(button=>button.onclick=()=>{
      saveDraft({quiet:true});
      startSmartParty(+button.dataset.smartRounds);
    });
    app.querySelector('#manageSavedParties')?.addEventListener('click',renderSavedParties);
    app.querySelector('#partyHistory')?.addEventListener('click',renderPartyHistory);
    app.querySelectorAll('[data-party-history]').forEach(button=>button.onclick=()=>renderPartyHistoryDetail(button.dataset.partyHistory));
    app.querySelectorAll('[data-start-saved-party]').forEach(button=>button.onclick=()=>{
      const preset=savedParties.get(button.dataset.startSavedParty,validIds);if(!preset)return;
      savedParties.touch(preset.id);
      startTrackedSchedule(preset.schedule);
      renderPartyIntermission(true);
    });
    app.querySelector('#installApp')?.addEventListener('click',async()=>{
      if(canPromptInstall()){
        const accepted=await requestInstall();
        if(!accepted)toast('インストールはキャンセルされました');
        return;
      }
      if(isIOS())toast('Safariの共有ボタン → ホーム画面に追加');
      else toast('ブラウザのメニューから「アプリをインストール」を選んでください');
    });
    app.querySelector('#applyUpdate')?.addEventListener('click',()=>{
      const waiting=updateRegistration?.waiting;
      if(waiting){
        toast('更新を適用します');
        waiting.postMessage({type:'SKIP_WAITING'});
      }
    });
    app.querySelector('#dailySolo')?.addEventListener('click',()=>renderGameDetail(daily.gameId,daily.difficulty));
    if(app.querySelector('.solo-progress-list'))bindGameLaunch(app.querySelector('.solo-progress-list'));
    app.querySelector('#playtestLab').onclick=renderPlaytestLab;
    app.querySelector('#statsDashboard').onclick=renderStatsDashboard;
    app.querySelector('#seasonBoard').onclick=()=>renderSeasonBoard(currentSeasonKey());
    app.querySelector('#achievements').onclick=renderAchievements;
    app.querySelector('#gameHealth').onclick=renderGameHealth;
    app.querySelector('#improvementQueue').onclick=renderImprovementQueue;
    app.querySelector('#experimentLearnings').onclick=renderExperimentLearnings;
    app.querySelector('#dataVault').onclick=renderDataVault;

    const catalogState=createCatalogState(session.players.length);
    const catalogIndex=new Map(games.map((game,index)=>[game.id,index]));

    function paintCatalog(){
      const filtered=filterGames(games,catalogState);
      const catalog=app.querySelector('#gameCatalog'),empty=app.querySelector('#catalogEmpty');
      catalog.innerHTML=filtered.map(game=>gameCardHtml(game,catalogIndex.get(game.id))).join('');
      empty.hidden=filtered.length!==0;
      app.querySelector('#catalogCount').textContent=`${filtered.length} / ${games.length}`;
      app.querySelectorAll('[data-catalog-category]').forEach(button=>button.classList.toggle('active',button.dataset.catalogCategory===catalogState.category));
      bindGameLaunch(catalog);
    }

    app.querySelector('#gameSearch').oninput=event=>{catalogState.query=event.target.value;paintCatalog()};
    app.querySelector('#difficultyFilter').onchange=event=>{catalogState.difficulty=event.target.value;paintCatalog()};
    app.querySelector('#timeFilter').onchange=event=>{catalogState.maxMinutes=event.target.value;paintCatalog()};
    app.querySelectorAll('[data-catalog-category]').forEach(button=>button.onclick=()=>{
      catalogState.category=button.dataset.catalogCategory;
      paintCatalog();
    });
    app.querySelector('#recommendedOnly').onclick=event=>{
      catalogState.recommendedOnly=!catalogState.recommendedOnly;
      event.currentTarget.classList.toggle('active-fit',catalogState.recommendedOnly);
      event.currentTarget.setAttribute('aria-pressed',String(catalogState.recommendedOnly));
      paintCatalog();
    };
    app.querySelector('#buildPartyFromFilter').onclick=()=>{
      if(session.players.length<2)return toast('Partyは2人以上で遊べます');
      const allowed=filterGames(games,catalogState).map(game=>game.id);
      if(allowed.length<2)return toast('この条件ではPartyを組めません');
      const rounds=smartPartyRoundsForCatalog(allowed.length);
      renderSmartPartyPreview(rounds,{allowedGameIds:allowed});
    };
    app.querySelector('#pickOne').onclick=()=>{
      const picked=pickGame(games,catalogState),box=app.querySelector('#pickerResult');
      if(!picked){box.hidden=true;return toast('この条件に合うゲームがありません')}
      const meta=gameMeta(picked.id);
      box.hidden=false;
      box.innerHTML=`<div><div class="eyebrow">SMART PICK</div><b>${picked.emoji} ${picked.title}</b><small>${difficultyLabel(meta.difficulty)} · 約${meta.minutes}分 · ${playerRangeLabel(meta)}推奨</small></div><button class="btn primary" data-game="${picked.id}">これで遊ぶ</button>`;
      bindGameLaunch(box);
    };

    bindGameLaunch(app.querySelector('#recommendGrid'));
    if(app.querySelector('#favoriteList'))bindGameLaunch(app.querySelector('#favoriteList'));
    if(app.querySelector('#recentList'))bindGameLaunch(app.querySelector('#recentList'));
    paintCatalog();

    app.querySelector('#resumeParty')?.addEventListener('click',()=>{
      if(session.resumeParty()){
        draftPlayers=[...session.players];
        renderPartyIntermission(false,null,true);
      }
    });
    app.querySelector('#discardParty')?.addEventListener('click',()=>{
      session.clearSavedParty();
      partyHistory.abandon();
      renderHome();
    });
  }

  function refreshIfVisible(){
    if(app.querySelector('.hero'))renderHome();
  }

  function setInstallReady(value){
    installReady=Boolean(value);
    refreshIfVisible();
  }

  function setUpdateRegistration(registration){
    updateRegistration=registration||null;
    refreshIfVisible();
  }

  return{
    renderHome,
    saveDraft,
    refreshIfVisible,
    setInstallReady,
    setUpdateRegistration
  };
}
