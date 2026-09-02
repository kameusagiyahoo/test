import {rankScores} from '../core/session.js';
import {escapeHtml as esc} from './presentation.js';

export function rankingHtml(scores,players,unit){
  return rankScores(scores)
    .map(row=>`<div class="result-row"><span>${row.rank}. ${esc(players[row.index])}</span><span>${row.score} ${unit}</span></div>`)
    .join('');
}
