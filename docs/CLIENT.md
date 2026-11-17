# The player client (`apps/client`) — Seasonal Sumo prototype

Plain TypeScript, Canvas 2D and Vite, no game framework. It sends a direction and the one
action, Dash; everything it shows comes from the server's state message (docs/SERVER.md).
Development mode only: there is no sign-in yet. On `proto/sumo` it plays Seasonal Sumo and
its sister modes, King of the Season and Halving Bomb (docs/GAME-CORE.md "Game modes"); the
mode comes with every state, and field, clock, help, banner and result follow it. Seasonal
Spirits' client is on `master`.

## Files

| File                       | What it holds                                                                    |
| -------------------------- | -------------------------------------------------------------------------------- |
| `src/main.ts`              | Wiring and the frame loop: interpolate, predict, draw, HUD, result, test hook    |
| `src/scene.ts`             | One canvas frame: the camera on the whole playing area, ghosts, labels, clock    |
| `src/storage.ts`           | Remembered choices (mute, help seen) in localStorage, safe when it throws        |
| `src/help.ts`              | The help overlay: the mode's three rules with drawings, "What you see", keys     |
| `src/scores.ts`            | The team scores in the band: the mode's score per team, the leader framed        |
| `src/connection.ts`        | The one WebSocket: hello, welcome or spectating notice, states, recap, tuning    |
| `src/input-sender.ts`      | When the direction goes out: at once on a change, 60 ms apart, never repeated    |
| `src/prediction.ts`        | Where the own ghost is drawn: by the own input and dash, corrected to the server |
| `src/input.ts`             | Keyboard (WASD/arrows, Space to dash) and the touch joystick                     |
| `src/hud.ts`               | The Dash button and its cooldown ring, announcements and flash, notices, mute    |
| `src/result.ts`            | Result screen: the mode's awards, scores per team and player, the bridge box     |
| `src/sound.ts`             | The halving tone (Web Audio)                                                     |
| `src/config.ts`            | Bridge box on/off and its links                                                  |
| `e2e/`                     | Playwright config, helpers and the specs                                         |
| `packages/render` (shared) | The drawing client and viewer share: field per mode, ghosts, bomb, clock, words  |

## Joining and watching

The client says `{"kind":"player"}`; the server gives it a bot's seat on the team with the
fewest players (the ghost stops where the bot left it) and answers with a welcome. When
every seat has a player, the client watches instead and says so. `?spectate=1` only watches:
the whole field, every name, the clock and the halving staging, no controls; it sends its
hello and nothing more.

With the server's live tuning on (`pnpm dev`, [SERVER.md](SERVER.md) "Live tuning") the
client hears the numbers in force (`{"kind":"tuning",…}`, checked by `parseServerMessage`)
and predicts its own ghost with them (`clientConfig(mode, tuning)`), so it does not drift
from the server after a change.

## Controls

- Keyboard: WASD or arrows to move, **Space to dash**, ? the help.
- Touch: a joystick where the left thumb touches the left half; the round **Dash** button
  under the right thumb. Its ring fills while the server's cooldown runs (`dashLeftMs` in the
  state) and it glows when a dash is ready.
- The direction goes out at once when it changes, at most every 60 ms (`SEND_GAP_MS`), never
  twice the same.
- **The own ghost answers at once**: it is drawn where the own input — with momentum, top
  speed and a dash — has already taken it, moved with the server's own rules (`stepGhost`,
  `dashVelocity`, the walls of the mode on screen), pulled smoothly towards the server's position and restarted from the
  server's position and speed when more than `SNAP_DISTANCE` off (a knock it could not see
  coming, a respawn). Display only (THREATS row 36). Every other ghost is drawn 50 ms (one
  tick) behind the newest state, interpolated, and extrapolated from its last two states
  when the next one is late (FIX 2026-11-17-2: at 100 ms another ghost was drawn 2.7 ghost
  radii behind where a dash hit it, at 50 ms 1.8 radii; the drawn path stays smooth).

## Screen

- **Top bar.** The season clock (four seasons — a window that moves on through bomb's nine —,
  the mode's name, the time left, the countdown in red), and
  under it the band: "You are Team <Season>" in the team colour, the corner buttons, and the
  team scores ("Spring 12 · Summer 9 …", the leader framed). The band is 68 px
  (`BAND_HEIGHT`).
- **Field** (render `field.ts`). Sumo: a dark void around a disc in the season's ground colour
  with a glowing edge in the season's colour; during the countdown before a halving a dashed
  ring (in the next season's colour) shows the edge after it; after the banner the edge eases
  in over 2 s. Hill and bomb: a walled square with glowing walls; in hill the zone glows in the
  season's colour, and in the countdown a dashed ring shows where it jumps.
- **Bomb** (render `bomb.ts`): a carrier has a ticking bomb drawn above it — black with a
  pale rim, a fuse as long as the share of the time left before the bombs go off, and a
  flickering spark; its label keeps clear of it.
- **Ghosts** (look B of Seasonal Spirits): circles in their team colour, a thick white ring
  and "You" for the own one; a ghost faster than running (a dash, a knock) leaves a short
  trail; one falling off shrinks and fades for `fallMs`; one out is not drawn; one just back
  wears a pale dashed ring (protected). Labels: the name, "· 2" for a score of 2 (knockouts or
  points), the short tag
  in a crowd; never on another label, under the bar or past the screen edge.
- **Camera** (owner 2026-11-17, one for all modes and every client): the whole playing area —
  sumo's arena disc as it is now, the walled square of hill and bomb (render `playBox`) — fits
  below the band with a ghost's radius and 8 px to spare (`scene.ts` `camera`, render
  `fitBox`). It keeps clear of the Dash button and, on touch screens, the joystick's thumb zone
  (render `clearArea`: above them on a portrait phone, between them on a landscape phone or a
  desktop). In sumo it follows the arena's edge as the server eases it in after a halving, so
  the smaller arena stays as large on screen. There is no view choice and no minimap.
- **Halving staging** (the words per mode in render `modes.ts`): the clock counts the last
  seconds down in red ("HALVING in 0:06 — the arena halves, then Summer is in season", "— the
  zone jumps to Summer and halves", "— the bomb goes off"); at the halving a large "HALVING —
  the arena halves · <Season> is in season" ("the zone halves · …", "the bomb goes off";
  3.5 s), a short flash and one tone. The match end the same way: "LAST CHANCE — push them
  off" ("hold the zone", "pass the bomb"), then "MATCH OVER".
- **Help** (`src/help.ts`): shown once on the first visit, any time with "?": the mode's three
  rules with drawings (sumo: push them off, dash, the arena halves; hill: stand in the zone,
  push them out, the zone jumps and halves; bomb: points every second, pass the bomb, it
  goes off and halves the carrier's points), "What you see" (render `LEGEND`, one drawing
  each), the controls. It follows the mode of the match on screen.
- **Result**: the mode's two awards ("Best pusher"/"Survivor", "King"/"Bouncer", "Hot
  hands"/"Cool head"), the score per team and the top eight players, the
  own place, the time to the next match, and the bridge box: "This is how Seasonal Tokens
  work: every halving cuts in half — here it cuts the arena.", "Start here", "Try the
  simulator", "No financial advice".

## Browser tests (`pnpm e2e`)

Playwright starts its own server on 3932 with 15 s seasons and the client on 5932 and plays
at desktop size (keyboard) and phone size (Pixel 7, touch):

- `e2e/play.e2e.ts`: join, move, dash (the cooldown starts), a halving with the arena
  halving, the last chance, "MATCH OVER", the result with the awards and the bridge box;
- `e2e/readability.e2e.ts`: the team line, the scores readable in the band, every sampled
  frame's playing area wholly on screen and clear of the controls, its labels in view and
  apart;
- `e2e/help.e2e.ts`: the help on the first visit with its rules and drawings;
- `e2e/spectate.e2e.ts`: a spectator sees a halving and the result and sends only its hello.

Screenshots go to `reports/screens/latest/` (git-ignored). Seasonal Spirits' latency tool,
picture tool (`pnpm looks`) and response spec were removed on this branch: they measured
coins and shrines.
