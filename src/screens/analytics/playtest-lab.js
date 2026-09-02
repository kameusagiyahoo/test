import {listGames} from '../../core/registry.js';
import {buildPlaytestTimeline} from '../../core/playtest-events.js';
import {escapeHtml as esc,oneDecimal} from '../../ui/presentation.js';

export function playtestStatus(row){
  if(row.responses<2)return{label:row.responses?'評価追加待ち':'未評価',tone:'muted'};
  if(row.qualityAverage<3.3)return{label:'改善優先',tone:'weak'};
  if(row.qualityAverage<4)return{label:'要観察',tone:'watch'};
  return{label:'好調',tone:'good'};
}

export function weakestAxis(row){
  const axes=[['面白さ',row.fun.average],['分かりやすさ',row.clarity.average],['また遊びたい',row.replay.average]].filter(([,value])=>Number.isFinite(value));
  if(!axes.length)return'データなし';
  axes.sort((a,b)=>a[1]-b[1]);
  return `${axes[0][0]} ${oneDecimal(axes[0][1])}`;
}

export function createPlaytestLabScreen({
  app,
  playtests,
  playtestEvents,
  disposeActiveGame,
  updateBadge,
  renderHome,
  openGameDetail
}){
  return function renderPlaytestLab(){
    disposeActiveGame();
    const games=listGames(),byId=new Map(games.map(game=>[game.id,game]));
    const report=playtests.report(games.map(game=>game.id)).map(row=>({
      ...row,
      game:byId.get(row.gameId),
      timeline:buildPlaytestTimeline(row.gameId,playtestEvents.forGame(row.gameId))
    }));
    const evaluated=report.filter(row=>row.responses>0).length;
    const stable=report.filter(row=>row.responses>=2);
    const weak=stable.filter(row=>row.qualityAverage<3.3).length;
    const ordered=[...report].sort((a,b)=>{
      const aGroup=a.responses>=2?0:a.responses?1:2;
      const bGroup=b.responses>=2?0:b.responses?1:2;
      return aGroup-bGroup||(a.qualityAverage??99)-(b.qualityAverage??99)||b.responses-a.responses;
    });

    updateBadge('PLAYTEST LAB');
    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="labBack">←</button><div><div class="eyebrow">PLAYTEST LAB</div><div class="screen-title">ゲーム品質を確認</div></div></div><section class="lab-summary"><div><b>${evaluated}</b><span>/ ${games.length} 評価済み</span></div><div><b>${stable.length}</b><span>2回以上</span></div><div><b>${weak}</b><span>改善優先</span></div></section><div class="lab-note">改善優先度は「面白さ・分かりやすさ・もう一度遊びたい」の平均で判定。頭を使う度はゲーム特性として別表示します。</div><section class="lab-list">${ordered.map(row=>{const status=playtestStatus(row),game=row.game;return`<button class="lab-row" data-game="${row.gameId}"><span class="lab-symbol">${game?.emoji||''}</span><span class="lab-main"><b>${esc(game?.title||row.gameId)}</b><small>${row.responses?`品質 ${oneDecimal(row.qualityAverage)} · 頭脳 ${oneDecimal(row.brain.average)} · ${row.responses}回`:row.legacyResponses?`新4軸評価なし · 旧評価 ${row.legacyResponses}件`:'まだ評価なし'}</small><small>${row.responses?`弱い軸: ${weakestAxis(row)}`:'プレイ後に4軸評価を記録してください'}</small><small>${row.timeline.total?`Timeline ${row.timeline.total}件 · 直近30日 ${row.timeline.currentCount} / 前30日 ${row.timeline.previousCount}`:'Timelineは次回評価から記録'}</small></span><span class="lab-status ${status.tone}">${status.label}</span></button>`}).join('')}</section>`;
    app.querySelector('#labBack').onclick=renderHome;
    app.querySelectorAll('.lab-row[data-game]').forEach(button=>button.onclick=()=>openGameDetail(button.dataset.game));
  };
}
