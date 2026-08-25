import {CloudflareRoomTransport,cleanCode} from './core/room-transport.js';

const SERVER_KEY='partyPocketRoomServer';
const credentialKey=code=>`partyPocketRoom:${code}`;

export function mountOnline({app,badge,toast,onExit,esc}){
  let transport=null,state=null,timer=null,disposed=false;
  const params=new URLSearchParams(location.search);
  const initialServer=params.get('server')||localStorage.getItem(SERVER_KEY)||'';
  const initialRoom=cleanCode(params.get('room')||'');

  const clearTimer=()=>{clearInterval(timer);timer=null};
  const cleanup=()=>{disposed=true;clearTimer();transport?.disconnect();transport=null};
  const setBadge=text=>badge.textContent=text;

  renderEntry();

  function renderEntry(){
    clearTimer();setBadge('ONLINE');
    app.innerHTML=`<section class="hero"><h1>別々のスマホで、<br>一緒に遊ぶ。</h1><p>1人が部屋を作り、ほかの人は6文字のルームコードか共有リンクから参加。</p></section>
    <section class="panel"><div class="eyebrow">ROOM SERVER</div><label class="field-label">Cloudflare Worker URL</label><input id="serverUrl" value="${esc(initialServer)}" placeholder="https://party-pocket-room.xxxxx.workers.dev"><div class="rules">初回だけWorker URLを設定。端末に保存されます。</div></section>
    <div class="section-head"><h2>オンラインルーム</h2><span class="muted">2〜8人</span></div>
    <section class="mode-grid"><button class="game-card" id="createRoom" style="background:#eaf7ff"><div class="chip">HOST</div><h3>＋ 部屋を作る</h3><p>この端末がホストになります。</p></button><button class="game-card" id="joinRoom" style="background:#effaf2"><div class="chip">JOIN</div><h3>→ 部屋に入る</h3><p>${initialRoom?`コード ${initialRoom} で参加`:'ルームコードを入力して参加'}</p></button></section>
    <button class="btn" style="width:100%;margin-top:18px" id="backLocal">← ローカルプレイへ戻る</button>`;
    app.querySelector('#backLocal').onclick=()=>{cleanup();onExit()};
    app.querySelector('#createRoom').onclick=()=>renderCreate();
    app.querySelector('#joinRoom').onclick=()=>renderJoin(initialRoom);
  }

  function getServer(){
    const value=app.querySelector('#serverUrl')?.value.trim()||localStorage.getItem(SERVER_KEY)||initialServer;
    if(!value)throw new Error('Worker URLを設定してください');
    try{const u=new URL(value);if(!/^https?:$/.test(u.protocol))throw 0}catch{throw new Error('Worker URLが正しくありません')}
    localStorage.setItem(SERVER_KEY,value.replace(/\/$/,''));return value.replace(/\/$/,'');
  }

  function renderCreate(){
    let server;try{server=getServer()}catch(error){return toast(error.message)}
    app.innerHTML=`<section class="panel"><div class="eyebrow">CREATE ROOM</div><div class="prompt">ホストの名前</div><input id="hostName" maxlength="20" value="プレイヤー1"><button class="btn primary" style="width:100%;margin-top:14px" id="doCreate">部屋を作る</button><button class="btn" style="width:100%;margin-top:10px" id="cancel">戻る</button></section>`;
    app.querySelector('#cancel').onclick=renderEntry;
    app.querySelector('#doCreate').onclick=async()=>{
      const button=app.querySelector('#doCreate');button.disabled=true;
      try{
        transport=new CloudflareRoomTransport(server);const creds=await transport.createRoom(app.querySelector('#hostName').value);
        saveCredentials(creds);await connect(creds);
      }catch(error){toast(readable(error));button.disabled=false}
    };
  }

  function renderJoin(code=''){
    let server;try{server=getServer()}catch(error){return toast(error.message)}
    const previous=code?loadCredentials(code):null;
    app.innerHTML=`<section class="panel"><div class="eyebrow">JOIN ROOM</div><div class="prompt">ルームコード</div><input id="roomCode" maxlength="6" value="${esc(code)}" placeholder="ABC234" style="text-transform:uppercase;letter-spacing:.15em;font-weight:900"><label class="field-label">名前</label><input id="joinName" maxlength="20" value="${esc(previous?.name||'') }" placeholder="あなたの名前"><button class="btn primary" style="width:100%;margin-top:14px" id="doJoin">参加する</button><button class="btn" style="width:100%;margin-top:10px" id="cancel">戻る</button></section>`;
    app.querySelector('#cancel').onclick=renderEntry;
    app.querySelector('#doJoin').onclick=async()=>{
      const roomCode=cleanCode(app.querySelector('#roomCode').value);if(roomCode.length!==6)return toast('6文字のルームコードを入力してください');
      const name=app.querySelector('#joinName').value;const stored=loadCredentials(roomCode)||{};
      try{
        transport=new CloudflareRoomTransport(server);const creds=await transport.joinRoom(roomCode,name,stored);
        creds.name=name||stored.name;saveCredentials(creds);await connect(creds);
      }catch(error){toast(readable(error))}
    };
  }

  async function connect(creds){
    setBadge(`ROOM ${creds.roomCode}`);
    transport.subscribe('ROOM_STATE',packet=>{if(disposed)return;state=packet.state;renderState()});
    transport.subscribe('ERROR',packet=>toast(readable({message:packet.error})));
    transport.subscribe('connection',info=>{if(!info.connected)toast('再接続しています…')});
    await transport.connect(creds);
  }

  function renderState(){
    if(!state)return;clearTimer();setBadge(`ROOM ${state.code}`);
    if(state.phase==='lobby')return renderLobby();
    if(state.phase==='game')return renderGame();
    if(state.phase==='round-result')return renderRoundResult();
    if(state.phase==='final')return renderFinal();
  }

  function playerRows(){return state.players.map((p,i)=>`<div class="result-row"><span>${p.connected?'●':'○'} ${i+1}. ${esc(p.name)}${p.id===state.hostId?' 👑':''}</span><span>${state.party.scores[i]||0} pt</span></div>`).join('')}

  function renderLobby(){
    app.innerHTML=`<section class="panel"><div class="eyebrow">ONLINE LOBBY</div><div class="prompt" style="letter-spacing:.08em">${state.code}</div><p class="sub">${state.players.length}/8人参加中</p><div class="result-list">${playerRows()}</div><div class="actions"><button class="btn" id="shareRoom">参加リンクを共有</button>${state.me.isHost?'<button class="btn primary" id="startParty">6ラウンド開始</button>':''}</div><button class="btn" style="width:100%;margin-top:10px" id="leaveRoom">退出</button></section>`;
    app.querySelector('#shareRoom').onclick=shareRoom;
    app.querySelector('#startParty')?.addEventListener('click',()=>send({type:'START_PARTY'}));
    app.querySelector('#leaveRoom').onclick=()=>{cleanup();history.replaceState({},'',location.pathname);onExit()};
  }

  function renderGame(){
    if(state.game.type==='sync')return renderSync();
    if(state.game.type==='bomb')return renderBomb();
    if(state.game.type==='five')return renderFive();
  }

  function gameHeader(title){return `<div class="eyebrow">ONLINE · ROUND ${state.party.round+1}/${state.party.totalRounds}</div><div class="prompt">${title}</div><div class="result-list compact">${state.players.map((p,i)=>`<div class="result-row"><span>${esc(p.name)}</span><span>${state.party.scores[i]} Party pt</span></div>`).join('')}</div>`}

  function renderSync(){
    const g=state.game,submitted=g.submitted.includes(state.me.id);
    const input=g.prompt.type==='choice'?`<div class="choice-grid">${g.prompt.a.map((a,i)=>`<button class="choice" data-answer="${i}">${esc(a)}</button>`).join('')}</div>`:`<div class="stack"><input id="syncFree" maxlength="30" placeholder="みんなと被りそうな答え"><button class="btn primary" id="syncSubmit">決定</button></div>`;
    app.innerHTML=`<section class="stage">${gameHeader('🎯 シンクロ')}<div class="card" style="margin-top:18px"><h2>${esc(g.prompt.q)}</h2><p class="sub">回答はリビールまで他の端末には表示されません。</p></div>${submitted?`<div class="waiting">回答済み ✓<br><small>${g.submitted.length}/${state.players.length}人</small></div>`:input}</section>`;
    if(submitted)return;
    app.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>send({type:'SYNC_ANSWER',value:+b.dataset.answer}));
    app.querySelector('#syncSubmit')?.addEventListener('click',()=>{const value=app.querySelector('#syncFree').value;if(!value.trim())return toast('答えを入力してください');send({type:'SYNC_ANSWER',value})});
  }

  function renderBomb(){
    const g=state.game,turnPlayer=state.players[g.turn],myTurn=turnPlayer.id===state.me.id;
    app.innerHTML=`<section class="stage">${gameHeader('💣 21ボム+')}<div class="turn-name">${esc(turnPlayer.name)} の番</div><div class="big-number">${g.n}</div><div class="sub" style="text-align:center">${g.target}以上で爆発 · 1〜${g.maxStep}進める</div>${myTurn?`<div class="choice-grid">${Array.from({length:g.maxStep},(_,i)=>`<button class="choice" data-move="${i+1}">＋${i+1}</button>`).join('')}<button class="choice" id="bombPass">PASS</button></div>`:'<div class="waiting">相手の操作を待っています</div>'}</section>`;
    if(myTurn){app.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>send({type:'BOMB_MOVE',value:+b.dataset.move}));app.querySelector('#bombPass').onclick=()=>send({type:'BOMB_PASS'})}
  }

  function renderFive(){
    const g=state.game,active=state.players[g.turn],myTurn=active.id===state.me.id,remaining=g.deadline?Math.max(0,(g.deadline-Date.now())/1000):null;
    const control=!g.deadline?(myTurn?'<button class="btn primary" style="width:100%;margin-top:18px" id="fiveStart">スタート</button>':'<div class="waiting">挑戦者のスタートを待っています</div>'):`<div class="timer" id="remoteTimer">${remaining.toFixed(1)}</div>${remaining<=0&&state.me.isHost?'<div class="choice-grid"><button class="btn green" id="fiveOk">成功</button><button class="btn pink" id="fiveNg">失敗</button></div>':''}`;
    app.innerHTML=`<section class="stage">${gameHeader('⚡ 5秒チャレンジ+')}<div class="turn-name">${esc(active.name)} の挑戦</div><div class="card" style="margin-top:18px"><h2>${esc(g.prompt)}</h2><p class="sub">${g.seconds}秒 · ${g.difficulty.toUpperCase()}</p></div>${control}</section>`;
    app.querySelector('#fiveStart')?.addEventListener('click',()=>send({type:'FIVE_START'}));
    app.querySelector('#fiveOk')?.addEventListener('click',()=>send({type:'FIVE_JUDGE',success:true}));
    app.querySelector('#fiveNg')?.addEventListener('click',()=>send({type:'FIVE_JUDGE',success:false}));
    if(g.deadline&&remaining>0){timer=setInterval(()=>{const el=app.querySelector('#remoteTimer');if(!el)return clearTimer();const left=Math.max(0,(g.deadline-Date.now())/1000);el.textContent=left.toFixed(1);if(left<=0){clearTimer();renderState()}},50)}
  }

  function renderRoundResult(){
    const result=state.lastResult,details=result?.details;
    const reveal=details?.type==='sync'?`<div class="card" style="margin-top:14px"><h3>答え合わせ</h3>${details.answers.map(a=>`<div class="result-row"><span>${esc(a.name)}</span><span>${esc(a.answer)}</span></div>`).join('')}</div>`:'';
    app.innerHTML=`<section class="panel"><div class="eyebrow">ROUND ${state.party.round+1} RESULT</div><div class="prompt">ラウンド終了</div><div class="result-list">${state.players.map((p,i)=>`<div class="result-row"><span>${esc(p.name)}</span><span>＋${result.awards[i]} → ${state.party.scores[i]} Party pt</span></div>`).join('')}</div>${reveal}${state.me.isHost?'<button class="btn primary" style="width:100%;margin-top:18px" id="nextRound">次のラウンド</button>':'<div class="waiting">ホストが次へ進めます</div>'}</section>`;
    app.querySelector('#nextRound')?.addEventListener('click',()=>send({type:'NEXT_ROUND'}));
  }

  function renderFinal(){
    const best=Math.max(...state.party.scores),winners=state.players.filter((_,i)=>state.party.scores[i]===best);
    app.innerHTML=`<section class="panel winner"><div class="trophy">🏆</div><div class="eyebrow">ONLINE PARTY CHAMPION</div><h2>${winners.map(p=>esc(p.name)).join(' & ')}</h2><div class="result-list">${playerRows()}</div>${state.me.isHost?'<button class="btn primary" style="width:100%;margin-top:18px" id="restart">もう一度</button>':''}<button class="btn" style="width:100%;margin-top:10px" id="leave">ホームへ</button></section>`;
    app.querySelector('#restart')?.addEventListener('click',()=>send({type:'RESTART_PARTY'}));
    app.querySelector('#leave').onclick=()=>{cleanup();history.replaceState({},'',location.pathname);onExit()};
  }

  function send(intent){try{transport.sendIntent(intent)}catch{toast('接続が切れています。再接続中です') }}

  async function shareRoom(){
    const server=localStorage.getItem(SERVER_KEY)||initialServer;
    const url=new URL(location.href);url.search='';url.searchParams.set('online','1');url.searchParams.set('room',state.code);url.searchParams.set('server',server);
    const data={title:'Party Pocket',text:`Party Pocket ルーム ${state.code} に参加`,url:url.toString()};
    try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(url.toString());toast('参加リンクをコピーしました')}}catch{}
  }

  function saveCredentials(creds){localStorage.setItem(credentialKey(creds.roomCode),JSON.stringify(creds))}
  function loadCredentials(code){try{return JSON.parse(localStorage.getItem(credentialKey(code))||'null')}catch{return null}}
  function readable(error){const value=error?.message||String(error);return ({ROOM_NOT_FOUND:'部屋が見つかりません',ROOM_FULL:'部屋は満員です',GAME_ALREADY_STARTED:'ゲーム開始後は新規参加できません',ROOM_CONNECTION_FAILED:'ルームサーバーに接続できません',INVALID_ACTION:'その操作はできません',NOT_YOUR_TURN:'あなたの番ではありません',NO_PASS:'PASSは使用済みです'}[value]||value)}

  return cleanup;
}
