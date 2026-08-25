# Cloudflare deploy setup

The repository contains a manual GitHub Actions workflow named `deploy-room-worker`.

Before running it, add these repository secrets:

- `CLOUDFLARE_API_TOKEN` — token with Workers Scripts edit permission and Durable Objects access for this account.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID.

Then open GitHub → Actions → `deploy-room-worker` → Run workflow.

After the workflow succeeds, copy the workers.dev URL into Party Pocket → Online β → Cloudflare Worker URL.

Do not commit Cloudflare tokens to this repository.
