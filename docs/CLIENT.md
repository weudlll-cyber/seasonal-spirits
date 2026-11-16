# The player client (`apps/client`) — Seasonal Sumo prototype

Plain TypeScript, Canvas 2D and Vite, no game framework. It sends a direction and the one
action, Dash; everything it shows comes from the server's state message (docs/SERVER.md).
Development mode only: there is no sign-in yet. On `proto/sumo` it plays Seasonal Sumo
(docs/GAME-CORE.md); Seasonal Spirits' client is on `master`.

## Files

| File                       | What it holds                                                                    |
| -------------------------- | -------------------------------------------------------------------------------- |
| `src/main.ts`              | Wiring and the frame loop: interpolate, predict, draw, HUD, result, test hook    |
| `src/scene.ts`             | One canvas frame: arena, ghosts, labels below the bar, clock, the minimap        |
| `src/view-mode.ts`         | "Near" / "Overview": the corner button and V, remembered                         |
| `src/minimap.ts`           | The minimap in "Near", top right: arena edge, ghosts, the camera's frame         |
| `src/storage.ts`           | Remembered choices (mute, view, help seen) in localStorage, safe when it throws  |
| `src/help.ts`              | The help overlay: three rules with drawings made in code, "What you see", keys   |
| `src/scores.ts`            | The team scores in the band: knockouts per team, the leader framed               |
| `src/connection.ts`        | The one WebSocket: hello, welcome or spectating notice, states, the recap        |
| `src/input-sender.ts`      | When the direction goes out: at once on a change, 60 ms apart, never repeated    |
| `src/prediction.ts`        | Where the own ghost is drawn: by the own input and dash, corrected to the server |
| `src/input.ts`             | Keyboard (WASD/arrows, Space to dash) and the touch joystick                     |
| `src/hud.ts`               | The Dash button and its cooldown ring, announcements and flash, notices, mute    |
| `src/result.ts`            | Result screen: awards, knockouts per team and player, the bridge box             |
| `src/sound.ts`             | The halving tone (Web Audio)                                                     |
| `src/config.ts`            | Bridge box on/off and its links, camera span                                     |
| `e2e/`                     | Playwright config, helpers and the specs                                         |
| `packages/render` (shared) | The Canvas drawing the client and the viewer share: arena, ghosts, clock         |

## Joining and watching

The client says `{"kind":"player"}`; the server gives it a bot's seat on the team with the
fewest players (the ghost stops where the bot left it) and answers with a welcome. When
every seat has a player, the client watches instead and says so. `?spectate=1` only watches:
the whole field, every name, the clock and the halving staging, no controls; it sends its
hello and nothing more.

## Controls

- Keyboard: WASD or arrows to move, **Space to dash**, V switches the view, ? the help.
- Touch: a joystick where the left thumb touches the left half; the round **Dash** button
  under the right thumb. Its ring fills while the server's cooldown runs (`dashLeftMs` in the
  state) and it glows when a dash is ready.
- The direction goes out at once when it changes, at most every 60 ms (`SEND_GAP_MS`), never
  twice the same.
- **The own ghost answers at once**: it is drawn where the own input — with momentum, top
  speed and a dash — has already taken it, moved with the server's own rules (`stepGhost`,
  `dashVelocity`), pulled smoothly towards the server's position and restarted from the
  server's position and speed when more than `SNAP_DISTANCE` off (a knock it could not see
  coming, a respawn). Display only (THREATS row 36). Every other ghost is drawn 100 ms behind
  the newest state, interpolated.

## Screen

- **Top bar.** The season clock (the four seasons, the time left, the countdown in red), and
  under it the band: "You are Team <Season>" in the team colour, the corner buttons, and the
  team scores ("Spring 12 · Summer 9 …", the leader framed). The band is 68 px
  (`BAND_HEIGHT`).
- **Arena.** A dark void around a disc in the season's ground colour with a glowing edge in
  the season's colour; during the countdown before a halving a dashed ring shows the edge
  after it; after the banner the edge eases in over 2 s.
- **Ghosts** (look B of Seasonal Spirits): circles in their team colour, a thick white ring
  and "You" for the own one; a ghost faster than running (a dash, a knock) leaves a short
  trail; one falling off shrinks and fades for `fallMs`; one out is not drawn; one just back
  wears a pale dashed ring (protected). Labels: the name, "· 2" for 2 knockouts, the short tag
  in a crowd; never on another label, under the bar or past the screen edge.
- **View modes**: "Near" follows the own ghost (about 1100 field units on the shorter side)
  with the minimap top right; "Overview" shows the whole field.
- **Halving staging**: the clock counts the last 10 s down in red ("HALVING in 0:06 — the
  arena halves, then Summer is in season"); at the halving a large "HALVING — the arena halves
  · <Season> is in season" (3.5 s), a short flash and one tone. The match end the same way:
  "LAST CHANCE — push them off", then "MATCH OVER".
- **Help** (`src/help.ts`): shown once on the first visit, any time with "?": three rules with
  drawings — push the other teams off; dash with Space or the button; at every halving the
  arena halves —, "What you see" (render `LEGEND`, one drawing each), the controls.
- **Result**: "Best pusher" and "Survivor", knockouts per team and the top eight players, the
  own place, the time to the next match, and the bridge box: "This is how Seasonal Tokens
  work: every halving cuts in half — here it cuts the arena.", "Start here", "Try the
  simulator", "No financial advice".

## Browser tests (`pnpm e2e`)

Playwright starts its own server on 3932 with 15 s seasons and the client on 5932 and plays
at desktop size (keyboard) and phone size (Pixel 7, touch):

- `e2e/play.e2e.ts`: join, move, dash (the cooldown starts), a halving with the arena
  halving, the last chance, "MATCH OVER", the result with the awards and the bridge box;
- `e2e/readability.e2e.ts`: the team line, the scores readable in the band, the minimap in
  "Near", every sampled frame's labels in view and apart, "Overview" surviving a reload;
- `e2e/help.e2e.ts`: the help on the first visit with its rules and drawings;
- `e2e/spectate.e2e.ts`: a spectator sees a halving and the result and sends only its hello.

Screenshots go to `reports/screens/latest/` (git-ignored). Seasonal Spirits' latency tool,
picture tool (`pnpm looks`) and response spec were removed on this branch: they measured
coins and shrines.
