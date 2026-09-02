export const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[char]));

export function oneDecimal(value){
  return Number.isFinite(value)?value.toFixed(1):'—';
}

export function scoreButtons(axis){
  return [1,2,3,4,5]
    .map(score=>`<button class="score-choice" data-axis="${axis}" data-score="${score}" aria-pressed="false">${score}</button>`)
    .join('');
}
