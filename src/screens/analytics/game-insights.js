import {getGame,listGames} from '../../core/registry.js';
import {buildHealthReport} from '../../core/health.js';
import {SOLO_GAME_IDS,soloDifficultyLabel} from '../../core/solo.js';
import {buildGameInsights,gameInsightHeadline,trendLabel} from '../../core/game-insights.js';
import {buildPlaytestSegments,buildPlaytestTimeline,contextualPlaytestSignals} from '../../core/playtest-events.js';
import {buildSoloDifficultyAnalytics} from '../../core/solo-analytics.js';
import {experimentStatusLabel} from '../../core/improvement-queue.js';
import {buildLearnedRecommendations,contextNeed,healthNeed,learnedRecommendationLabel} from '../../core/learned-recommendations.js';
import {escapeHtml as esc,oneDecimal} from '../../ui/presentation.js';

export function healthStatusLabel(status){
  return status==='action'?'改善優先':status==='watch'?'要観察':status==='data'?'データ収集中':'健全';
}

export function insightAxisLabel(id){
  return id==='fun'?'面白さ':id==='clarity'?'分かりやすさ':id==='brain'?'頭を使う度':'もう一度遊びたい';
}

export function contextSignalText(signal){
  const axis=insightAxisLabel(signal.axis);
  const names={single:'Single',party:'Party',easy:'Easy',normal:'Normal',hard:'Hard'};
  return `${names[signal.low]||signal.low}の${axis}が${names[signal.high]||signal.high}より${signal.gap.toFixed(1)}低い`;
}

export function formatPlayedAt(at){
  try{return new Date(at).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
  catch{return''}
}

export function percent(value){
  return `${Math.round((Number(value)||0)*100)}%`;
}

export function createGameInsightsScreen({app,context}){
  const {
    playtests,
    playtestEvents,
    stats,
    soloProgress,
    improvementQueue
  }=context.stores;
  const {
    disposeActiveGame,
    renderHome,
    renderGameDetail,
    renderPlayerProfile
  }=context.routes;
  const {
    experimentWorkflow,
    updateBadge,
    toast,
    soloDifficultyDetail
  }=context.services;
  function gameInsightData(id){
    const ids=listGames().map(game=>game.id),playtest=playtests.get(id),report=stats.report(ids);
    const statRow=report.gameStats.find(row=>row.gameId===id);
    const health=buildHealthReport([id],[{gameId:id,...playtest}],statRow?[statRow]:[]).games[0];
    return buildGameInsights(id,stats.history(),playtest,health);
  }

  function renderGameInsights(id){
    disposeActiveGame();
    const game=getGame(id);if(!game)return renderHome();
    const eventRows=playtestEvents.forGame(id);
    const insight=gameInsightData(id);
    const timeline=buildPlaytestTimeline(id,eventRows);
    const segments=buildPlaytestSegments(id,eventRows);
    const contextSignals=contextualPlaytestSignals(segments);
    const experiments=improvementQueue.forGame(id);
    const learnedNeeds=[
      ...(insight.health?.issues||[]).map(healthNeed),
      ...contextSignals.map(signal=>contextNeed(signal,contextSignalText(signal)))
    ];
    const learned=buildLearnedRecommendations(id,learnedNeeds,improvementQueue.all());
    const soloAnalytics=SOLO_GAME_IDS.includes(id)?buildSoloDifficultyAnalytics(id,stats.history(),soloProgress.game(id)):null;
    const status=insight.health?.status||'data';

    updateBadge('GAME INSIGHTS');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="insightBack">←</button><div class="game-heading"><span class="game-symbol small">${game.emoji}</span><div><div class="eyebrow">GAME INSIGHTS</div><div class="screen-title">${esc(game.title)}</div></div></div></div>
    <section class="insight-hero ${status}"><div><div class="eyebrow">HEALTH / TREND</div><h2>${esc(gameInsightHeadline(insight))}</h2><p>${insight.current30} plays / 直近30日 · 前30日は ${insight.previous30} plays</p></div><span class="health-status ${status}">${healthStatusLabel(status)}</span></section>
    <section class="lab-summary insight-summary"><div><b>${insight.plays}</b><span>total plays</span></div><div><b>${insight.single}</b><span>Single</span></div><div><b>${insight.party}</b><span>Party</span></div><div><b>${trendLabel(insight)}</b><span>30日差</span></div></section>
    <div class="section-head compact-head"><h2>Mode Split</h2><span class="muted">完了試合のみ</span></div>
    <section class="mode-split"><div><span>Single</span><b>${Math.round(insight.singleShare*100)}%</b><i><em style="width:${Math.round(insight.singleShare*100)}%"></em></i></div><div><span>Party</span><b>${Math.round(insight.partyShare*100)}%</b><i><em style="width:${Math.round(insight.partyShare*100)}%"></em></i></div></section>
    <div class="section-head compact-head"><h2>Player Count</h2><span class="muted">何人で遊ばれたか</span></div>
    <section class="insight-buckets">${insight.playerCountBuckets.length?insight.playerCountBuckets.map(row=>`<div><b>${row.playerCount}人</b><span>${row.plays}回 · ${Math.round(row.share*100)}%</span></div>`).join(''):'<div class="catalog-empty">人数データがありません。</div>'}</section>
    ${soloAnalytics?`<div class="section-head compact-head"><h2>Solo Difficulty Records</h2><span class="muted">1人完走の効率</span></div>
    <section class="solo-analytics-grid">${soloAnalytics.rows.map(row=>`<article class="solo-analytics-card ${row.difficulty}"><div class="solo-analytics-title"><b>${soloDifficultyLabel(row.difficulty)}</b><span>${soloDifficultyDetail(id,row.difficulty)}</span></div><div class="solo-analytics-metrics"><div><b>${row.clears}</b><span>完走</span></div><div><b>${Number.isFinite(row.averageRounds)?oneDecimal(row.averageRounds)+'R':'—'}</b><span>平均R</span></div><div><b>${row.bestRounds??'—'}${row.bestRounds?'R':''}</b><span>最短</span></div><div><b>${Number.isFinite(row.averagePointsPerRound)?oneDecimal(row.averagePointsPerRound):'—'}</b><span>pt/R</span></div></div><small>ラウンド記録 ${row.roundTrackedRuns}件 · 最長連続成功 ${row.bestStreak}</small></article>`).join('')}</section>
    <div class="lab-note">完走数・最短記録はSolo Progressを利用。平均ラウンドとpt/Rはv8.27以降にStatsへ記録された完走のみで計算し、過去のラウンド数は推測しません。</div>`:''}
    <div class="section-head compact-head"><h2>Playtest</h2><span class="muted">新4軸評価 ${insight.reviews}件</span></div>
    <section class="insight-axes">${insight.axes.map(axis=>`<div><span>${insightAxisLabel(axis.id)}</span><b>${oneDecimal(axis.average)}</b><i><em style="width:${Number.isFinite(axis.average)?Math.round(axis.average/5*100):0}%"></em></i><small>${axis.count} responses</small></div>`).join('')}</section>
    <div class="section-head compact-head"><h2>Context Split</h2><span class="muted">実際の評価イベントのみ</span></div>
    <section class="context-segment-groups">
      <div class="context-segment-group"><div class="context-segment-label">MODE</div><div class="context-segment-grid">${segments.modeSegments.map(segment=>`<article class="context-segment-card"><div><b>${segment.label}</b><span>${segment.count} reviews</span></div><div class="context-axis-mini">${segment.axes.map(axis=>`<span><i>${insightAxisLabel(axis.id)}</i><b>${oneDecimal(axis.average)}</b></span>`).join('')}</div></article>`).join('')}</div></div>
      ${segments.difficultySegments.some(segment=>segment.count)?`<div class="context-segment-group"><div class="context-segment-label">SOLO DIFFICULTY</div><div class="context-segment-grid three">${segments.difficultySegments.map(segment=>`<article class="context-segment-card ${segment.id}"><div><b>${segment.label}</b><span>${segment.count} reviews</span></div><div class="context-axis-mini">${segment.axes.map(axis=>`<span><i>${insightAxisLabel(axis.id)}</i><b>${oneDecimal(axis.average)}</b></span>`).join('')}</div></article>`).join('')}</div></div>`:''}
    </section>
    <section class="context-signals">${contextSignals.length?contextSignals.slice(0,4).map((signal,index)=>`<div class="context-signal"><span class="context-signal-mark">Δ</span><span><b>${esc(contextSignalText(signal))}</b><small>${signal.type==='mode'?'Single / Party':'Solo難易度'}の各セグメント2件以上で比較 · 差 ${signal.gap.toFixed(1)}</small></span><button class="mini-action" data-add-context-experiment="${index}">実験に追加</button></div>`).join(''):'<div class="catalog-empty">十分な件数のあるセグメント間で1.0点以上の差はまだありません。</div>'}</section>
    <div class="lab-note">Context Signalは各比較セグメント2件以上、4軸平均の差1.0以上で表示します。少数レビューだけでは改善警告にしません。</div>
    <div class="section-head compact-head"><h2>Review Timeline</h2><span class="muted">v8.25以降の新規評価</span></div>
    ${timeline.total?`<section class="review-timeline-summary"><div><b>${timeline.total}</b><span>tracked</span></div><div><b>${timeline.currentCount}</b><span>直近30日</span></div><div><b>${timeline.previousCount}</b><span>前30日</span></div><div><b>${timeline.modes.single}/${timeline.modes.party}</b><span>Single / Party</span></div></section><section class="review-trends">${timeline.axes.map(axis=>{const label=insightAxisLabel(axis.id),delta=axis.delta;return`<div><span>${label}</span><b>${Number.isFinite(axis.currentAverage)?axis.currentAverage.toFixed(1):'—'}</b><small>${Number.isFinite(delta)?`${delta>0?'+':''}${delta.toFixed(1)} vs 前30日`:'比較データ待ち'}</small></div>`}).join('')}</section><section class="review-event-list">${timeline.recent.slice(0,6).map(event=>`<div class="review-event-row"><span><b>${event.mode==='party'?'Party':'Single'} · ${event.playerCount}人${event.difficulty?` · ${soloDifficultyLabel(event.difficulty)}`:''}</b><small>${formatPlayedAt(event.at)}</small></span><span class="review-event-scores">F ${event.scores.fun} · C ${event.scores.clarity} · B ${event.scores.brain} · R ${event.scores.replay}</span></div>`).join('')}</section>`:'<div class="catalog-empty">次に記録する4軸評価からTimelineを開始します。</div>'}
    <div class="lab-note">既存の累積Playtest平均はそのまま利用します。v8.25以前の個別評価日時は存在しないため、過去イベントを推測生成せず、Timelineは新規評価だけで比較します。</div>
    <div class="section-head compact-head"><h2>Player Results</h2><span class="muted">勝数 / 勝率</span></div>
    <section class="insight-player-list">${insight.players.length?insight.players.map((row,index)=>`<button class="insight-player-row" data-insight-player="${encodeURIComponent(row.name)}"><span class="stats-rank">${String(index+1).padStart(2,'0')}</span><span><b>${esc(row.name)}</b><small>${row.plays}試合</small></span><span class="stats-value"><b>${row.wins}勝</b><small>${percent(row.winRate)}</small></span></button>`).join(''):'<div class="catalog-empty">プレイヤーデータがありません。</div>'}</section>
    <div class="section-head compact-head"><h2>Health Findings</h2><span class="health-status ${status}">${healthStatusLabel(status)}</span></div>
    <section class="insight-findings">${insight.health?.issues?.length?insight.health.issues.map((item,index)=>`<div class="health-issue ${item.severity}"><div><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></div><p>${esc(item.action)}</p><button class="mini-action" data-add-health-experiment="${index}">実験に追加</button></div>`).join(''):'<div class="health-issue healthy"><div><b>明確な警告なし</b><small>現在の閾値では問題を検出していません。</small></div><p>データを継続して蓄積する</p></div>'}</section>
    ${learned.recommendations.length||learned.cautions.length?`<div class="section-head compact-head"><h2>Learned Recommendations</h2><span class="muted">${learned.evidenceCount} evaluated experiments</span></div>
    <section class="learned-recommendations">
      ${learned.recommendations.map((row,index)=>`<article class="learned-card reuse"><span class="learned-mark">REUSE</span><span><b>${esc(row.title)}</b><small>${esc(getGame(row.originGameId)?.title||row.originGameId)} · ${esc(learnedRecommendationLabel(row))} · ${esc(row.cohort)}</small><p>${esc(row.note||row.source.action||row.source.detail||'過去に改善した実験')}</p></span><button class="mini-action" data-add-learned="${index}">実験に追加</button></article>`).join('')}
      ${learned.cautions.map(row=>`<article class="learned-card avoid"><span class="learned-mark">AVOID</span><span><b>${esc(row.title)}</b><small>${esc(getGame(row.originGameId)?.title||row.originGameId)} · ${esc(learnedRecommendationLabel(row))}</small><p>${esc(row.note||row.source.action||row.source.detail||'過去に悪化した実験')}</p></span></article>`).join('')}
    </section>
    <div class="lab-note">現在のHealth / Context Signalと、DONE実験のsourceを照合しています。成功実験はREUSE、悪化実験はAVOID。同じゲームの実績を優先します。</div>`:''}
    <div class="section-head compact-head"><h2>Improvement Queue</h2><span class="muted">${experiments.length} / 5</span></div>
    <section class="improvement-mini-list">${experiments.length?experiments.map(item=>{const result=experimentWorkflow.evaluation(item);return`<article class="improvement-mini ${item.status}"><span class="experiment-status ${item.status}">${experimentStatusLabel(item.status)}</span><span><b>${esc(item.title)}</b><small>${item.note?esc(item.note):esc(item.source.detail||item.source.action||'メモなし')}</small>${result?`<small class="experiment-result-line ${experimentWorkflow.outcomeClass(result)}">${esc(experimentWorkflow.resultSummary(item))}</small>`:''}</span><button class="mini-action" data-cycle-experiment="${item.id}">${experimentWorkflow.advanceLabel(item)}</button></article>`}).join(''):'<div class="catalog-empty">改善実験はまだありません。Health FindingやContext Signalから追加できます。</div>'}</section>
    <button class="btn quiet full" id="manualExperiment">手動で実験を追加</button>
    <div class="section-head compact-head"><h2>Recent Results</h2><span class="muted">最大10件</span></div>
    <section class="history-list">${insight.recent.length?insight.recent.map(entry=>`<div class="history-row"><span class="history-symbol">${entry.mode==='party'?'P':'S'}</span><span><b>${entry.winners.length?`勝者 ${entry.winners.map(esc).join(' & ')}`:'勝者なし'}</b><small>${entry.mode==='party'?'Party round':'Single'} · ${entry.players.length}人</small></span><time>${formatPlayedAt(entry.at)}</time></div>`).join(''):'<div class="catalog-empty">最近の結果はありません。</div>'}</section>`;

    app.querySelector('#insightBack').onclick=()=>renderGameDetail(id);
    app.querySelectorAll('[data-insight-player]').forEach(button=>button.onclick=()=>renderPlayerProfile(decodeURIComponent(button.dataset.insightPlayer)));
    app.querySelectorAll('[data-add-context-experiment]').forEach(button=>button.onclick=()=>{
      const signal=contextSignals[+button.dataset.addContextExperiment];if(!signal)return;
      const title=contextSignalText(signal),key=['context',signal.type,signal.axis,signal.high,signal.low].join(':');
      const result=improvementQueue.add({gameId:id,title,source:{kind:'context',key,detail:title,action:'該当コンテキストのルール・説明・難易度を変更して再評価する'}});
      toast(result.created?'改善実験を追加しました':'同じ実験は追加済みです');
      renderGameInsights(id);
    });
    app.querySelectorAll('[data-add-health-experiment]').forEach(button=>button.onclick=()=>{
      const issue=insight.health?.issues?.[+button.dataset.addHealthExperiment];if(!issue)return;
      const key=['health',issue.type||issue.title].join(':');
      const result=improvementQueue.add({gameId:id,title:issue.action||issue.title,source:{kind:'health',key,detail:issue.detail||issue.title,action:issue.action}});
      toast(result.created?'改善実験を追加しました':'同じ実験は追加済みです');
      renderGameInsights(id);
    });
    app.querySelectorAll('[data-add-learned]').forEach(button=>button.onclick=()=>{
      const row=learned.recommendations[+button.dataset.addLearned];if(!row)return;
      const originGame=getGame(row.originGameId)?.title||row.originGameId;
      const key=['learned',row.originId,row.matchedNeed.key].join(':');
      const note=row.note||row.source.action||'過去の成功実験を再利用';
      const detail=`${originGame}で${learnedRecommendationLabel(row)}`;
      const result=improvementQueue.add({gameId:id,title:'再利用: '+row.title,note,source:{kind:'manual',key,detail,action:note}});
      toast(result.created?'学習済み改善を実験に追加しました':'同じ推薦は追加済みです');
      renderGameInsights(id);
    });
    app.querySelectorAll('[data-cycle-experiment]').forEach(button=>button.onclick=()=>{
      experimentWorkflow.advance(button.dataset.cycleExperiment);
      renderGameInsights(id);
    });
    app.querySelector('#manualExperiment').onclick=()=>{
      const title=prompt('試したい改善案');if(!title?.trim())return;
      const note=prompt('検証メモ（任意）','')||'';
      improvementQueue.add({gameId:id,title:title.trim(),note,source:{kind:'manual'}});
      renderGameInsights(id);
    };
  }

  return{gameInsightData,renderGameInsights};
}
