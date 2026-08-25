# Multi-device roadmap

Party Pocket v3 is still local-play-first, but the core now depends on a small transport contract instead of assuming that all state must stay on one device.

## Target architecture

```text
Phone A (host) ─┐
Phone B         ├─ HTTPS / WebSocket ─ Cloudflare Worker
Phone C         ┘                         │
                                         ▼
                                  Durable Object / room
                                         │
                            authoritative game session state
```

## Room flow

1. Host creates a room.
2. Server returns a short room code and QR code target URL.
3. Other phones open the URL and join with a display name.
4. Durable Object owns the authoritative player list, game state, round, scores and turn.
5. Each phone receives only the state it is allowed to see.
6. Secret-answer games send private prompts/choices only to the relevant player.

## Client transport contract

`src/core/transport.js` defines the current contract:

- `connect(...)`
- `disconnect()`
- `subscribe(type, handler)`
- `publish(type, payload)`

The current implementation is `LocalTransport`. A later `CloudflareRoomTransport` can replace it without rewriting the games.

## Important server rules

- Server is authoritative for turn order and score changes.
- Clients submit intents, not final scores.
- Room code alone should not grant host privileges; host gets a separate secret token.
- Reconnect uses a player/session token stored on the device.
- Private answers must not be broadcast to other clients before reveal.
- Rooms should expire automatically after inactivity.

## Next implementation step

Add a Cloudflare Worker + Durable Object WebSocket room server and a `CloudflareRoomTransport` adapter, then add Create Room / Join Room screens to the current web app.
