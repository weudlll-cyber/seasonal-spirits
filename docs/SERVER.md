# The match server (`apps/server`)

The server is the only truth. It runs `packages/game-core` on a fixed 20 Hz loop, takes
inputs from players, fills empty slots with bots, plays match after match, and sends one
binary state message per tick to every player and spectator. Development only until the
website sign-in is wired in: it refuses to start with `NODE_ENV=production`.

## Files

| File                 | What it holds                                                                   |
| -------------------- | ------------------------------------------------------------------------------- |
| `src/main.ts`        | Reads and validates the environment, starts the server                          |
| `src/server.ts`      | The tick loop, the WebSocket handler, connection bounds, metrics                |
| `src/match-host.ts`  | The slots (bot, player, standing ghost), the match lifecycle, game → wire state |
| `src/http-routes.ts` | `/metrics-lite` (loopback only), everything else 404                            |
| `src/env.ts`         | `envInt`, `refuseProduction` — shared with the probe                            |

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
  and gets one text message `{"kind":"welcome","ghost":<id>,"team":<0..3>}`. When every
  slot has a player, the connection is closed (1008).
- A player sends `{"kind":"input","dx":…,"dy":…}` (direction) and
  `{"kind":"action","action":"steal"|"secure"|"swap"}` (the one action; at the own shrine
  secure or swap). An action is used once, in the next tick. Whether it does anything is the
  game core's decision (docs/THREATS.md, rows 13–18).
- A player who disconnects leaves the ghost standing for `reconnectGraceMs` (12 s,
  CONCEPT.md §8: 10–15 s); then a bot takes over. Without the website sign-in a returning
  player cannot be recognised yet, so a reconnect is a new player.
- A spectator says `{"kind":"spectator"}` and sends nothing after that.

## Match lifecycle

A match runs 5:00. At the end the state carries the `STATE_RESULT` flag (the final secured
values) for `resultPauseMs` (15 s, placeholder); then the next match starts with the next
seed, the same players in the same slots, everyone back at the shrines. A server restart
loses the running match (CONCEPT.md §7).

## The state message (`packages/protocol/src/state.ts`)

One binary encoding, little endian:

- **Header, 30 bytes:** tick u32, server ms u32, match ms u32, current season u8 (0 Spring …
  3 Winter; the next is +1), ms left in the season u32, countdown to the next halving u16
  (0xffff = none; set in the 10 s before every season turn, CONCEPT.md §13), flags u8 (a
  halving in this tick — the season field is then the new season —, result), secured value
  per team 4×u16 (in halves), ghost count u8, coin count u8.
- **Per ghost, 9 bytes:** id u8, x u16, y u16, team u8, carried coins u16, flags u8 (carrier,
  securing, bot).
- **Per field coin, 4 bytes:** x u16, y u16 (every field coin is of the current season).

At 32 ghosts: 318 bytes with an empty field, 558 bytes with a full one (60 coins). Measured
in a full 32-bot match (seed 1): at most 418 bytes (25 field coins). The probe runs of
docs/PHASE0.md ("Against the match server") were measured with the older 38-byte header.

## Bounds and checks

Every message passes `parseClientMessage` first; frames above 256 bytes are refused by the
WebSocket server; every message counts against 20 per second; a connection that has not
said hello within 10 s is closed; connections are bounded per address (40 in development)
and in total (twice the slots). The full list, with the test for each, is
[THREATS.md](THREATS.md).

## Environment

| Variable                      | Default | Range       |
| ----------------------------- | ------- | ----------- |
| `PORT`                        | 3930    | 1–65535     |
| `TICK_HZ`                     | 20      | 1–60        |
| `GHOSTS`                      | 32      | 4–252       |
| `MAX_INPUTS_PER_SECOND`       | 20      | 1–1000      |
| `MAX_CONNECTIONS_PER_ADDRESS` | 40      | 1–1000      |
| `SEED`                        | 1       | 0–999999999 |

Game numbers are not environment variables: they live in `packages/game-core/src/config.ts`.

## `/metrics-lite`

`GET` from a loopback address only: achieved Hz, max tick ms, CPU % of one core, clients,
players, ghosts, last and largest state bytes, uptime. CORS `*` only in development, for the
viewer on its own port.
