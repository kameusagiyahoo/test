import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeHtml,oneDecimal,scoreButtons} from '../src/ui/presentation.js';

test('presentation helpers escape dynamic HTML',()=>{
  assert.equal(escapeHtml('<b>"x" & \'y\'</b>'),'&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
});

test('presentation helpers format numeric values',()=>{
  assert.equal(oneDecimal(3.25),'3.3');
  assert.equal(oneDecimal(Number.NaN),'—');
});

test('score buttons render five accessible choices',()=>{
  const html=scoreButtons('fun');
  assert.equal((html.match(/data-score=/g)||[]).length,5);
  assert.match(html,/data-axis="fun"/);
});
