# Party Pocket Room Server

Cloudflare Workers + Durable Objects + WebSocket Hibernation API を使うオンラインルームサーバーです。

## Deploy

Cloudflareへログインできる環境で、リポジトリルートから実行します。

```bash
npm run worker:deploy
```

初回デプロイ後に表示される `https://party-pocket-room.<subdomain>.workers.dev` を控えます。

GitHub PagesのParty Pocketを開き、`Online β` → `Cloudflare Worker URL` にそのURLを入力してください。端末のlocalStorageに保存されます。

## Local development

```bash
npm run worker:dev
```

## Endpoints

- `GET /health`
- `POST /api/rooms`
- `POST /api/rooms/:code/join`
- `GET /api/rooms/:code/snapshot`
- `GET /api/rooms/:code/ws` (WebSocket upgrade)

## Security model

- ルームコードは発見用であり認証情報ではありません。
- 各プレイヤーにはランダムなplayer tokenを発行します。
- ホスト権限はホストplayer ID + tokenを持つ接続だけに付与されます。
- クライアントは得点を直接送信せず、`INTENT`だけ送ります。
- Durable Objectがターン、回答、得点、ラウンドを検証して更新します。
- シンクロの回答はラウンド終了前に他プレイヤーのsnapshotへ含めません。

## CORS / Origin

`worker/wrangler.jsonc` の `ALLOWED_ORIGINS` にGitHub Pages originを設定済みです。別ドメインへ移行する場合はここを更新してください。
