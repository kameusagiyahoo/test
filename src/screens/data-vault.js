import {
  backupFilename,
  backupSummary,
  clearPartyPocketData,
  createBackup,
  parseBackupText,
  restoreBackup,
  stringifyBackup
} from '../core/backup.js';
import {escapeHtml as esc} from '../ui/presentation.js';

export function formatBytes(bytes){
  const value=Number(bytes)||0;
  if(value<1024)return value+' B';
  if(value<1024*1024)return (value/1024).toFixed(1)+' KB';
  return (value/(1024*1024)).toFixed(2)+' MB';
}

export function formatBackupDate(value){
  if(!value)return'日時不明';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'日時不明':date.toLocaleString('ja-JP');
}

export function createDataVaultScreen({
  app,
  appVersion,
  disposeActiveGame,
  updateBadge,
  toast,
  renderHome,
  storage=globalThis.localStorage
}){
  async function exportPartyPocketBackup(){
    const backup=createBackup(storage,{appVersion}),textValue=stringifyBackup(backup);
    const filename=backupFilename(),blob=new Blob([textValue],{type:'application/json'});
    try{
      const file=new File([blob],filename,{type:'application/json'});
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        await navigator.share({files:[file],title:'Party Pocket Backup'});
        return;
      }
    }catch(error){
      if(error?.name==='AbortError')return;
    }
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('バックアップを書き出しました');
  }

  return function renderDataVault(){
    disposeActiveGame();
    updateBadge('DATA VAULT');
    const current=createBackup(storage,{appVersion}),summary=backupSummary(current);
    let pendingBackup=null;

    app.innerHTML=`<div class="game-top"><button class="btn back quiet" id="vaultBack">←</button><div><div class="eyebrow">DATA VAULT</div><div class="screen-title">バックアップと復元</div></div></div>
    <section class="vault-summary"><div><b>${summary.keyCount}</b><span>保存キー</span></div><div><b>${formatBytes(summary.bytes)}</b><span>バックアップ量</span></div><div><b>v${appVersion}</b><span>現在版</span></div></section>
    <section class="panel vault-section"><div><div class="eyebrow">EXPORT</div><h3>この端末のデータを保存</h3><p>プレイヤー名、Party設定、履歴、評価、お気に入り、Solo進捗などParty PocketのlocalStorageを1つのJSONへまとめます。</p></div><button class="btn primary full" id="exportBackup">バックアップを書き出す</button></section>
    <section class="panel vault-section"><div><div class="eyebrow">RESTORE</div><h3>バックアップから復元</h3><p>JSONを検証してから内容を表示します。復元すると、現在のParty Pocketデータはバックアップ内容で置き換わります。</p></div><input id="restoreFile" class="vault-file-input" type="file" accept=".json,application/json"><button class="btn quiet full" id="chooseBackup">バックアップを選ぶ</button><div class="restore-preview" id="restorePreview" hidden></div></section>
    <section class="panel vault-section danger-zone"><div><div class="eyebrow">RESET</div><h3>端末データを初期化</h3><p>Party Pocketのユーザーデータだけを削除します。アプリ本体・Service Worker・オフラインキャッシュは残ります。</p></div><button class="btn danger full" id="clearData">端末データをすべて削除</button></section>
    <div class="vault-note">端末変更やSafariのサイトデータ削除前には、先にバックアップを書き出してください。</div>`;

    app.querySelector('#vaultBack').onclick=renderHome;
    app.querySelector('#exportBackup').onclick=exportPartyPocketBackup;
    const fileInput=app.querySelector('#restoreFile'),preview=app.querySelector('#restorePreview');
    app.querySelector('#chooseBackup').onclick=()=>fileInput.click();
    fileInput.onchange=async()=>{
      pendingBackup=null;
      const file=fileInput.files?.[0];
      if(!file)return;
      try{
        const parsed=parseBackupText(await file.text()),info=backupSummary(parsed);
        pendingBackup=parsed;
        preview.hidden=false;
        preview.innerHTML=`<div><div class="eyebrow">VALID BACKUP</div><b>${esc(file.name)}</b><small>作成: ${esc(formatBackupDate(info.exportedAt))}<br>App: ${esc(info.appVersion)} · ${info.keyCount} keys · ${formatBytes(info.bytes)}</small></div><button class="btn primary" id="confirmRestore">このデータを復元</button>`;
        preview.querySelector('#confirmRestore').onclick=()=>{
          if(!pendingBackup)return;
          if(!confirm('現在のParty Pocketデータを、このバックアップ内容で置き換えます。続けますか？'))return;
          try{restoreBackup(storage,pendingBackup);location.reload()}
          catch{toast('復元に失敗しました')}
        };
      }catch(error){
        preview.hidden=false;
        preview.innerHTML=`<div class="restore-error"><b>読み込めませんでした</b><small>${esc(error?.message||'バックアップ形式を確認してください')}</small></div>`;
      }
    };
    app.querySelector('#clearData').onclick=()=>{
      if(!confirm('プレイヤー、履歴、評価、Solo進捗などParty Pocketの端末データをすべて削除します。元に戻せません。続けますか？'))return;
      clearPartyPocketData(storage);location.reload();
    };
  };
}
