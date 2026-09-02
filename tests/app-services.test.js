import test from 'node:test';
import assert from 'node:assert/strict';
import {rankingHtml} from '../src/ui/result-presentation.js';
import {createShellUi} from '../src/app/shell-ui.js';

test('result ranking preserves competition ranks and escapes names',()=>{
  const html=rankingHtml([5,3,5],['<Alice>','Bob','Cara'],'pt');
  assert.match(html,/1\. &lt;Alice&gt;<\/span><span>5 pt/);
  assert.match(html,/1\. Cara<\/span><span>5 pt/);
  assert.match(html,/3\. Bob<\/span><span>3 pt/);
});

test('shell badge falls back to current player count',()=>{
  const badge={textContent:''};
  const toastElement={textContent:'',classList:{add(){},remove(){}}};
  const session={players:['A','B','C']};
  const shell=createShellUi({badge,toastElement,session});
  shell.updateBadge();
  assert.equal(badge.textContent,'3人');
  shell.updateBadge('RESULT');
  assert.equal(badge.textContent,'RESULT');
});
