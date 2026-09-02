import {getGame} from '../../core/registry.js';
import {difficultyLabel,gameMeta,playerRangeLabel} from '../../core/catalog.js';
import {gameGuide} from '../../core/game-guide.js';
import {SOLO_GAME_IDS,SOLO_DIFFICULTIES,normalizeSoloDifficulty,soloDifficultyLabel} from '../../core/solo.js';
import {gameInsightHeadline,trendLabel} from '../../core/game-insights.js';
import {escapeHtml as esc} from '../../ui/presentation.js';
import {healthStatusLabel} from '../analytics/game-insights.js';

export function soloDifficultyDetail(gameId,difficulty){
  const level=normalizeSoloDifficulty(difficulty);
  const details={
    memory:{easy:'5桁 · 約3.2秒',normal:'6〜7桁 · 約2.5秒',hard:'8〜9桁 · 約1.8秒'},
    route:{easy:'3マス · 数字1〜6',normal:'4マス · 数字1〜8',hard:'5マス · 数字1〜9'},
    pattern:{easy:'加算・減算',normal:'交互・差分',hard:'等比・複合規則'}
  };
  return details[gameId]?.[level]||soloDifficultyLabel(level);
}

export function createGameDetailScreen({
  app,
  session,
  library,
  gameInsightData,
  disposeActiveGame,
  updateBadge,
  renderHome,
  renderGameInsights,
  startGame
}){
  function renderGameDetail(id,difficulty='normal'){
    disposeActiveGame();
    const game=getGame(id);if(!game)return renderHome();

    const soloEligible=session.players.length===1&&SOLO_GAME_IDS.includes(id);
    const soloDifficulty=soloEligible?normalizeSoloDifficulty(difficulty):'normal';
    const meta=gameMeta(id),guide=gameGuide(id),favorite=library.isFavorite(id),insight=gameInsightData(id);

    updateBadge('GAME GUIDE');
    const soloDifficultyHtml=soloEligible?`<section class="solo-difficulty-picker"><div><div class="eyebrow">SOLO DIFFICULTY</div><h3>${soloDifficultyLabel(soloDifficulty)}</h3><p>${soloDifficultyDetail(id,soloDifficulty)}</p></div><div class="solo-difficulty-buttons">${SOLO_DIFFICULTIES.map(level=>`<button class="solo-difficulty-button ${level===soloDifficulty?'active':''}" data-solo-difficulty="${level}"><b>${soloDifficultyLabel(level)}</b><small>${soloDifficultyDetail(id,level)}</small></button>`).join('')}</div></section>`:'';

    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="detailBack">←</button><div class="game-heading"><span class="game-symbol small">${game.emoji}</span><div><div class="eyebrow">GAME GUIDE</div><div class="screen-title">${game.title}</div></div></div></div>
    <section class="panel game-detail"><div class="detail-facts"><span>${difficultyLabel(meta.difficulty)}</span><span>約${meta.minutes}分</span><span>${playerRangeLabel(meta)}推奨</span></div>${soloDifficultyHtml}<button class="game-insight-preview ${insight.health.status}" id="detailInsights"><span><span class="eyebrow">GAME INSIGHTS</span><b>${insight.plays} plays · ${healthStatusLabel(insight.health.status)}</b><small>${gameInsightHeadline(insight)} · 30日差 ${trendLabel(insight)}</small></span><span class="recommend-arrow">→</span></button><div class="detail-section"><div class="eyebrow">OBJECTIVE</div><h3>${esc(guide.objective)}</h3></div><div class="detail-section"><div class="eyebrow">HOW TO PLAY</div><ol class="rule-steps">${guide.rules.map(rule=>`<li>${esc(rule)}</li>`).join('')}</ol></div><div class="detail-grid"><div class="detail-note"><div class="eyebrow">WIN / SCORE</div><p>${esc(guide.scoring)}</p></div><div class="detail-note"><div class="eyebrow">EXAMPLE</div><p>${esc(guide.example)}</p></div></div><div class="detail-actions"><button class="btn quiet favorite-button ${favorite?'active':''}" id="favoriteToggle">${favorite?'★ お気に入り済み':'☆ お気に入り'}</button><button class="btn primary" id="detailStart">${soloEligible?`${soloDifficultyLabel(soloDifficulty)}で始める`:'このゲームを始める'}</button></div></section>`;

    app.querySelector('#detailBack').onclick=renderHome;
    app.querySelector('#favoriteToggle').onclick=()=>{
      library.toggleFavorite(id);
      renderGameDetail(id);
    };
    app.querySelector('#detailInsights').onclick=()=>renderGameInsights(id);
    app.querySelectorAll('[data-solo-difficulty]').forEach(button=>button.onclick=()=>renderGameDetail(id,button.dataset.soloDifficulty));
    app.querySelector('#detailStart').onclick=()=>{
      session.startSingle();
      startGame(id,{difficulty:soloDifficulty});
    };
  }

  return{renderGameDetail};
}
