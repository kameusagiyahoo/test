import {getGame} from '../core/registry.js';
import {escapeHtml as esc,oneDecimal,scoreButtons} from './presentation.js';

export function hasCompletePlaytestScores(scores){
  return ['fun','clarity','brain','replay'].every(key=>Number(scores?.[key])>=1&&Number(scores?.[key])<=5);
}

export function replayRating(replayScore){
  const score=Number(replayScore);
  return score>=4?'good':score===3?'neutral':'bad';
}

export function createPlaytestFeedback({
  app,
  session,
  ratings,
  playtests,
  playtestEvents
}){
  function promptHtml(gameId){
    const game=getGame(gameId);if(!game)return'';
    const playtest=playtests.get(gameId);
    return `<section class="feedback playtest-card" data-playtest-game="${gameId}"><div><div class="eyebrow">PLAYTEST NOTE</div><strong>${esc(game.title)}を4軸で評価</strong><div class="feedback-history">${playtest.responses?`新評価 ${playtest.responses}回 · 面白さ ${oneDecimal(playtest.fun.average)} · 分かりやすさ ${oneDecimal(playtest.clarity.average)}`:playtest.legacyResponses?`旧「また遊びたい」評価 ${playtest.legacyResponses}件を引き継ぎ済み`:'この端末だけに記録します'}</div></div><div class="playtest-fields"><div class="playtest-row"><span>面白さ</span><div class="score-choices">${scoreButtons('fun')}</div></div><div class="playtest-row"><span>分かりやすさ</span><div class="score-choices">${scoreButtons('clarity')}</div></div><div class="playtest-row"><span>頭を使う度</span><div class="score-choices">${scoreButtons('brain')}</div></div><div class="playtest-row"><span>もう一度遊びたい</span><div class="score-choices">${scoreButtons('replay')}</div></div></div><button class="btn primary full playtest-save" disabled>4項目を記録</button></section>`;
  }

  function bind(gameId,{mode=session.mode==='party'?'party':'single',playerCount=session.players.length,difficulty=null}={}){
    const wrap=app.querySelector(`[data-playtest-game="${gameId}"]`);if(!wrap)return;
    const scores={};
    const save=wrap.querySelector('.playtest-save');

    wrap.querySelectorAll('[data-axis][data-score]').forEach(button=>button.onclick=()=>{
      const axis=button.dataset.axis,score=Number(button.dataset.score);
      scores[axis]=score;
      wrap.querySelectorAll(`[data-axis="${axis}"]`).forEach(choice=>{
        const selected=Number(choice.dataset.score)===score;
        choice.classList.toggle('selected',selected);
        choice.setAttribute('aria-pressed',String(selected));
      });
      save.disabled=!hasCompletePlaytestScores(scores);
    });

    save.onclick=()=>{
      if(save.disabled)return;
      const result=playtests.submit(gameId,scores);
      playtestEvents.record(gameId,scores,{mode,playerCount,difficulty});
      ratings.rate(gameId,replayRating(scores.replay));
      wrap.innerHTML=`<div><div class="eyebrow">SAVED</div><strong>プレイテスト評価を記録しました</strong><div class="feedback-history">面白さ ${oneDecimal(result.fun.average)} · 分かりやすさ ${oneDecimal(result.clarity.average)} · 頭を使う度 ${oneDecimal(result.brain.average)} · また遊びたい ${oneDecimal(result.replay.average)}</div></div>`;
    };
  }

  return{promptHtml,bind};
}
