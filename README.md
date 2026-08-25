# Party Pocket v3

2〜8人で遊べる、モジュール式パーティーゲーム基盤です。現在はスマホ1台を回すローカルモードを実装済みで、複数スマホ対応に向けたTransport層も追加しています。

## Games

- 🎯 シンクロ — 4択 / 自由回答の一致ゲーム
- 💣 21ボム+ — ランダム爆発位置 + PASS
- ⚡️ 5秒チャレンジ+ — EASY / NORMAL / HARD

## Party Mode

3ゲームを各2回ずつ、合計6ラウンド。各ゲーム内の生スコアはラウンド終了時に順位化し、Party Pointへ変換します。

- 1位グループ: +3 Party pt
- 2位グループ: +2 Party pt
- 3位グループ: +1 Party pt
- それ以下: +0

同点は同じParty Pointを獲得します。

## Architecture

```text
src/
├ core/
│  ├ session.js       # player / local score / party score / schedule
│  ├ registry.js      # game registry
│  └ transport.js     # local/remote transport abstraction
├ games/
│  ├ sync.js
│  ├ bomb.js
│  └ five.js
└ app.js
```

各ゲームの `mount(ctx)` は終了時cleanup関数を返せます。画面離脱時にタイマー等を破棄するためのGame Lifecycleとして使用します。

## Tests

```bash
npm test
```

GitHub ActionsでもPR / main push時にNode.jsテストを実行します。

## Multi-device

次段階では Cloudflare Workers + Durable Objects + WebSocket を使い、ルームコードで複数端末が参加できる構成にします。設計方針は `docs/MULTI_DEVICE.md` を参照してください。

GitHub Pages側は引き続きビルド不要のNative ES Modulesで動作します。
