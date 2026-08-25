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
- 🌓 少数派 — A/B秘密投票。3人以上は少数派、2人は一致で得点
- 🎯 数字スナイパー — 平均の70%に近い数字を狙う
- 🚫 NGワード説明 — 3つの禁止ワードを避けてお題を説明
- ⏱️ 体内時計 — 表示なしで指定秒数を当てる
- 🃏 ギリギリ10 — 1〜5を引いて10を超えないギリギリを狙う

## Modes

### Single Game

好きな1ゲームを選び、先に5点取った人が勝利。

### Party Mode

8ゲームから毎回6ゲームを抽選して遊びます。ゲーム内の生スコアは各ラウンド終了時に順位化し、Party Pointへ変換します。

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
   ├ five.js
   ├ minority.js
   ├ sniper.js
   ├ taboo.js
   ├ clock.js
   └ ten.js
```

各ゲームは独立したモジュールとして `registerGame()` へ登録します。`mount(ctx)` は画面離脱時のcleanup関数を返せます。

## Tests

```bash
npm test
```

GitHub ActionsでPR / `main` push時にテストと主要JavaScriptの構文チェックを実行します。

## Deploy

`main` にマージすると既存のGitHub Pagesへ反映されます。
