# Party Pocket v2

2〜8人でスマホ1台を回して遊ぶ、モジュール式パーティーゲーム基盤です。

## Game platform

- `src/core/session.js` — プレイヤー、総合スコア、Single / Party Mode、ラウンド進行
- `src/core/registry.js` — ゲームモジュール登録
- `src/games/*.js` — 各ゲームの独立モジュール
- `src/app.js` — ホーム、ゲーム起動、勝敗、Party Mode制御

新しいゲームは `id / title / emoji / description / tags / mount(ctx)` を持つモジュールとして追加し、registry に登録します。

## Games

### シンクロ
4択と自由回答をランダムに使用。全員が秘密に回答し、同じ回答の人数に応じて得点します。

### 21ボム+
爆発数字は18〜30、1ターンに進める数は2〜4の範囲で毎戦変化。各プレイヤーは1戦に1回だけPASSできます。

### 5秒チャレンジ+
EASY / NORMAL / HARD。全員が1回ずつ挑戦して1セットとなり、難易度ごとに制限時間と問題プールが変わります。

## Modes

- Single Game: 先に5点で勝利
- Party Mode: 5ラウンドで3ゲームを巡回し、総合得点で優勝を決定

GitHub Pagesでビルドなしに動作します。
