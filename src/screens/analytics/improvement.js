import {listGames} from '../../core/registry.js';
import {buildHealthReport} from '../../core/health.js';
import {experimentOutcomeLabel} from '../../core/experiment-evaluation.js';
import {buildExperimentLearnings,experimentSourceLabel} from '../../core/experiment-learnings.js';
import {escapeHtml as esc} from '../../ui/presentation.js';
import {healthStatusLabel,insightAxisLabel} from './game-insights.js';

export function createImprovementScreens({
  app,
  playtests,
  stats,
  improvementQueue,
  disposeActiveGame,
  updateBadge,
  renderHome,
  renderGameInsights,
  experimentWorkflow
}){
  function renderGameHealth(){
    disposeActiveGame();
    const games=listGames(),ids=games.map(game=>game.id),byId=new Map(games.map(game=>[game.id,game]));
    const playtestRows=playtests.report(ids);
    const statReport=stats.report(ids);
    const report=buildHealthReport(ids,playtestRows,statReport.gameStats);
    updateBadge('GAME HEALTH');

    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="healthBack">←</button><div><div class="eyebrow">GAME HEALTH</div><div class="screen-title">改善対象を自動分析</div></div></div>
    <section class="health-summary"><div class="health-action"><b>${report.actionCount}</b><span>改善優先</span></div><div class="health-watch"><b>${report.watchCount}</b><span>要観察</span></div><div class="health-data"><b>${report.dataCount}</b><span>データ収集中</span></div><div class="health-good"><b>${report.healthyCount}</b><span>健全</span></div></section>
    <div class="lab-note">誤判定を避けるため、評価系は新4軸評価2件以上、勝率偏りは5試合以上かつ対象プレイヤー4試合以上・勝率75%以上でのみ警告します。</div>
    <section class="health-list">${report.priority.map(row=>{
      const game=byId.get(row.gameId);
      return`<article class="health-card ${row.status}"><button class="health-card-head" data-insight-game="${row.gameId}"><span class="lab-symbol">${game?.emoji||''}</span><span><b>${esc(game?.title||row.gameId)}</b><small>${row.plays}試合 · 新4軸評価 ${row.reviews}件</small></span><span class="health-status ${row.status}">${healthStatusLabel(row.status)}</span></button>${row.issues.length?`<div class="health-issues">${row.issues.map(item=>`<div class="health-issue ${item.severity}"><div><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></div><p>${esc(item.action)}</p></div>`).join('')}</div>`:'<div class="health-issues"><div class="health-issue healthy"><div><b>明確な警告なし</b><small>現在の閾値では問題を検出していません。</small></div><p>データを継続して蓄積する</p></div></div>'}</article>`;
    }).join('')}</section>`;

    app.querySelector('#healthBack').onclick=renderHome;
    app.querySelectorAll('.health-card-head[data-insight-game]').forEach(button=>button.onclick=()=>renderGameInsights(button.dataset.insightGame));
  }

  function renderExperimentLearnings(){
    disposeActiveGame();
    const games=listGames(),ids=games.map(game=>game.id),byId=new Map(games.map(game=>[game.id,game]));
    const report=buildExperimentLearnings(improvementQueue.all(ids));
    updateBadge('EXPERIMENT LEARNINGS');
    const quality=value=>Number.isFinite(value)?`${value>0?'+':''}${value.toFixed(1)}`:'—';
    const sourceCards=report.sources.map(row=>`<article class="learning-source"><div><b>${experimentSourceLabel(row.source)}</b><span>${row.completed} completed</span></div><div class="learning-source-metrics"><span><b>${row.improved}</b><small>improved</small></span><span><b>${row.worse}</b><small>worse</small></span><span><b>${quality(row.averageQualityDelta)}</b><small>avg Δ</small></span></div></article>`).join('');
    const experimentRow=row=>{const game=byId.get(row.gameId);return`<button class="learning-experiment ${row.outcome}" data-learning-game="${row.gameId}"><span class="lab-symbol">${game?.emoji||''}</span><span><b>${esc(row.title)}</b><small>${esc(game?.title||row.gameId)} · ${experimentSourceLabel(row.source)} · ${esc(row.cohort)}</small></span><span class="learning-delta">${quality(row.qualityDelta)}<small>Quality</small></span></button>`};
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="learningBack">←</button><div><div class="eyebrow">EXPERIMENT LEARNINGS</div><div class="screen-title">改善から得た学び</div></div></div>
    <section class="learning-summary"><div><b>${report.completed}</b><span>evaluated</span></div><div><b>${report.improved}</b><span>improved</span></div><div><b>${report.completed?Math.round((report.successRate||0)*100)+'%':'—'}</b><span>success rate</span></div><div><b>${quality(report.averageQualityDelta)}</b><span>avg Quality Δ</span></div></section>
    <div class="lab-note">DONEかつBefore/After判定済みの実験だけを集計します。QualityはFun / Clarity / Replayの平均で、Brain Loadは成功率に含めません。</div>
    <div class="section-head compact-head"><h2>By Source</h2><span class="muted">改善案の起点</span></div>
    <section class="learning-sources">${sourceCards}</section>
    <div class="section-head compact-head"><h2>By Game</h2><span class="muted">改善実績</span></div>
    <section class="learning-games">${report.games.length?report.games.map(row=>{const game=byId.get(row.gameId);return`<button class="learning-game" data-learning-game="${row.gameId}"><span class="lab-symbol">${game?.emoji||''}</span><span><b>${esc(game?.title||row.gameId)}</b><small>${row.completed}実験 · improved ${row.improved} / worse ${row.worse}</small></span><span class="learning-delta">${quality(row.averageQualityDelta)}<small>avg Δ</small></span></button>`}).join(''):'<div class="catalog-empty">判定済みの実験はまだありません。</div>'}</section>
    <div class="section-head compact-head"><h2>What Worked</h2><span class="muted">Quality改善順</span></div>
    <section class="learning-list">${report.wins.length?report.wins.slice(0,8).map(experimentRow).join(''):'<div class="catalog-empty">IMPROVEDになった実験はまだありません。</div>'}</section>
    <div class="section-head compact-head"><h2>What Did Not Work</h2><span class="muted">悪化幅の大きい順</span></div>
    <section class="learning-list">${report.misses.length?report.misses.slice(0,8).map(experimentRow).join(''):'<div class="catalog-empty">WORSEになった実験はありません。</div>'}</section>
    ${report.flats.length?`<div class="section-head compact-head"><h2>Flat</h2><span class="muted">大きな変化なし</span></div><section class="learning-list">${report.flats.slice(0,6).map(experimentRow).join('')}</section>`:''}
    ${report.doneWithoutResult?`<div class="lab-note">${report.doneWithoutResult}件の旧DONE実験はBefore/After結果がないため集計対象外です。</div>`:''}
    <button class="btn quiet full" id="learningQueue">Improvement Queueへ</button>`;
    app.querySelector('#learningBack').onclick=renderHome;
    app.querySelector('#learningQueue').onclick=renderImprovementQueue;
    app.querySelectorAll('[data-learning-game]').forEach(button=>button.onclick=()=>renderGameInsights(button.dataset.learningGame));
  }

  function renderImprovementQueue(){
    disposeActiveGame();
    const games=listGames(),ids=games.map(game=>game.id),byId=new Map(games.map(game=>[game.id,game])),rows=improvementQueue.all(ids),summary=improvementQueue.summary(ids);
    updateBadge('IMPROVEMENT QUEUE');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="queueBack">←</button><div><div class="eyebrow">IMPROVEMENT QUEUE</div><div class="screen-title">改善実験</div></div></div>
    <section class="health-summary improvement-summary"><div><b>${summary.testing}</b><span>TESTING</span></div><div><b>${summary.planned}</b><span>PLANNED</span></div><div><b>${summary.done}</b><span>DONE</span></div><div><b>${summary.games}</b><span>games</span></div></section>
    <div class="lab-note">PLANNED→TESTINGで開始前レビューをBaselineとして固定し、開始後レビューをAfterとして比較します。Baseline 2件 + After 3件以上で自動判定。条件を満たすまでDONEには進めず、DONE時点の結果を固定保存します。</div><button class="btn quiet full" id="queueLearnings">完了実験の学びを見る</button>
    <section class="improvement-board">${rows.length?rows.map(item=>{const game=byId.get(item.gameId),result=experimentWorkflow.evaluation(item);return`<article class="improvement-card ${item.status}"><button class="improvement-game" data-queue-game="${item.gameId}"><span class="lab-symbol">${game?.emoji||''}</span><span><b>${esc(game?.title||item.gameId)}</b><small>${item.source.kind==='health'?'Health Finding':item.source.kind==='context'?'Context Signal':'Manual'}</small></span></button><div class="improvement-body"><b>${esc(item.title)}</b><p>${esc(item.note||item.source.detail||item.source.action||'メモなし')}</p>${result?`<section class="experiment-result ${experimentWorkflow.outcomeClass(result)}"><div class="experiment-result-head"><b>${experimentOutcomeLabel(result.outcome)}</b><span>${esc(result.cohort?.label||'All reviews')}</span></div><div class="experiment-result-counts"><span>Before ${result.baselineCount}</span><span>After ${result.afterCount}</span><span>必要 After 3</span></div><div class="experiment-axis-deltas">${result.axes.map(axis=>`<span><i>${insightAxisLabel(axis.id)}</i><b>${Number.isFinite(axis.delta)?`${axis.delta>0?'+':''}${axis.delta.toFixed(1)}`:'—'}</b></span>`).join('')}</div></section>`:''}</div><div class="improvement-actions"><button class="experiment-status ${item.status}" data-queue-cycle="${item.id}">${experimentWorkflow.advanceLabel(item)}</button><button class="mini-action" data-queue-note="${item.id}">メモ</button><button class="mini-action danger-text" data-queue-delete="${item.id}">削除</button></div></article>`}).join(''):'<div class="catalog-empty">改善実験はまだありません。Game Insightsから追加してください。</div>'}</section>`;
    app.querySelector('#queueBack').onclick=renderHome;
    app.querySelector('#queueLearnings').onclick=renderExperimentLearnings;
    app.querySelectorAll('[data-queue-game]').forEach(button=>button.onclick=()=>renderGameInsights(button.dataset.queueGame));
    app.querySelectorAll('[data-queue-cycle]').forEach(button=>button.onclick=()=>{experimentWorkflow.advance(button.dataset.queueCycle);renderImprovementQueue()});
    app.querySelectorAll('[data-queue-note]').forEach(button=>button.onclick=()=>{
      const item=rows.find(row=>row.id===button.dataset.queueNote);if(!item)return;
      const note=prompt('検証メモ',item.note||item.source.action||'');if(note==null)return;
      improvementQueue.update(item.id,{note});renderImprovementQueue();
    });
    app.querySelectorAll('[data-queue-delete]').forEach(button=>button.onclick=()=>{
      if(!confirm('この改善実験を削除しますか？'))return;
      improvementQueue.remove(button.dataset.queueDelete);renderImprovementQueue();
    });
  }

  return{renderGameHealth,renderExperimentLearnings,renderImprovementQueue};
}
