# Party Pocket v4

2〜8人向けのモジュール式パーティーゲーム基盤です。

## Modes

### Local Play
スマホ1台を回して遊ぶモード。既存の3ゲームをSingle / 6-round Party Modeで遊べます。

### Online β
複数のスマホから同じルームへ参加するリアルタイムモードです。

- ホストがルームを作成
- 6文字のルームコードを発行
- 共有リンクから別端末が参加
- WebSocketでリアルタイム同期
- Durable Objectがゲーム状態と得点の唯一の権威
- 秘密回答はリビールまで本人以外へ配信しない
- 切断時はクライアントが自動再接続

## Online games

- 🎯 シンクロ — 各端末から秘密回答
- 💣 21ボム+ — ターンを全端末へ同期
- ⚡ 5秒チャレンジ+ — 挑戦者・サーバー時刻・ホスト判定を同期

Online Partyは `sync → bomb → five → sync → bomb → five` の6ラウンドです。各ラウンドの生スコアを 3 / 2 / 1 / 0 Party Pointへ正規化します。

## Architecture

```text
GitHub Pages client
  ├ src/app.js
  ├ src/remote.js
  ├ src/core/room-transport.js
  └ local game modules
          │
          │ HTTPS / WebSocket
          ▼
Cloudflare Worker
          │
          ▼
Durable Object (one object per room)
  ├ player/session tokens
  ├ authoritative room state
  ├ game state
  └ WebSocket fan-out
```

## Tests

```bash
npm test
```

GitHub Actions runs tests and syntax checks for every PR and push to `main`.

## Deploy the room server

```bash
npm run worker:deploy
```

After deploying, open Party Pocket → `Online β` and paste the resulting `https://...workers.dev` URL once. The URL is stored on that device and is automatically included in invitation links.

Detailed setup: `worker/README.md` and `docs/MULTI_DEVICE.md`.
