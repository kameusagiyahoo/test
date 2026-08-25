# Multi-device architecture

Party Pocket v4 implements the first complete multi-device path.

## Runtime topology

```text
Phone A (host) ─┐
Phone B         ├── HTTPS / WebSocket ── Cloudflare Worker
Phone C         ┘                            │
                                            ▼
                                    Durable Object / room
                                            │
                              authoritative game session
```

One room code maps deterministically to one Durable Object instance.

## Implemented room flow

1. Host creates a room.
2. Worker allocates a six-character room code.
3. Host receives a player ID/token.
4. Guests join with room code + display name and receive their own player ID/token.
5. Each client upgrades to WebSocket.
6. Durable Object stores the authoritative state and broadcasts personalized snapshots.
7. Client reconnects automatically with its stored player credentials.

## Visibility rules

### Public
- player names / connection state
- Party scores
- current game and public prompt
- turn / bomb number / timer state

### Private until reveal
- another player's Sync answer
- player/session tokens

## Intent protocol

Clients submit intentions, never final scores.

- `START_PARTY`
- `NEXT_ROUND`
- `RESTART_PARTY`
- `SYNC_ANSWER`
- `BOMB_MOVE`
- `BOMB_PASS`
- `FIVE_START`
- `FIVE_JUDGE`

The Durable Object validates actor, turn and phase before mutating state.

## Party schedule

```text
R1 sync
R2 bomb
R3 five
R4 sync
R5 bomb
R6 five
```

Each round converts raw score to Party Points using unique score ranks: first +3, second +2, third +1, remaining +0. Tied scores receive the same rank award.

## WebSocket lifecycle

The server uses Cloudflare's Hibernation WebSocket API. Each accepted socket stores its player ID in a serialized attachment so the Durable Object can recover connection identity after hibernation.

## Remaining production work

- Deploy Worker and configure its workers.dev URL in the client.
- Add QR rendering (share-link flow already works).
- Add room expiry/alarm cleanup.
- Add rate limiting for room creation/join attempts.
- Add reconnect grace period before showing a player offline.
- Add host transfer if the host permanently leaves.
- Add integration tests against `wrangler dev`.
- Optionally move the static frontend from GitHub Pages to Cloudflare for a single-origin deployment.
