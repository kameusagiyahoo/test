# Party Pocket

GitHub Pagesだけで動く、2〜8人向けのスマホ1台パーティーゲーム集です。

## 方針

- 公開先: GitHub Pagesのみ
- バックエンド: なし
- 外部DB / Worker / WebSocket: なし
- 複数端末同期: なし
- プレイヤー名のみlocalStorageへ保存
- スマホ1台を順番に回して遊ぶ

## Games

- 🎯 シンクロ — 4択 / 自由回答の一致ゲーム
- 💣 21ボム+ — ランダム爆発位置 + PASS
- ⚡ 5秒チャレンジ+ — EASY / NORMAL / HARD

## Modes

### Single Game
好きな1ゲームを選び、先に5点取った人が勝利。

### Party Mode
3ゲームを各2回、合計6ラウンド遊びます。各ゲーム内の生スコアはラウンド終了時に順位化し、Party Pointへ変換します。

- 1位グループ: +3 Party pt
- 2位グループ: +2 Party pt
- 3位グループ: +1 Party pt
- それ以下: +0

同点は同じParty Pointを獲得します。

## Architecture

```text
index.html
styles.css
src/
├ app.js
├ core/
│  ├ session.js
│  ├ registry.js
│  └ transport.js
└ games/
   ├ sync.js
   ├ bomb.js
   └ five.js
```

`transport.js` はローカルイベント用の小さな抽象層だけを残しています。外部通信は行いません。

## Tests

```bash
npm test
```

GitHub ActionsでPR / `main` push時にテストと主要JavaScriptの構文チェックを実行します。

## Deploy

`main` にマージすると既存のGitHub Pagesへ反映されます。
