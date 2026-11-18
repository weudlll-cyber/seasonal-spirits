# The player client (`apps/client`) — Seasonal Sumo prototype

Plain TypeScript, Canvas 2D and Vite, no game framework. It sends a direction and the one
action, Dash; everything it shows comes from the server's state message (docs/SERVER.md).
Development mode only: there is no sign-in yet. On `proto/sumo` it plays Seasonal Sumo and
its sister modes, King of the Season and Halving Bomb (docs/GAME-CORE.md "Game modes"); the
mode comes with every state, and field, clock, help, banner and result follow it. Seasonal
Spirits' client is on `master`.

## Files

| File                       | What it holds                                                                     |
| -------------------------- | --------------------------------------------------------------------------------- |
| `src/main.ts`              | Wiring and the frame loop: interpolate, predict, draw, HUD, result, test hook     |
| `src/scene.ts`             | One canvas frame: the camera on the whole playing area, ghosts, labels, clock     |
| `src/storage.ts`           | Remembered choices (mute, help seen) in localStorage, safe when it throws         |
| `src/help.ts`              | The help overlay: the mode's three rules with drawings, "What you see", keys      |
| `src/scores.ts`            | The team chips in the band: score and ghosts still in per team, the leader framed |
| `src/lives.ts`             | The own lives as hearts in the band; "You are out — watching"                     |
| `src/connection.ts`        | The one WebSocket: hello, welcome or spectating notice, states, recap, settings   |
| `src/input-sender.ts`      | When the direction goes out: at once on a change, 60 ms apart, never repeated     |
| `src/prediction.ts`        | Where the own ghost is drawn: by the own input and dash, corrected to the server  |
| `src/own-marker.ts`        | When the own ghost pulses, and the "You fell — back in N" countdown               |
| `src/input.ts`             | Keyboard (WASD/arrows, Space to dash, Shift to jump) and the touch joystick       |
| `src/hud.ts`               | Dash and Jump buttons with cooldown rings, announcements and flash, notices, mute |
| `src/result.ts`            | Result screen: the mode's awards, scores per team and player, the bridge box      |
| `src/sound.ts`             | The halving tone (Web Audio)                                                      |
| `src/config.ts`            | Bridge box on/off and its links                                                   |
| `e2e/`                     | Playwright config, helpers and the specs                                          |
| `packages/render` (shared) | The drawing client and viewer share: field per mode, ghosts, bomb, clock, words   |

## Joining and watching

The client says `{"kind":"player"}`; the server gives it a bot's seat on the team with the
fewest players (the ghost stops where the bot left it) and answers with a welcome. When
every seat has a player, the client watches instead and says so. `?spectate=1` only watches:
the whole field, every name, the clock and the halving staging, no controls; it sends its
hello and nothing more.

The client hears the settings in force (`{"kind":"tuning",…}`, every setting, checked against
the schema by `parseServerMessage`; [SERVER.md](SERVER.md) "Settings and presets") on its hello,
after a change and at every match, and predicts its own ghost and draws with them
(`clientConfig(mode, settings)`, render `useShape`: the ghosts' size, the trail, the fall, the
jump's arc, the respawn band), so it does not drift from the server after a change.

## Controls

- Keyboard: WASD or arrows to move, **Space to dash**, **Shift to jump**, ? the help.
- Buttons at the bottom right: **Jump** (smaller) left of **Dash**, both round with a ring that
  fills while the server's cooldown runs; Jump hidden while the owner's switch has the jump off
  (the settings). The camera keeps the arena clear of both.
- Touch: a joystick where the left thumb touches the left half; the round **Dash** button
  under the right thumb. Its ring fills while the server's cooldown runs (`dashLeftMs` in the
  state) and it glows when a dash is ready.
- The direction goes out at once when it changes, at most every 60 ms (`SEND_GAP_MS`), never
  twice the same.
- **The own ghost answers at once**: it is drawn where the own input — with momentum, top
  speed and a dash — has already taken it, moved with the server's own rules (`stepGhost`,
  `dashVelocity`, the walls of the mode on screen) as a ghost that touches nobody — the others
  are drawn a buffer late and the server pushes them aside, so a path stopped at them fell
  behind and was pulled on in jerks (the stutter, measured and fixed 2026-11-18) —, pulled
  smoothly towards the server's position and restarted from the server's position and speed
  when more than `SNAP_DISTANCE` off (a knock it could not see coming, a respawn). What is drawn
  follows that by the path's own motion and closes any gap within `BLEND_MS` (100 ms), at most
  at running speed on top: no jump; it never passes through a drawn ghost — it stops at one
  from its side and slides round it (wedged between two it stays where it was drawn until the
  server moves them — FIX 2026-11-17-3). Display only (THREATS row 36). Every other ghost is drawn 50 ms (one
  tick) behind the newest state, interpolated, and extrapolated from its last two states
  when the next one is late (FIX 2026-11-17-2: at 100 ms another ghost was drawn 2.7 ghost
  radii behind where a dash hit it, at 50 ms 1.8 radii; the drawn path stays smooth).

## Screen

- **Top bar.** The season clock (four seasons — a window that moves on through bomb's nine
  and sumo's keep-halving —, the mode's name with sumo's variant, "Seasonal Sumo · Points" or
  "· Last One Standing", the time left, the countdown in red; with no deadline at all — Last One
  Standing "stop, no time limit" after the third halving — the time played, "· 6:52 played"),
  and under it the band: "You are Team <Season>" in the team colour with the own lives as
  hearts beside it (sumo only; a lost one fades; past five lives one heart and the number left,
  "♥ ×7", so the team line keeps its room on a phone), the corner buttons, and a chip per team
  (sumo Points "Spring 12 · 7 in": knockouts and ghosts still in; Last One Standing "Spring 7
  in"; hill and bomb "Spring 12"; the leader framed; on a narrow phone the team's name is left
  out, its colour names it). Out of lives the team line says "You are out — watching" until
  the next match, without the Dash and Jump buttons; the view stays on the whole arena. The band is 68 px
  (`BAND_HEIGHT`).
- **Field** (render `field.ts`). Sumo: a dark void around a disc in the season's ground colour
  with a glowing edge in the season's colour; during the countdown before a halving a dashed
  ring (in the next season's colour) shows the edge after it; after the banner the edge eases
  in over 2 s. Hill and bomb: a walled square with glowing walls; in hill the zone glows in the
  season's colour, and in the countdown a dashed ring shows where it jumps.
- **Bomb** (render `bomb.ts`, NIGHT 2026-11-18 piece 5): a carrier is unmistakable at any
  size — a large bomb above it (at least the body's size), black with a pale rim, a thick fuse
  as long as the share of the time left before the bombs go off, a glowing spark at its tip,
  and the carrier's body pulsing in a hot halo, quicker as the fuse burns down; its label keeps
  clear of it.
- **Ghosts** (look B of Seasonal Spirits): circles in their team colour. The own one (render
  `own.ts`, FIX 2026-11-17-3) is drawn on top of all, with a thick white ring on a dark edge,
  a small arrow pointing down at it and "You"; after a respawn, at every match start and on
  joining, a ring pulses three times (1.5 s). While it is out after a fall, the band's team
  line says "You fell — back in 3 … 1" (server time of the fall plus `outMs`) and its team's
  respawn band is drawn faintly on the arena (`own-marker.ts`; not after the last life). A
  ghost in the air after a jump (render `jump.ts`, NIGHT 2026-11-18) rises on a smooth arc over
  its time in the air — up to 1.5× its size and one ghost diameter up at the top, its label (and
  for the own one its ring and arrow) with it — over a shadow on the ground at its real position,
  smaller and darker the higher it is; a short ring spreads on the ground at the take-off and the
  landing; "Dodged!" shows above it for a second when the server flags a dash passing under
  (`GHOST_DODGED`). The own one jumps from the press on (the prediction), not from the server's
  echo. A dash winding up (the owner's option, render `windup.ts`) glows white with a line in
  its direction; the own ghost holds through its wind-up from the press on (the prediction). What the drawing remembers between frames is render `trails.ts`. A
  ghost faster than running (a dash, a knock) leaves a short
  trail; one falling off shrinks and fades for `fallMs`; one out is not drawn; one just back
  wears a pale dashed ring (protected). Labels: the name, "· 2" for a score of 2 (knockouts or
  points), the short tag
  in a crowd — in King of the Season's zone always the short tag (NIGHT 2026-11-18: full
  names piled up there); in Halving Bomb every ghost its name, the score only for the top three
  and the own ghost (render `scoreTopOf`, `GhostStyle.scoreTop`); "You" stays; never on another
  label, under the bar or past the screen edge.
- **Camera** (owner 2026-11-17, one for all modes and every client): the whole playing area —
  sumo's arena disc as it is now, the walled square of hill and bomb (render `playBox`) — fits
  below the band with a ghost's radius and 8 px to spare (`scene.ts` `camera`, render
  `fitBox`). It keeps clear of the Dash button and, on touch screens, the joystick's thumb zone
  (render `clearArea`: above them on a portrait phone, between them on a landscape phone or a
  desktop). In sumo it follows the arena's edge as the server eases it in after a halving, so
  the smaller arena stays as large on screen. There is no view choice and no minimap.
- **Halving staging** (the words per mode in render `modes.ts`): the clock counts the last
  seconds down in red ("HALVING in 0:06 — the arena halves, then Summer is in season", "— the
  zone jumps to Summer and halves", "— the bomb goes off"); at the halving "HALVING — the arena
  halves · <Season> is in season" ("the zone halves · …", "the bomb goes off"; 3.5 s) in a slim
  strip right under the band, at the top edge of the play area — never over its middle (NIGHT
  2026-11-18) — with a short flash and one tone. The match end the same way: "LAST CHANCE — push them
  off" ("hold the zone", "pass the bomb"), then "MATCH OVER".
- **Help** (`src/help.ts`): shown once on the first visit, any time with "?": the mode's three
  rules with drawings (sumo: push them off, dash, the arena halves; hill: stand in the zone,
  push them out, the zone jumps and halves; bomb: points every second, pass the bomb, it
  goes off and halves the carrier's points), the jump in every mode (a ghost over its shadow, a
  dash passing below), in sumo the variant's rule in one sentence with the
  match's lives (`variantRule`), "What you see" (render `LEGEND`, one drawing each), the
  controls. It follows the match on screen.
- **Result**: the mode's two awards ("Best pusher"/"Survivor", "Last one standing"/"Best
  pusher", "King"/"Bouncer", "Hot hands"/"Cool head"), the score per team — in Last One
  Standing the teams in their final order instead: the winner, the teams still in at the time
  limit ("5 still in"), then those knocked out, last out first ("out 2nd") — and the top eight
  players and the own place in the server's order (game-core `ranked`: by score; in Last One
  Standing by survival, FIX 2026-11-17), the time to the next match, and the bridge box: "This is how Seasonal Tokens
  work: every halving cuts in half — here it cuts the arena.", "Start here", "Try the
  simulator", "No financial advice".

## Browser tests (`pnpm e2e`)

Playwright starts its own stacks with 15 s seasons — Sumo Points on 3932/5932 (9 lives; the admin
settings open to its own page, presets under `test-results/`), King of the Season on 3933/5933,
Halving Bomb on 3934/5934 — and plays at desktop size (keyboard) and phone size (Pixel 7,
touch):

- `e2e/play.e2e.ts`: join, move, dash (the cooldown starts), jump (the own ghost in the air), a
  halving with the arena halving, the last chance, "MATCH OVER", the result with the awards and
  the bridge box;
- `e2e/modes.e2e.ts`: King of the Season and Halving Bomb each — join, move, dash, jump, "MATCH
  OVER", the result with the mode's awards and the bridge box; in Bomb the carriers' screenshot
  and at most three scores besides the own;
- `e2e/panel.e2e.ts` (desktop): a setting changes play (the jump off: the Jump button goes), a
  preset saves and loads, the starting settings back at the end;
- `e2e/readability.e2e.ts`: the team line, the scores readable in the band, every sampled
  frame's playing area wholly on screen and clear of the controls, its labels in view and
  apart;
- `e2e/help.e2e.ts`: the help on the first visit with its rules and drawings;
- `e2e/spectate.e2e.ts`: a spectator sees a halving and the result and sends only its hello.

Screenshots go to `reports/screens/latest/` (git-ignored). Seasonal Spirits' latency tool,
picture tool (`pnpm looks`) and response spec were removed on this branch: they measured
coins and shrines.
