import {getGame,listGames} from '../../core/registry.js';
import {categoryLabel,difficultyLabel,gameMeta,playerRangeLabel} from '../../core/catalog.js';
import {winnerIndexesFromScores} from '../../core/stats.js';
import {buildHealthReport} from '../../core/health.js';
import {SOLO_GAME_IDS,normalizeSoloDifficulty,soloDifficultyLabel} from '../../core/solo.js';
import {
  buildSmartParty,
  buildSmartPartyWithLocks,
  recentGameIdsForPlayers,
  replaceSmartPartyGame,
  smartPartyReasons,
  summarizeSmartParty
} from '../../core/recommender.js';
import {escapeHtml as esc} from '../../ui/presentation.js';

export function partyPresetMap(){
  return{
    brain:['code','logic','ev','auction','sniper','portfolio','priority','triad'],
    strategy:['auction','ev','grid','allocation','portfolio','frontline','priority','sequence','isolation','gate','triad','bomb','ten'],
    foresight:['sequence','frontline','priority','grid','auction','isolation','gate','triad'],
    perfect:['isolation','gate','triad','grid'],
    read:['sync','minority','sniper','bomb','auction','sequence'],
    talk:['taboo','sync','five','minority'],
    quick:['five','clock','ten','bomb']
  };
}

export function createPartyPlayFlow({
  app,
  session,
  partySettings,
  library,
  playtests,
  stats,
  soloProgress,
  partyHistory,
  savedParties,
  updateBadge,
  toast,
  renderHome,
  playtestPromptHtml,
  bindPlaytest,
  rankingHtml,
  partyRecapHtml,
  sharePartyCard,
  soloDifficultyDetail
}){
  let activeCleanup=null;
  let lastSingleGameId=null;
  let soloRun=null;
  let lastSoloResult=null;
  let lastPartyRecap=null;

  function disposeActiveGame(){
    try{activeCleanup?.()}
    finally{activeCleanup=null}
  }

  function smartPartyInputs(players=session.players,allowedGameIds=null){
    const games=listGames(),ids=games.map(game=>game.id),playtestRows=playtests.report(ids),statReport=stats.report(ids);
    const health=buildHealthReport(ids,playtestRows,statReport.gameStats);
    return{
      games,
      options:{
        playerCount:players.length,
        favoriteIds:library.favorites(ids),
        recentIds:recentGameIdsForPlayers(stats.history(),players,8),
        playtestRows,
        healthRows:health.games,
        allowedGameIds
      }
    };
  }

  function smartPartyPlan(rounds,{players=session.players,allowedGameIds=null}={}){
    const {games,options}=smartPartyInputs(players,allowedGameIds);
    return buildSmartParty(games,{...options,rounds});
  }

  function startSmartParty(rounds,{players=session.players,allowedGameIds=null}={}){
    if(players.length<2)return toast('Smart Partyは2人以上で遊べます');
    if(players.join('\u0000')!==session.players.join('\u0000'))session.savePlayers(players);
    renderSmartPartyPreview(rounds,{players:[...players],allowedGameIds});
  }

  function startTrackedParty(gameIds,totalRounds){
    session.startParty(gameIds,totalRounds);
    partyHistory.begin({players:[...session.players],schedule:[...session.party.schedule]});
    lastPartyRecap=null;
  }

  function startTrackedSchedule(schedule){
    session.startPartySchedule(schedule);
    partyHistory.begin({players:[...session.players],schedule:[...session.party.schedule]});
    lastPartyRecap=null;
  }

  function renderSmartPartyPreview(rounds,{players=session.players,allowedGameIds=null}={}){
    disposeActiveGame();
    if(players.length<2)return renderHome();
    if(players.join('\u0000')!==session.players.join('\u0000'))session.savePlayers(players);

    const {games,options}=smartPartyInputs(players,allowedGameIds);
    const initial=buildSmartParty(games,{...options,rounds});
    if(initial.length<2){toast('Smart Partyを組めませんでした');return renderHome()}

    const state={plan:initial,locked:new Set()};

    function paint(){
      const info=summarizeSmartParty(state.plan);
      updateBadge('SMART PARTY');
      app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="smartBack">←</button><div><div class="eyebrow">SMART PARTY PREVIEW</div><div class="screen-title">${state.plan.length}ラウンドを確認</div></div></div>
      <section class="smart-preview-summary"><div><b>${state.plan.length}</b><span>rounds</span></div><div><b>約${info.totalMinutes}</b><span>minutes</span></div><div><b>${info.categories.length}</b><span>categories</span></div></section>
      <div class="lab-note">Lockしたゲームは「全部組み直す」でも残ります。↑↓で実際のプレイ順を変更できます。</div>
      <section class="smart-preview-list">${state.plan.map((game,index)=>{
        const meta=gameMeta(game.id);
        const rawReasons=smartPartyReasons(game,options).filter(reason=>reason!=='最近プレイ済み');
        const reasons=rawReasons.length?rawReasons:['全体バランス'];
        return`<article class="smart-preview-row ${state.locked.has(game.id)?'locked':''}">
          <div class="smart-order">${String(index+1).padStart(2,'0')}</div>
          <div class="smart-preview-main"><div class="smart-preview-title"><span>${game.emoji}</span><b>${esc(game.title)}</b></div><small>${difficultyLabel(meta.difficulty)} · 約${meta.minutes}分 · ${playerRangeLabel(meta)}推奨</small><div class="smart-reasons">${reasons.slice(0,3).map(reason=>`<span>${esc(reason)}</span>`).join('')}</div></div>
          <div class="smart-preview-actions"><button class="mini-btn" data-move-up="${game.id}" ${index===0?'disabled':''}>↑</button><button class="mini-btn" data-move-down="${game.id}" ${index===state.plan.length-1?'disabled':''}>↓</button><button class="mini-btn ${state.locked.has(game.id)?'active':''}" data-lock-game="${game.id}">${state.locked.has(game.id)?'LOCKED':'LOCK'}</button><button class="mini-btn" data-reroll-game="${game.id}" ${state.locked.has(game.id)?'disabled':''}>入替</button></div>
        </article>`;
      }).join('')}</section>
      <section class="smart-preview-footer"><div class="smart-preview-categories">${info.categories.map(id=>`<span>${esc(categoryLabel(id))}</span>`).join('')}</div><div class="smart-preview-buttons"><button class="btn quiet" id="rebuildSmart" ${state.locked.size===state.plan.length?'disabled':''}>全部組み直す</button><button class="btn primary" id="confirmSmart">この順番で開始</button></div></section>`;

      app.querySelector('#smartBack').onclick=renderHome;
      app.querySelectorAll('[data-lock-game]').forEach(button=>button.onclick=()=>{
        const id=button.dataset.lockGame;
        state.locked.has(id)?state.locked.delete(id):state.locked.add(id);
        paint();
      });
      app.querySelectorAll('[data-move-up]').forEach(button=>button.onclick=()=>{
        const index=state.plan.findIndex(game=>game.id===button.dataset.moveUp);
        if(index<=0)return;
        [state.plan[index-1],state.plan[index]]=[state.plan[index],state.plan[index-1]];
        paint();
      });
      app.querySelectorAll('[data-move-down]').forEach(button=>button.onclick=()=>{
        const index=state.plan.findIndex(game=>game.id===button.dataset.moveDown);
        if(index<0||index>=state.plan.length-1)return;
        [state.plan[index+1],state.plan[index]]=[state.plan[index],state.plan[index+1]];
        paint();
      });
      app.querySelectorAll('[data-reroll-game]').forEach(button=>button.onclick=()=>{
        const id=button.dataset.rerollGame;
        if(state.locked.has(id))return;
        const replacement=replaceSmartPartyGame(games,state.plan.map(game=>game.id),id,options);
        if(!replacement)return toast('これ以上候補がありません');
        const index=state.plan.findIndex(game=>game.id===id);
        state.plan[index]=replacement;
        paint();
      });
      app.querySelector('#rebuildSmart').onclick=()=>{
        const lockedIds=state.plan.filter(game=>state.locked.has(game.id)).map(game=>game.id);
        const rebuilt=buildSmartPartyWithLocks(games,{...options,rounds:state.plan.length,lockedIds});
        const unlocked=rebuilt.filter(game=>!state.locked.has(game.id));
        let cursor=0;
        state.plan=state.plan.map(game=>state.locked.has(game.id)?game:unlocked[cursor++]).filter(Boolean);
        paint();
      };
      app.querySelector('#confirmSmart').onclick=()=>{
        startTrackedSchedule(state.plan.map(game=>game.id));
        renderPartyIntermission(true);
      };
    }

    paint();
  }

  function renderPartySetup(){
    disposeActiveGame();
    const games=listGames(),ids=games.map(game=>game.id),saved=partySettings.load(ids);
    const state={rounds:saved.rounds,selected:new Set(saved.gameIds)};
    const presets={all:ids,...partyPresetMap()};

    function paint(){
      updateBadge('PARTY SETUP');
      app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="setupBack">←</button><div><div class="eyebrow">PARTY SETUP</div><div class="screen-title">総合戦を組む</div></div></div>
      <section class="panel setup-section"><div class="setup-label">ラウンド数</div><div class="segmented">${[3,6,9].map(roundCount=>`<button class="segment ${state.rounds===roundCount?'active':''}" data-rounds="${roundCount}">${roundCount}</button>`).join('')}</div><p class="helper">短く試すなら3、標準は6、しっかり遊ぶなら9。</p></section>
      <section class="panel setup-section smart-setup"><div><div class="eyebrow">SMART BUILD</div><div class="setup-label">自動で${state.rounds}本選ぶ</div><p class="helper">人数・履歴・お気に入り・評価・健全性・カテゴリ多様性から構成します。</p></div><button class="btn primary" id="smartBuild">Smart構成</button></section>
      <section class="panel setup-section"><div class="setup-label">プリセット</div><div class="preset-row"><button class="preset-btn" data-preset="all">バランス</button><button class="preset-btn" data-preset="brain">頭脳戦</button><button class="preset-btn" data-preset="strategy">戦略</button><button class="preset-btn" data-preset="foresight">先読み</button><button class="preset-btn" data-preset="perfect">完全情報</button><button class="preset-btn" data-preset="read">読み合い</button><button class="preset-btn" data-preset="talk">会話中心</button><button class="preset-btn" data-preset="quick">短時間</button></div></section>
      <section class="panel setup-section"><div class="setup-head"><div class="setup-label">ゲーム選択</div><span>${state.selected.size}/${games.length}</span></div><div class="select-games">${games.map((game,index)=>`<button class="select-game ${state.selected.has(game.id)?'selected':''}" data-select-game="${game.id}" aria-pressed="${state.selected.has(game.id)}"><span class="game-index">${String(index+1).padStart(2,'0')}</span><span class="select-title">${game.title}</span><span class="select-check">${state.selected.has(game.id)?'選択中':'除外'}</span></button>`).join('')}</div><p class="helper">2ゲーム以上を選択してください。ゲーム数よりラウンド数が多い場合は重複して登場します。</p></section>
      <button class="btn primary full" id="startParty">${state.rounds}ラウンドで開始</button>`;

      app.querySelector('#setupBack').onclick=renderHome;
      app.querySelectorAll('[data-rounds]').forEach(button=>button.onclick=()=>{state.rounds=+button.dataset.rounds;paint()});
      app.querySelector('#smartBuild').onclick=()=>{
        const plan=smartPartyPlan(state.rounds);
        state.selected=new Set(plan.map(game=>game.id));
        paint();
        toast('Smart構成を作りました');
      };
      app.querySelectorAll('[data-preset]').forEach(button=>button.onclick=()=>{
        state.selected=new Set(presets[button.dataset.preset].filter(id=>ids.includes(id)));
        paint();
      });
      app.querySelectorAll('[data-select-game]').forEach(button=>button.onclick=()=>{
        const id=button.dataset.selectGame;
        state.selected.has(id)?state.selected.delete(id):state.selected.add(id);
        paint();
      });
      app.querySelector('#startParty').onclick=()=>{
        if(state.selected.size<2)return toast('2ゲーム以上を選択してください');
        const selected=games.map(game=>game.id).filter(id=>state.selected.has(id));
        partySettings.save({rounds:state.rounds,gameIds:selected},ids);
        startTrackedParty(selected,state.rounds);
        renderPartyIntermission(true);
      };
    }

    paint();
  }

  function renderScorebar(current=-1){
    document.querySelectorAll('[data-scorebar]').forEach(bar=>{
      bar.innerHTML=session.players.map((name,index)=>`<div class="score ${index===current?'current':''}"><span>${esc(name)}</span><b>${session.scores[index]||0}</b></div>`).join('');
    });
  }

  function startGame(id,{difficulty='normal'}={}){
    disposeActiveGame();
    const game=getGame(id);if(!game)return renderHome();
    library.touchRecent(id);
    if(session.mode==='single')lastSingleGameId=id;
    const soloDifficulty=normalizeSoloDifficulty(difficulty);
    if(session.mode==='single'&&session.players.length===1&&SOLO_GAME_IDS.includes(id)){
      soloRun={gameId:id,difficulty:soloDifficulty,rounds:0,currentStreak:0,maxStreak:0,lastScore:0};
      lastSoloResult=null;
    }else if(session.mode==='single'){
      soloRun=null;
      lastSoloResult=null;
    }

    updateBadge(session.mode==='party'?`Round ${session.party.round+1}/${session.party.totalRounds}`:soloRun?`Solo · ${soloDifficultyLabel(soloDifficulty)}`:'First to 5');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="backButton">←</button><div class="game-heading"><span class="game-symbol small">${game.emoji}</span><div><div class="eyebrow">${session.mode==='party'?'PARTY ROUND':soloRun?`SINGLE GAME · ${soloDifficultyLabel(soloRun.difficulty).toUpperCase()}`:'SINGLE GAME'}</div><div class="screen-title">${game.title}</div></div></div></div><div class="scorebar" data-scorebar></div><section class="stage" id="gameStage"></section>`;
    app.querySelector('#backButton').onclick=renderHome;
    renderScorebar();

    const ctx={
      root:app.querySelector('#gameStage'),
      session,
      esc,
      toast,
      renderScorebar,
      soloDifficulty:soloRun?.difficulty||'normal',
      completeRound:restart=>completeRound(restart)
    };
    activeCleanup=game.mount(ctx)||null;
  }

  function completeRound(restart){
    renderScorebar();
    if(session.mode==='single'){
      if(soloRun&&soloRun.gameId===lastSingleGameId){
        soloRun.rounds++;
        const gain=(session.scores[0]||0)-soloRun.lastScore;
        soloRun.currentStreak=gain>0?soloRun.currentStreak+1:0;
        soloRun.maxStreak=Math.max(soloRun.maxStreak,soloRun.currentStreak);
        soloRun.lastScore=session.scores[0]||0;
      }
      if(Math.max(...session.scores)>=5){
        const winners=session.winnerIndexes(false);
        stats.record({
          gameId:lastSingleGameId,
          mode:'single',
          players:[...session.players],
          scores:[...session.scores],
          winners,
          difficulty:soloRun?.difficulty||null,
          clearRounds:soloRun?.rounds||null
        });
        if(soloRun){
          soloProgress.recordRun(lastSingleGameId,{
            difficulty:soloRun.difficulty,
            rounds:soloRun.rounds,
            maxStreak:soloRun.maxStreak,
            completed:true
          });
          lastSoloResult={
            gameId:lastSingleGameId,
            difficulty:soloRun.difficulty,
            rounds:soloRun.rounds,
            maxStreak:soloRun.maxStreak,
            game:soloProgress.game(lastSingleGameId,soloRun.difficulty),
            daily:soloProgress.daily()
          };
        }
        disposeActiveGame();
        return renderWinner(false,lastSingleGameId);
      }
      return restart();
    }

    const completedGameId=session.currentPartyGame(),result=session.finishPartyRound();
    const roundWinners=winnerIndexesFromScores(result.awards);
    stats.record({
      gameId:completedGameId,
      mode:'party',
      players:[...session.players],
      scores:[...result.awards],
      winners:roundWinners
    });
    partyHistory.recordRound({
      players:[...session.players],
      schedule:[...session.party.schedule],
      gameId:completedGameId,
      gameScores:[...result.gameScores],
      awards:[...result.awards],
      cumulativeScores:[...session.partyScores],
      winners:roundWinners
    });
    disposeActiveGame();

    if(result.finished){
      lastPartyRecap=partyHistory.complete({
        finalScores:[...session.partyScores],
        winners:session.winnerIndexes(true)
      });
      return renderWinner(true,completedGameId);
    }
    renderPartyIntermission(false,result,false,completedGameId);
  }

  function renderPartyIntermission(first=false,result=null,resuming=false,completedGameId=null){
    const nextId=session.currentPartyGame(),game=getGame(nextId),progress=session.party.round/session.party.totalRounds*100;
    updateBadge(`Round ${session.party.round+1}/${session.party.totalRounds}`);
    const awardHtml=result?`<section class="card result-card"><div class="eyebrow">ROUND RESULT</div><div class="result-list">${session.players.map((name,index)=>`<div class="result-row"><span>${esc(name)}</span><span>+${result.awards[index]} Party pt</span></div>`).join('')}</div></section>`:'';
    const resumeNote=resuming?'<div class="notice">保存地点から再開しました。途中だったラウンドは最初から始まります。</div>':'';

    app.innerHTML=`<section class="panel party-board"><div class="eyebrow">PARTY</div><div class="prompt compact">${first?'構成完了':resuming?'ゲームを再開':'次のラウンド'}</div><div class="party-progress"><span style="width:${progress}%"></span></div>${resumeNote}${awardHtml}${completedGameId?playtestPromptHtml(completedGameId):''}<div class="standings"><div class="setup-label">Standings</div><div class="result-list">${rankingHtml(session.partyScores,'Party pt')}</div></div><div class="next-game"><div class="game-card-top"><span class="game-index">${String(session.party.round+1).padStart(2,'0')} / ${String(session.party.totalRounds).padStart(2,'0')}</span><span class="game-symbol">${game.emoji}</span></div><h3>${game.title}</h3><p>${game.description}</p></div><button class="btn primary full" id="partyNext">${first?'開始する':resuming?'このラウンドを始める':'次へ'}</button></section>`;
    if(completedGameId)bindPlaytest(completedGameId,{mode:'party',playerCount:session.players.length});
    app.querySelector('#partyNext').onclick=()=>startGame(nextId);
  }

  function renderWinner(isParty,ratingGameId=null){
    disposeActiveGame();
    const winners=session.winnerIndexes(isParty),scores=isParty?session.partyScores:session.scores;
    const completedSchedule=isParty?[...session.party.schedule]:[];
    updateBadge('RESULT');

    const soloResultHtml=!isParty&&lastSoloResult&&lastSoloResult.gameId===ratingGameId?`<section class="solo-result-card"><div class="eyebrow">SOLO RESULT · ${soloDifficultyLabel(lastSoloResult.difficulty).toUpperCase()}</div><div class="solo-result-difficulty">${soloDifficultyLabel(lastSoloResult.difficulty)} · ${soloDifficultyDetail(lastSoloResult.gameId,lastSoloResult.difficulty)}</div><div class="solo-result-grid"><div><b>${lastSoloResult.rounds}</b><span>クリアラウンド</span></div><div><b>${lastSoloResult.game.bestRounds??'—'}</b><span>この難易度のベスト</span></div><div><b>${lastSoloResult.maxStreak}</b><span>連続成功</span></div></div>${lastSoloResult.daily.gameId===ratingGameId&&lastSoloResult.daily.difficulty===lastSoloResult.difficulty&&lastSoloResult.daily.cleared?`<div class="solo-daily-clear">DAILY CLEAR · ${lastSoloResult.daily.streak}日連続</div>`:''}</section>`:'';
    const recapHtml=isParty&&lastPartyRecap?partyRecapHtml(lastPartyRecap,{compact:true}):'';
    const savePartyHtml=isParty?`<section class="party-save-card"><div><div class="eyebrow">SAVE THIS PARTY</div><b>この${completedSchedule.length}ラウンド構成を保存</b><small>ゲーム順もそのまま保存します。</small></div><div class="party-save-form"><input id="partyPresetName" maxlength="32" placeholder="例: 定番3本 / 頭脳戦ベスト"><button class="btn quiet" id="savePartyPreset">構成を保存</button></div></section>`:'';

    app.innerHTML=`<section class="panel winner"><div class="winner-mark">RESULT</div><div class="eyebrow">${isParty?'PARTY COMPLETE':'GAME COMPLETE'}</div><h2>${winners.map(index=>esc(session.players[index])).join(' & ')}</h2><p class="muted">${winners.length>1?'同点首位':'1位'}</p><div class="result-list">${rankingHtml(scores,isParty?'Party pt':'pt')}</div>${recapHtml}${isParty&&lastPartyRecap?'<div class="result-share-row"><button class="btn quiet full" id="sharePartyResult">Party結果を画像で共有</button></div>':''}${savePartyHtml}${soloResultHtml}${ratingGameId?playtestPromptHtml(ratingGameId):''}<div class="actions"><button class="btn quiet" id="homeResult">ホーム</button><button class="btn primary" id="againResult">もう一度</button></div></section>`;

    if(ratingGameId){
      bindPlaytest(ratingGameId,{
        mode:isParty?'party':'single',
        playerCount:session.players.length,
        difficulty:!isParty?lastSoloResult?.difficulty||null:null
      });
    }
    app.querySelector('#sharePartyResult')?.addEventListener('click',()=>sharePartyCard(lastPartyRecap));
    app.querySelector('#savePartyPreset')?.addEventListener('click',()=>{
      const name=app.querySelector('#partyPresetName').value.trim();
      if(!name)return toast('構成名を入力してください');
      try{
        savedParties.save(name,completedSchedule);
        toast(name+'を保存しました');
        app.querySelector('#savePartyPreset').textContent='保存済み';
      }catch(error){
        toast(error?.message||'保存できませんでした');
      }
    });
    app.querySelector('#homeResult').onclick=renderHome;
    app.querySelector('#againResult').onclick=()=>{
      if(isParty){
        startTrackedSchedule(completedSchedule);
        return renderPartyIntermission(true);
      }
      if(lastSingleGameId){
        const difficulty=lastSoloResult?.difficulty||'normal';
        session.startSingle();
        return startGame(lastSingleGameId,{difficulty});
      }
      renderHome();
    };
  }

  return{
    disposeActiveGame,
    smartPartyPlan,
    startSmartParty,
    startTrackedParty,
    startTrackedSchedule,
    renderSmartPartyPreview,
    renderPartySetup,
    renderScorebar,
    startGame,
    completeRound,
    renderPartyIntermission,
    renderWinner
  };
}
