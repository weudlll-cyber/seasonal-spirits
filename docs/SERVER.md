# The match server (`apps/server`) — Seasonal Sumo prototype

The server is the only truth. It runs `packages/game-core` on a fixed 20 Hz loop, takes
inputs from players, fills empty slots with bots, plays match after match, and sends one
binary state message per tick to every player and spectator. Development only until the
website sign-in is wired in: it refuses to start with `NODE_ENV=production`.

## Files

| File                 | What it holds                                                         |
| -------------------- | --------------------------------------------------------------------- |
| `src/main.ts`        | Reads and validates the environment, starts the server                |
| `src/server.ts`      | The tick loop, the WebSocket handler, connection bounds, metrics      |
| `src/match-host.ts`  | The seats (bot, player, standing ghost), the match lifecycle          |
| `src/wire.ts`        | Game state → wire state: per-ghost values, the arena, the team scores |
| `src/http-routes.ts` | `/metrics-lite` (loopback only), everything else 404                  |
| `src/env.ts`         | `envInt`, `envChoice`, `refuseProduction` — shared with the probe     |

## The loop

`setInterval` at 1 ms with drift correction: wall time accumulates and as many 50 ms steps
run as fit into it, so a late callback catches up instead of slowing the match. Each step:
the host advances one tick (`dt` = 50 ms — the game core has no clock of its own), the state
is encoded once and sent to every client that has said hello.

## Slots and players

- A match has `GHOSTS` seats (32: 8 per team); seat `i` is team `i mod 4`. Bots only fill
  seats without a player (owner requirement 2026-11-17), each a human-like bot seeded from
  the match and its seat (game-core `createBot`, docs/GAME-CORE.md "Bots").
- A player who says `{"kind":"player"}` takes a bot's seat on the team with the fewest players
  at once — the ghost stops where the bot left it (`halt`) — and gets one text message `{"kind":"welcome","ghost":<id>,"team":<0..3>,"name":"Player <id>"}`.
  When every slot has a player, the client becomes a spectator and gets
  `{"kind":"spectating","reason":"full"}`; from then on it must send nothing (THREATS 12b).
  Names are `ghostName` in `packages/protocol`, the same on every client, until the website
  provides them.
- A player sends `{"kind":"input","dx":…,"dy":…}` (direction) and
  `{"kind":"action","action":"dash"}` (the one action). An action is used once, in the next
  tick. Whether it does anything is the game core's decision: a dash during its cooldown does
  nothing (docs/THREATS.md, rows 18, 37). Seasonal Spirits' actions (secure, steal, swap) and
  team signals are refused by the validator like any unknown message.
- A player who disconnects leaves the ghost standing for `reconnectGraceMs` (12 s,
  CONCEPT.md §8: 10–15 s); then a bot takes over. Without the website sign-in a returning
  player cannot be recognised yet, so a reconnect is a new player.
- A spectator says `{"kind":"spectator"}` and sends nothing after that.

## Match lifecycle

A match runs 5:00. At the end the state carries the `STATE_RESULT` flag (the final knockouts)
for `resultPauseMs` (15 s, placeholder); then the next match starts with the next seed, the
same players in the same seats, everyone back on the start ring. A server restart
loses the running match (CONCEPT.md §7).

**Match recap**: in the tick a match ends every client — players and spectators — gets one
text message `{"kind":"recap","teams":[…4],"players":[{ghost,team,knockouts},…],
"awards":{bestPusher?,survivor?}}`: the core's result and the awards (`noteAwards`,
`survivorOf`, docs/GAME-CORE.md); an award
nobody earned is left out. A client that says hello during the result pause gets the same
recap right after its welcome. Read by the shared `parseServerMessage` (`readRecap`: every
field checked, at most 64 players, at most 4096 characters; THREATS row 33). Built in
`src/recap.ts`; `src/client-record.ts` holds one client's record and message budget.

## The state message (`packages/protocol/src/state.ts`)

One binary encoding, little endian:

- **Header, 36 bytes:** tick u32, server ms u32, match ms u32, current season u8 (0 Spring …
  3 Winter; the next is +1), season number within the match u8, ms left in the season u32,
  countdown to the next deadline u16 (0xffff = none; the 10 s before every halving and the
  match end), flags u8 (a halving in this tick, result, the next deadline is the match end
  `STATE_TO_END`, the match ended in this tick `STATE_MATCH_END_EVENT`), ms to the next match
  u16 (during the result), knockouts per team 4×u16, the arena's radius now and after the
  next halving u16 each (in tenths of a field unit), ghost count u8.
- **Per ghost, 13 bytes:** id u8, x u16, y u16, speed vx and vy i16 (units/s: the own ghost's
  prediction starts from it), team u8, knockouts u8, ms to its next dash u8 (in 20 ms steps:
  the Dash button's ring), flags u8 (bot, dashing, falling, out, protected).

At 32 ghosts: 452 bytes, every tick — under 1 KB (Seasonal Spirits' coins and offers are
gone; the probe runs of docs/PHASE0.md were measured with older layouts).

## Bounds and checks

Every message passes `parseClientMessage` first; frames above 256 bytes are refused by the
WebSocket server; every message counts against 20 per second; a connection that has not
said hello within 10 s is closed; connections are bounded per address (40 in development)
and in total (twice the slots). The full list, with the test for each, is
[THREATS.md](THREATS.md).

## Environment

| Variable                      | Default   | Range                                              |
| ----------------------------- | --------- | -------------------------------------------------- |
| `PORT`                        | 3930      | 1–65535                                            |
| `TICK_HZ`                     | 20        | 1–60                                               |
| `GHOSTS`                      | 32        | 4–252                                              |
| `MAX_INPUTS_PER_SECOND`       | 20        | 1–1000                                             |
| `MAX_CONNECTIONS_PER_ADDRESS` | 40        | 1–1000                                             |
| `SEED`                        | 1         | 0–999999999                                        |
| `HOST`                        | 127.0.0.1 | `127.0.0.1` or `0.0.0.0` (`pnpm dev --lan`)        |
| `SEASON_SECONDS`              | 75        | 15–75 (a match is four seasons; shorter for tests) |
| `RESULT_SECONDS`              | 15        | 3–60                                               |

Other game numbers are not environment variables: they live in
`packages/game-core/src/config.ts`. The whole server is development only (it refuses
`NODE_ENV=production`), the short match and the LAN address with it.

## `/metrics-lite`

`GET` from a loopback address only: achieved Hz, max tick ms, CPU % of one core, clients,
players, ghosts, last and largest state bytes, uptime. CORS `*` only in development, for the
viewer on its own port.
