# The match server (`apps/server`)

The server is the only truth. It runs `packages/game-core` on a fixed 20 Hz loop, takes
inputs from players, fills empty slots with bots, plays match after match, and sends one
binary state message per tick to every player and spectator. Development only until the
website sign-in is wired in: it refuses to start with `NODE_ENV=production`.

## Files

| File                 | What it holds                                                           |
| -------------------- | ----------------------------------------------------------------------- |
| `src/main.ts`        | Reads and validates the environment, starts the server                  |
| `src/server.ts`      | The tick loop, the WebSocket handler, connection bounds, metrics        |
| `src/match-host.ts`  | The slots (bot, player, standing ghost), the match lifecycle            |
| `src/wire.ts`        | Game state → wire state: per-ghost values, the shrine offers of players |
| `src/http-routes.ts` | `/metrics-lite` (loopback only), everything else 404                    |
| `src/env.ts`         | `envInt`, `envChoice`, `refuseProduction` — shared with the probe       |

## The loop

`setInterval` at 1 ms with drift correction: wall time accumulates and as many 50 ms steps
run as fit into it, so a late callback catches up instead of slowing the match. Each step:
the host advances one tick (`dt` = 50 ms — the game core has no clock of its own), the state
is encoded once and sent to every client that has said hello.

## Slots and players

- A match has `GHOSTS` slots (32, CONCEPT.md §4); slot `i` is team `i mod 4`. A slot is
  steered by a bot (patient, cautious or hunter, as in `pnpm simulate`) until a player
  joins.
- A player who says `{"kind":"player"}` replaces a bot on the team with the fewest players
  and gets one text message `{"kind":"welcome","ghost":<id>,"team":<0..3>,"name":"Player <id>"}`.
  When every slot has a player, the client becomes a spectator and gets
  `{"kind":"spectating","reason":"full"}`; from then on it must send nothing (THREATS 12b).
  Names are `ghostName` in `packages/protocol`, the same on every client, until the website
  provides them.
- A player sends `{"kind":"input","dx":…,"dy":…}` (direction) and
  `{"kind":"action","action":"steal"|"secure"|"swap"}` (the one action; at the own shrine
  secure or swap). An action is used once, in the next tick. Whether it does anything is the
  game core's decision (docs/THREATS.md, rows 13–18).
- A player who disconnects leaves the ghost standing for `reconnectGraceMs` (12 s,
  CONCEPT.md §8: 10–15 s); then a bot takes over. Without the website sign-in a returning
  player cannot be recognised yet, so a reconnect is a new player.
- A spectator says `{"kind":"spectator"}` and sends nothing after that.
- After a steal, the two players involved — and nobody else — get one text message
  `{"kind":"steal","thief":<id>,"victim":<id>,"coins":<n>}` in the tick it happened (none
  during the result pause; THREATS row 29). The state flag `GHOST_CAN_STEAL` (16) marks
  every ghost whose steal would take something now (the core's `canSteal`; THREATS row 30);
  `GHOST_SHIELDED` (32) every ghost carrying swapped, steal-proof coins (the core's
  `carriesShielded`; THREATS row 31).
- `SCENARIO` (browser specs only, like the whole server development only; `src/scenario.ts`;
  `none` is the default): `steal` places every joining player in the middle of the field
  with 6 coins beside an opponent hunter carrying nothing; `shield` places it in its own
  shrine with `swapMinIn` coins of the season beside an opponent that carries only swapped
  coins and stands still (no bot steers it, as for a disconnected player).

## Match lifecycle

A match runs 5:00. At the end the state carries the `STATE_RESULT` flag (the final secured
values) for `resultPauseMs` (15 s, placeholder); then the next match starts with the next
seed, the same players in the same slots, everyone back at the shrines. A server restart
loses the running match (CONCEPT.md §7).

## The state message (`packages/protocol/src/state.ts`)

One binary encoding, little endian; values (secured, offers) travel in halves:

- **Header, 34 bytes:** tick u32, server ms u32, match ms u32, current season u8 (0 Spring …
  3 Winter; the next is +1), season number within the match u8 (the start season is season −
  number), ms left in the season u32, countdown to the next deadline u16 (0xffff = none; set
  in the 10 s before every season turn, CONCEPT.md §13, and since 2026-11-16 before the match
  end), flags u8 (a halving in this tick — the season field is then the new season —,
  result, the next deadline is the match end `STATE_TO_END` — the server says it, the
  client shows "LAST CHANCE — secure now" —, the match ended in this tick
  `STATE_MATCH_END_EVENT` — "MATCH OVER"), ms to the next match u16 (during the result),
  secured value per team 4×u16, ghost count u8, coin count u8, offer count u8.
- **Per ghost, 13 bytes:** id u8, x u16, y u16, team u8, carried coins u16, of those not of
  the current season (worth half now) u16, secured value u16, flags u8 (carrier, securing,
  bot, in its own shrine, can steal, carries steal-proof coins).
- **Per field coin, 4 bytes:** x u16, y u16 (every field coin is of the current season).
- **Per offer, 9 bytes:** for each player (never a bot) inside its own shrine: ghost u8, the
  secure value, the swap's coin count of the next season, its value now and later — the
  numbers on the two shrine buttons, computed by the game core (`shrineOffer`).

At 32 ghosts: 450 bytes with an empty field, 690 with a full one (60 coins), 978 in the
worst case (a full field and 32 players in their shrines) — under 1 KB. Measured in a full
32-bot match (seed 1): at most 550 bytes (25 field coins). The probe runs of docs/PHASE0.md
("Against the match server") were measured with the older 38-byte header and 9-byte ghosts.

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
