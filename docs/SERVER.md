# The match server (`apps/server`) — Seasonal Sumo prototype

The server is the only truth. It runs `packages/game-core` on a fixed 20 Hz loop, takes
inputs from players, fills empty slots with bots, plays match after match, and sends one
binary state message per tick to every player and spectator. Development only until the
website sign-in is wired in: it refuses to start with `NODE_ENV=production`.

## Files

| File                    | What it holds                                                         |
| ----------------------- | --------------------------------------------------------------------- |
| `src/main.ts`           | Reads and validates the environment, starts the server                |
| `src/server.ts`         | The tick loop, the WebSocket handler, connection bounds, metrics      |
| `src/tick-steps.ts`     | The steps due for the wall time passed, with the catch-up bound       |
| `src/client-record.ts`  | One connected client: kind, socket, address, its message budget       |
| `src/recap.ts`          | The match recap message every client gets when a match ends           |
| `src/home-network.ts`   | The LAN mode's home network: its callers and the panel's origins      |
| `src/index.ts`          | The package's exports for the probe                                   |
| `src/test-client.ts`    | A raw WebSocket client for the server tests                           |
| `src/match-host.ts`     | The seats (bot, player, standing ghost), the match lifecycle          |
| `src/next-game.ts`      | The next match's game: the rotation's, or the one the panel started   |
| `src/refresh.ts`        | Deep assign: a settings change reaches the running match's config     |
| `src/wire.ts`           | Game state → wire state: per-ghost values, the arena, the team scores |
| `src/http-routes.ts`    | `/metrics-lite` (loopback only), everything else 404                  |
| `src/admin-settings.ts` | The admin settings endpoint and its one access check (`DEV_TUNING`)   |
| `src/presets.ts`        | Named presets in the dev data folder, checked against the schema      |
| `src/start-settings.ts` | The starting settings: defaults, a preset, the environment            |
| `src/env.ts`            | `envInt`, `envChoice`, `refuseProduction` — shared with the probe     |

## The loop

`setInterval` at 1 ms with drift correction: wall time accumulates and as many 50 ms steps
run as fit into it, so a late callback catches up instead of slowing the match. At most 1 s
is caught up at once (`MAX_CATCH_UP_MS`): after a longer gap — the PC in standby, the process
suspended — the rest is dropped and the match goes on where it stopped, instead of running
every missed step in one go and answering no connection for minutes. Each step:
the host advances one tick (`dt` = 50 ms — the game core has no clock of its own), the state
is encoded once and sent to every client that has said hello.

## Slots and players

- A match has four times the `teamSize` setting seats (32: 8 per team; `GHOSTS` sets it at the
  start), taken at a match's start; seat `i` is team `i mod 4`. Bots only fill
  seats without a player (owner requirement 2026-11-17), each a human-like bot seeded from
  the match and its seat (game-core `createBot`, docs/GAME-CORE.md "Bots").
- A player who says `{"kind":"player"}` takes a bot's seat on the team with the fewest players
  at once — the ghost stops where the bot left it, with dash and jump ready (`halt`) — and gets one text message `{"kind":"welcome","ghost":<id>,"team":<0..3>,"name":"Player <id>"}`.
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

Each match takes the next slot of the rotation (the settings `rotation1`…`rotation6`, game-core
`rotationOf`): Sumo with the variant setting (Points, Last One Standing, or both in turn),
Sumo Points, Sumo Last One Standing, King of the Season or Halving Bomb (docs/GAME-CORE.md "Game
modes", "Lives and the two variants"). `GAME_MODE` names one mode, or `rotate` — Sumo Points,
King of the Season, Halving Bomb, Sumo Last One Standing — which `pnpm dev` asks for unless a
preset was loaded last (development only, like the whole server).
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
"players":[{ghost,team,score,outMs},…],"awards":[{kind,ghost,value},…]}`: the core's result —
the mode's score, the ghosts still in per team, the teams knocked out in order, Last One
Standing's winning team (null in Points: the scores rank), each player's match time when it lost
its last life (`outMs`, whole ms, null while still in; 2026-11-20) — and the mode's two awards (`awardsOf`,
docs/GAME-CORE.md); an award nobody earned is left out, and a client
shows the kinds it knows. A client that says hello during the result pause gets the same
recap right after its welcome. Read by the shared `parseServerMessage` (`readRecap`: every
field checked, at most 64 players and 8 awards, at most 4096 characters; THREATS row 33). Built in
`src/recap.ts`; `src/client-record.ts` holds one client's record and message budget.

## The state message (`packages/protocol/src/state.ts`)

One binary encoding, little endian:

- **Header, 48 bytes:** tick u32, server ms u32, match ms u32, current season u8 (0 Spring …
  3 Winter; the next is +1), season number within the match u8, ms left in the season u32,
  countdown to the next deadline u16 (0xffff = none; the 10 s before every halving and the
  match end), flags u8 (a halving in this tick, result, the next deadline is the match end
  `STATE_TO_END`, the match ended in this tick `STATE_MATCH_END_EVENT`, sumo's variant is Last
  One Standing `STATE_LAST_STANDING`, no deadline at all `STATE_OPEN_END`), ms to the next match
  u16 (during the result), the mode's score per team 4×u16, the game mode u8 (its index in
  game-core's `GAME_MODES`), the disc that halves now — sumo's arena, the hill's zone — and
  after the next halving, each x, y, r u16 (tenths of a field unit; r 0 = none, as in bomb),
  ghost count u8, every ghost's lives at the match start u8 (the hearts), the walls' half side
  now u16 (tenths; hill and bomb — they close in at a halving, 2026-11-19; 0 in sumo).
- **Per ghost, 17 bytes:** id u8, x u16, y u16, speed vx and vy i16 (units/s: the own ghost's
  prediction starts from it), team u8 (bits 0–1 the team, bit 2 a dash winding up, bits 3–7
  its direction in 32 steps), the mode's score u16, ms to its next dash u8 (in 20 ms
  steps: the Dash button's ring), flags u16 (bot, dashing, falling, out, protected, carries a
  bomb, in the air, a dash passed under it in the air in this tick — "Dodged!", it just passed a
  bomb on and may not take it back yet — the return lock, 2026-11-19), lives left u8 (0: out until the next match), ms to its next jump u8 (20 ms
  steps: the Jump button's ring).

At 32 ghosts: 592 bytes, every tick — under 1 KB (Seasonal Spirits' coins and offers are
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
| `GHOSTS`                      | 32        | 4–48, a multiple of 4 (the team size × 4)       |
| `MAX_INPUTS_PER_SECOND`       | 20        | 1–1000                                          |
| `MAX_CONNECTIONS_PER_ADDRESS` | 40        | 1–1000                                          |
| `SEED`                        | 1         | 0–999999999                                     |
| `HOST`                        | 127.0.0.1 | `127.0.0.1` or `0.0.0.0` (`pnpm dev --lan`)     |
| `GAME_MODE`                   | —         | `sumo`, `hill`, `bomb` or `rotate` (`pnpm dev`) |
| `SUMO_VARIANT`                | points    | `points`, `last-standing` or `alternate` (dev)  |
| `SUMO_LIVES`                  | 3         | 1–9 (the browser specs: 9)                      |
| `SEASON_SECONDS`              | 75        | 15–75: four seasons in every mode (tests)       |
| `PRESET_DIR`                  | data/…    | where presets live (the browser specs' own)     |
| `RESULT_SECONDS`              | 15        | 3–60                                            |
| `DEV_TUNING`                  | 0         | `0` or `1` (`pnpm dev`: the admin settings)     |
| `PRESET`                      | —         | a saved preset's name to start with             |
| `CLIENT_PORT`                 | 5930      | 1–65535 (its `/admin/` page may tune)           |

Other game numbers are not environment variables: they are settings in
`packages/game-core/src/settings-list.ts` (the table: [SETTINGS.md](SETTINGS.md)); unset, `GAME_MODE`
leaves the settings' rotation (Sumo). The whole server is development only (it refuses
`NODE_ENV=production`), the short match and the LAN address with it.

## `/metrics-lite`

`GET` from a loopback address only: achieved Hz, max tick ms, CPU % of one core, clients,
players, ghosts, last and largest state bytes, uptime. CORS `*` only in development, for the
viewer at `/viewer/` and `/admin/` on the client's port.

## Settings and presets (development only until the game's admin login exists)

Every number that shapes play is a setting in one schema (game-core `settings.ts`, the table in
[SETTINGS.md](SETTINGS.md), generated by `pnpm settings:doc`): its key, label, unit, range,
step, default, the modes it belongs to, and whether it applies **now** — in the running match:
the host takes those at once (`MatchHost.tune`, game-core `nowPart`), the running arena eases to
a new size like a halving, the bots get the new numbers — or from the **next match** (lives,
the variant, the seats, the match and season lengths, the field sizes, the rotation). The server
starts with the defaults, then a preset (`PRESET`, or with the admin endpoint on the one loaded
last), then the environment's overrides (`GAME_MODE`, `SUMO_VARIANT`, `SUMO_LIVES`,
`SEASON_SECONDS`, `RESULT_SECONDS`, `GHOSTS`), all checked against the schema
(`start-settings.ts`). Every client gets the settings in force as `{"kind":"tuning","values":…}` on
its hello, after a change and at every new match (public: the rules everyone plays by), and
predicts and draws with them.

The admin panel (the viewer's page at http://localhost:5930/admin/ on the client's address, one
address since 2026-11-21, with `DEV_TUNING=1`, which `pnpm dev` sets; apps/viewer `admin-panel.ts`, `admin-form.ts`, `admin-api.ts`) is built around one flow —
choose the game, see and set its values, start — and generated from the schema, its groups
Movement, Dash & push, Jump, Falling & respawn, Match flow, Bots — general, Bots — endgame, Sumo,
King of the Season, Halving Bomb, Rotation. It folds to a small "◂ Admin" tab in the top right
corner, so the field's corner is free, and remembers that across reloads (`panel-fold.ts`,
2026-11-19). Two tabs:

- **Next match** (opens first): four large buttons — Sumo · Points, Sumo · Last One Standing,
  King of the Season, Halving Bomb; nothing below until one is chosen. Then a draft of its values,
  copied from the settings in force: the shared groups and that game's group only, every row of
  another game hidden; groups collapsible (Movement, Dash & push and the game's open at first;
  open or closed remembered in the browser); each row with its unit and "now" or "next match", a
  Reset to the schema's defaults per group. Editing the draft changes nothing on the server.
  Presets: one read into the draft, the draft saved as one. Then **Start <game>** and the switch
  **Keep playing this game**: the game and the draft in one request — the running match ends at
  once (no result pause, no recap) and the chosen game starts through the normal start;
  afterwards the rotation goes on, or with the switch on the same game follows until it is
  switched off or another game is started (a development session flag of the server,
  `next-game.ts`, not a setting).
- **Running match**: the running game's name and time left, its values only (the same groups
  and hiding) and the Rotation, live as before — "now" rows at once, "next match" rows from the
  next match; the keep switch; presets loaded into it, the current settings saved as one.

A preset is a JSON file in the git-ignored dev data folder `data/presets/` (`presets.ts`), checked
against the schema when saved and when loaded or read (an invalid or unknown value is refused,
never applied); `pnpm dev` starts with the last loaded one (deleting it clears that mark, and the
modes rotate again).

The panel talks to one endpoint, `GET` / `POST /api/v1/admin/settings` (`admin-settings.ts`; the
path follows the sibling games' admin routes), with one access check in front of it,
`adminAccess` — today the dev flag, loopback (in the LAN mode also the home network) and the
panel's origin; later the game's own admin
login (CONCEPT.md section 16, BACKLOG OPEN):

- absent (404 like any unknown path) without `DEV_TUNING=1`, and it refuses to exist with
  `NODE_ENV=production` (the whole server does too);
- loopback callers only (anything else: 404), from the panel's page only (the `Origin`
  `http://localhost:5930` or `http://127.0.0.1:5930`, the client's port, else 403); in the LAN
  mode (`HOST=0.0.0.0`, set only by `pnpm dev --lan`) also home-network callers (RFC 1918:
  10/8, 172.16/12, 192.168/16, also IPv4-mapped) from the panel's page on one of this machine's
  own home-network addresses (`http://192.168.1.20:5930`, read from its network interfaces, no
  pattern; `home-network.ts`; owner decision 2026-11-21: /admin from the phone), `content-type:
application/json` only (415), so another page cannot reach it without the browser's
  preflight, which only the panel's origin passes;
- a body of at most 4096 bytes (413) holding one command: `apply` with every setting, each in its
  range and on its step (400 otherwise, nothing applied); `start` with a `game` — one of the four
  above, checked against the rotation slots (game-core `startableGame`) — every setting and
  `keep` true or false (400 otherwise, nothing started); `keep` with `on` true or false; `save`
  (with the panel's draft as `settings`, checked against the schema, or without: the current
  settings) / `load` (applied) / `read` (handed to the draft, nothing applied) / `delete` with a
  preset name of 1–32 lowercase letters, digits and dashes (400), an unknown preset 404, a stored
  one that does not pass the schema 422 (not used), at most 50 presets (409); at most 20 commands
  a second (429); the answer: the settings, the preset names, the keep switch;
- never through the player message validator: `parseClientMessage` still takes a hello, a
  direction and the two actions only. [THREATS.md](THREATS.md) rows 39 and 42.
