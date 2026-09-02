import test from 'node:test';
import assert from 'node:assert/strict';
import {formatBytes,formatBackupDate} from '../src/screens/data-vault.js';
import {formatPartyDate} from '../src/screens/party-history.js';

test('Data Vault byte formatting stays compact',()=>{
  assert.equal(formatBytes(0),'0 B');
  assert.equal(formatBytes(1536),'1.5 KB');
  assert.equal(formatBytes(2*1024*1024),'2.00 MB');
});

test('screen date helpers handle invalid values safely',()=>{
  assert.equal(formatBackupDate(null),'日時不明');
  assert.equal(formatBackupDate('not-a-date'),'日時不明');
  assert.equal(formatPartyDate('not-a-date'),'日時不明');
});
