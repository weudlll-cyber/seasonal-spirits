# The match server (`apps/server`) — Seasonal Sumo prototype

The server is the only truth. It runs `packages/game-core` on a fixed 20 Hz loop, takes
inputs from players, fills empty slots with bots, plays match after match, and sends one
binary state message per tick to every player and spectator. Development only until the
website sign-in is wired in: it refuses to start with `NODE_ENV=production`.

## Files

| File                  | What it holds                                                         |
| --------------------- | --------------------------------------------------------------------- |
| `src/main.ts`         | Reads and validates the environment, starts the server                |
| `src/server.ts`       | The tick loop, the WebSocket handler, connection bounds, metrics      |
| `src/match-host.ts`   | The seats (bot, player, standing ghost), the match lifecycle          |
| `src/wire.ts`         | Game state → wire state: per-ghost values, the arena, the team scores |
| `src/http-routes.ts`  | `/metrics-lite` (loopback only), everything else 404                  |
| `src/tuning-route.ts` | `/dev/tune`: the owner's live tuning sliders (only with `DEV_TUNING`) |
| `src/env.ts`          | `envInt`, `envChoice`, `refuseProduction` — shared with the probe     |

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
  `{"kind":"action","action":"dash"}` or `"jump"` (JUMP 2026-11-17). An action is used once, in
  the next tick. Whether it does anything is the game core's decision: a dash or a jump during
  its cooldown, a dash in the air or a jump with the owner's switch off does nothing
  (docs/THREATS.md, rows 18, 37, 41). Seasonal Spirits' actions (secure, steal, swap) and
  team signals are refused by the validator like any unknown message.
- A player who disconnects leaves the ghost standing for `reconnectGraceMs` (12 s,
  CONCEPT.md §8: 10–15 s); then a bot takes over. Without the website sign-in a returning
  player cannot be recognised yet, so a reconnect is a new player.
- A spectator says `{"kind":"spectator"}` and sends nothing after that.

## Match lifecycle

Each match has a game mode (docs/GAME-CORE.md "Game modes"): `GAME_MODE` names one, or
`rotate` lets them take turns match by match — sumo → hill → bomb → sumo … (development only,
like the whole server). Each sumo match plays one variant (docs/GAME-CORE.md "Lives and the two
variants"): `SUMO_VARIANT` names `points` or `last-standing`, or `alternate` takes them in turn,
Points first (`pnpm dev`: Sumo only, alternating — the owner's dev default, LIVES 2026-11-17).
Seats are filled with bots at the start only: a ghost out of lives stays out until the next
match, and a joining player gets a bot's ghost with lives left while there is one. A sumo match
runs 5:00 (Points; Last One Standing per its setting after the last season), hill and bomb
3:00; Points ends earlier once only one team has ghosts left, Last One Standing once one ghost
is. At the end the state carries the `STATE_RESULT` flag (the final scores) for
`resultPauseMs` (15 s, placeholder); then the next match starts with the next mode and seed,
the same players in the same seats, everyone back on the start ring, and every bot gets the
new mode's brain. A server restart loses the running match (CONCEPT.md §7).

**Match recap**: in the tick a match ends every client — players and spectators — gets one
text message `{"kind":"recap","teams":[…4],"left":[…4],"knockedOut":[team,…],"winner":team|null,
"players":[{ghost,team,score},…],"awards":[{kind,ghost,value},…]}`: the core's result — the
mode's score, the ghosts still in per team, the teams knocked out in order, Last One Standing's
winning team (null in Points: the scores rank) — and the mode's two awards (`awardsOf`,
docs/GAME-CORE.md); an award nobody earned is left out, and a client
shows the kinds it knows. A client that says hello during the result pause gets the same
recap right after its welcome. Read by the shared `parseServerMessage` (`readRecap`: every
field checked, at most 64 players and 8 awards, at most 4096 characters; THREATS row 33). Built in
`src/recap.ts`; `src/client-record.ts` holds one client's record and message budget.

## The state message (`packages/protocol/src/state.ts`)

One binary encoding, little endian:

- **Header, 46 bytes:** tick u32, server ms u32, match ms u32, current season u8 (0 Spring …
  3 Winter; the next is +1), season number within the match u8, ms left in the season u32,
  countdown to the next deadline u16 (0xffff = none; the 10 s before every halving and the
  match end), flags u8 (a halving in this tick, result, the next deadline is the match end
  `STATE_TO_END`, the match ended in this tick `STATE_MATCH_END_EVENT`, sumo's variant is Last
  One Standing `STATE_LAST_STANDING`, no deadline at all `STATE_OPEN_END`), ms to the next match
  u16 (during the result), the mode's score per team 4×u16, the game mode u8 (its index in
  game-core's `GAME_MODES`), the disc that halves now — sumo's arena, the hill's zone — and
  after the next halving, each x, y, r u16 (tenths of a field unit; r 0 = none, as in bomb),
  ghost count u8, every ghost's lives at the match start u8 (the hearts).
- **Per ghost, 16 bytes:** id u8, x u16, y u16, speed vx and vy i16 (units/s: the own ghost's
  prediction starts from it), team u8, the mode's score u16, ms to its next dash u8 (in 20 ms
  steps: the Dash button's ring), flags u8 (bot, dashing, falling, out, protected, carries a
  bomb, in the air), lives left u8 (0: out until the next match), ms to its next jump u8 (20 ms
  steps: the Jump button's ring).

At 32 ghosts: 558 bytes, every tick — under 1 KB (Seasonal Spirits' coins and offers are
gone; the probe runs of docs/PHASE0.md were measured with older layouts).

## Bounds and checks

Every message passes `parseClientMessage` first; frames above 256 bytes are refused by the
WebSocket server; every message counts against 20 per second; a connection that has not
said hello within 10 s is closed; connections are bounded per address (40 in development)
and in total (twice the slots). The full list, with the test for each, is
[THREATS.md](THREATS.md).

## Environment

| Variable                      | Default   | Range                                           |
| ----------------------------- | --------- | ----------------------------------------------- |
| `PORT`                        | 3930      | 1–65535                                         |
| `TICK_HZ`                     | 20        | 1–60                                            |
| `GHOSTS`                      | 32        | 4–252                                           |
| `MAX_INPUTS_PER_SECOND`       | 20        | 1–1000                                          |
| `MAX_CONNECTIONS_PER_ADDRESS` | 40        | 1–1000                                          |
| `SEED`                        | 1         | 0–999999999                                     |
| `HOST`                        | 127.0.0.1 | `127.0.0.1` or `0.0.0.0` (`pnpm dev --lan`)     |
| `GAME_MODE`                   | sumo      | `sumo` (`pnpm dev`), `hill`, `bomb` or `rotate` |
| `SUMO_VARIANT`                | points    | `points`, `last-standing` or `alternate` (dev)  |
| `SUMO_LIVES`                  | 3         | 1–9 (the browser specs: 9)                      |
| `SEASON_SECONDS`              | 75        | 15–75 (sumo: four seasons; shorter for tests)   |
| `RESULT_SECONDS`              | 15        | 3–60                                            |
| `DEV_TUNING`                  | 0         | `0` or `1` (`pnpm dev`: the live tuning)        |
| `VIEWER_PORT`                 | 5931      | 1–65535 (the page allowed to tune)              |

Other game numbers are not environment variables: they live in
`packages/game-core/src/config.ts`. The whole server is development only (it refuses
`NODE_ENV=production`), the short match and the LAN address with it.

## `/metrics-lite`

`GET` from a loopback address only: achieved Hz, max tick ms, CPU % of one core, clients,
players, ghosts, last and largest state bytes, uptime. CORS `*` only in development, for the
viewer on its own port.

## Live tuning (development only)

The owner tunes the feel with a panel instead of guessing numbers round by round
(TUNE and LIVES 2026-11-17). `pnpm dev` starts the server with `DEV_TUNING=1`; the viewer
(http://localhost:5931) then shows: **arena size** (`arenaRadius`, the start; shown as ghost
diameters across), **walking speed** (`maxSpeed`; `acceleration` scales with it), **dash
strength** (`dashSpeed`), **push strength** (`knockSpeed`, how fast a dash hit throws a ghost
off), **lives** (1–9), **sumo variant** (Points / Last One Standing / alternate), **after the
last season** (stop, time limit / keep halving / stop, no time limit), **keep halving every**
(30–120 s), **jump** (off / on; off hides the clients' Jump button), **jump: time in the air**
(0.2–1.5 s) and **jump: cooldown** (0.5–5 s). Each slider shows its number and moves within a wide band around the starting value
(`TUNING_RANGES`, packages/protocol `tuning.ts`; the choices travel as indices). The physics,
the setting after the last season and the jump hold at once in the running match: the match, its rules
and its bots read the host's one config object (`MatchHost.tune`), the running arena eases to
its new size like a halving (`Match.rescaleArena`); lives and the variant hold from the next
match. Every client gets the values as `{"kind":"tuning","values":…}`, so its own ghost's
prediction keeps to the server's rules. **Reset** brings back the starting values; the line
below holds every value to copy, the choices by name (**Copy**).

The channel (`tuning-route.ts`) is `GET` / `POST /dev/tune`:

- absent (404 like any unknown path) without `DEV_TUNING=1`, and the route refuses to exist
  with `NODE_ENV=production` (the whole server does too);
- loopback callers only (anything else: 404), from the viewer's page only (the `Origin`
  `http://localhost:5931` or `http://127.0.0.1:5931`, else 403), `content-type:
application/json` only (415), so another page cannot reach it without the browser's
  preflight, which only the viewer's origin passes;
- a body of at most 256 bytes (413), exactly the eleven keys, each a whole number in its range
  (400 otherwise, nothing applied); at most 20 changes a second (429);
- never through the player message validator: `parseClientMessage` still takes a hello, a
  direction and Dash only. [THREATS.md](THREATS.md) row 39.
