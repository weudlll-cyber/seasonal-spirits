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
| `src/scene.ts`             | One canvas frame: sky, the camera on the whole island, ghosts, labels, clock      |
| `src/help.ts`              | The help overlay: the mode's three rules with drawings, "What you see", keys      |
| `src/scores.ts`            | The team pills in the band: score and ghosts still in per team, the leader ringed |
| `src/lives.ts`             | The own lives as red circles in the band; "You are out — watching"                |
| `src/connection.ts`        | The one WebSocket: hello, welcome or spectating notice, states, recap, settings   |
| `src/input-sender.ts`      | When the direction goes out: at once on a change, 60 ms apart, never repeated     |
| `src/prediction.ts`        | Where the own ghost is drawn: by the own input and dash, corrected to the server  |
| `src/own-marker.ts`        | When the own ghost pulses, and the "You fell — back in N" countdown               |
| `src/input.ts`             | Keyboard (WASD/arrows, Space to dash, Shift to jump) and the touch joystick       |
| `src/hud.ts`               | Dash and Jump buttons with cooldown rings, announcements and flash, notices, mute |
| `src/banner-fit.ts`        | The halving banner's text shrunk to at most two lines on a narrow screen          |
| `src/result.ts`            | Result screen: the podium, the mode's awards, scores per team and player, bridge  |
| `src/start.ts`             | The start screen while the client joins                                           |
| `src/follow.ts`            | The phone's follow camera in King and Bomb, eased                                 |
| `src/team-line.ts`         | The band's team line: "You are Team …", the fall's countdown, out                 |
| `src/zone-hint.ts`         | King's hint "Stand in the zone to score" while outside the zone                   |
| `src/sound.ts`             | The sounds, synthesised with Web Audio, behind the Sound switch                   |
| `src/sound-events.ts`      | Which sounds a new state calls for                                                |
| `src/config.ts`            | Bridge box on/off and its links                                                   |
| `e2e/`                     | Playwright config, helpers and the specs                                          |
| `packages/render` (shared) | What client and viewer share: island, characters, clock, words, the look switch   |

## Joining and watching

The client says `{"kind":"player"}`; the server gives it a bot's seat on the team with the
fewest players (the ghost stops where the bot left it) and answers with a welcome. When
every seat has a player, the client watches instead and says so. `?spectate=1` only watches:
the whole playing area, the players' and the top three's names, the clock and the halving staging,
no controls; it sends its
hello and nothing more. A spectator's notice ("Watching the match.", or "All places taken —
watching the match.") is a pill in the row under the band that King's hint uses: every
spectator's field starts 24 px lower (`scene.ts` `fieldTop`), so the pill never covers the
back fence or the zone (2026-11-19); hidden while a banner shows.

The client hears the settings in force (`{"kind":"tuning",…}`, every setting, checked against
the schema by `parseServerMessage`; [SERVER.md](SERVER.md) "Settings and presets") on its hello,
after a change and at every match, and predicts its own ghost and draws with them
(`clientConfig(mode, settings)`, render `useShape`: the ghosts' size, the puffs, the fall, the
jump's arc, the respawn band), so it does not drift from the server after a change.

## Controls

- Keyboard: WASD or arrows to move, **Space to dash**, **Shift to jump**, ? the help.
- Buttons at the bottom right: **Jump** (smaller, blue) left of **Dash** (larger, yellow), both
  big and round with an ink outline and drop shadow, their colour filling round them while the
  server's cooldown runs; Jump hidden while the owner's switch has the jump off
  (the settings). The camera keeps the arena clear of both.
- Touch: a joystick where the left thumb touches the left half — gone with the buttons while
  there is nothing to steer (out of lives, the result; review 2026-11-20) —; the round **Dash**
  button under the right thumb. Its colour fills round it while the server's cooldown runs
  (`dashLeftMs` in the state) and it is fully lit when a dash is ready.
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

## Sound

Behind the Sound switch (muted: nothing plays); synthesised with Web Audio — short tones and
noise bursts, no audio file — through a modest master volume (`sound.ts`, NIGHT 2026-11-19). From
each state against the one before (`sound-events.ts`): a whoosh at the own dash, a thump at a hit
(the own character knocked, or one within `HIT_REACH` body radii of its dash), a boing at its jump
and a tap at the landing, a falling whistle into a splash at its fall; at a halving a crack and a
rumble in sumo, a chime when King of the Season's zone moves, a pop when the bombs blow; the
bombs' tick, once a second and four times a second in the last five; a beep each second of the
last five of a countdown; a short fanfare at the match end. The context starts on the first key
or touch (browsers allow sound only after a gesture).

## Screen

- **Start screen** (`start.ts`, render `podium.ts`, NIGHT 2026-11-19): "Seasonal Party" in a
  white pill over a small floating island with the four seasons' characters idling on it (a small
  bob), in the game's own sky over the whole screen — sun or moon as the Light/Dark switch has
  it, drifting clouds, far islands, the sea band (render `drawSky`, 2026-11-19) — and
  "Joining the match …", while the client connects and joins; it lets every touch through and
  fades out once the first state is in and it has shown for 1.2 s. There is no name entry and no
  team choice: the server seats a player on a team.

- **Top bar** (Sky Island look: white panels with an ink outline and drop shadow, Fredoka
  bundled with `@fontsource/fredoka`, no request to a font service). The season clock: one line
  in a small white pill at the top left (render `clock.ts`, 36 px `CLOCK_HEIGHT`; NIGHT
  2026-11-19 removed its row of season cells, which repeated the team pills) — a dot in the
  season's colour, the mode's name with sumo's variant, "Seasonal Sumo · Points" or "· Last One
  Standing", the season, the time left and the next season, the countdown in red; with no
  deadline at all — Last One Standing "stop, no time limit" after the third halving — the time
  played, "· 6:52 played"; 13 px, shrinking to 11 px at the least on a phone. Under it the band:
  "You are Team <Season>" in a white pill behind the team's colour dot, the own lives as red
  circles beside it (sumo only; a lost one white; past five lives one and the number left, "×7",
  so the team line keeps its room on a phone), the corner buttons — the Light/Dark switch, "?"
  and Sound (on a phone a round note ♪, struck through when off) —, and a
  white pill per team with its colour dot (sumo Points "Spring 12 · 7 in": knockouts and ghosts
  still in; Last One Standing "Spring 7 in"; hill and bomb "Spring 12"; the leader outlined in
  its colour; on a narrow phone the team's name is left out, its dot names it). Out of lives the
  team line says "Out — watching" (short enough for a 390 px phone, 2026-11-19) until
  the next match, without the Dash and Jump buttons; the view stays on the whole arena. The band is 68 px
  (`BAND_HEIGHT`).
- **Field** (Sky Island look, owner's choice 2026-11-18; render `field.ts`). Seen from three
  quarters above: screen y = field y × the view's tilt (`VIEW_TILT` 0.55, steeper on a portrait
  phone up to `MAX_TILT` 0.9 — see Camera; render `view.ts`; input directions stay screen =
  field). Three layers (owner 2026-11-19: the crack lay over the trees, the fence over the
  characters): the ground — the top, the flat decoration (tufts, flowers, the lanterns' halos,
  the season's fallen leaves and snow), Sumo's crack, King's glow, ring and next place, and every
  character's shadow and ground rings —, under one depth order (`byDepth`, by the ground y of each
  foot) of the characters with everything that stands: each tree, pebble and lantern, each
  fence post and each stretch of rail between two posts, King's flag poles (render
  `standing.ts`, `fence.ts`); over everything King's crown, the own triangle, hit stars and
  puffs, the labels and "Dodged!". Nothing of a character is cut anywhere. Around it
  the sky (render `sky.ts`, drawn once per canvas size into offscreen canvases): sun, small far
  islands, the sea band at the bottom, two big clouds low in front; over it what moves slowly
  (render `ambient.ts`, NIGHT 2026-11-19): the far clouds drift and wrap round, the waves move
  along, the sun's dashed ring turns, at night the moon glows softly and a few stars twinkle; the
  grass tufts and the tree crowns sway a little (render `decor.ts`). With
  `prefers-reduced-motion` all of that holds still and the effects below run half as long
  (render `motion.ts`). Sumo: the arena is
  a floating island's round grass top with an ink rim, a dirt edge and a hanging rock body with
  strata, roots and three jagged points (render `island.ts`), grass tufts, flowers, two trees and
  two pebbles on it (render `decor.ts`, scaled with the arena); the next halving's edge is a
  dashed crack with small ticks the whole match, pulsing in the countdown; at the halving the
  outer ring breaks into ten chunks that tumble, drop and shrink towards the sea over a second
  (render `breakoff.ts`) while the edge eases in over 2 s. Hill and bomb: a rounded-square platform of
  the same island with a low wooden fence along its walls, its posts one body radius tall (the top
  rail at about a third of a character's height, so the near fence hides only the feet of one
  right behind it; render `fence.ts` `POST_RISE`; the camera keeps room for the back fence's posts
  and King's flags below the band, render `cameraBox`); every post and rail stretch stands in the
  depth order, so a character beside a side fence is in front of the posts behind it and behind
  those in front of it; when the walls close in at a halving
  (2026-11-19) the server sends their half side in every state (`wall`), and the platform, the
  fence, the camera and the own ghost's prediction follow it (render `liveConfig`); in hill the zone (render `zone.ts`) is a
  soft glow in the season's colour, slowly pulsing, inside an ink ring in that colour, both on
  the ground; on the ring small flags on poles in it, sized by the zone on screen (NIGHT
  2026-11-19: on the phone they were hard to see), each pole in the depth order, its flag flying
  inwards, never past the ring (the zone fits the walls exactly, 2026-11-19), and its flag above
  the hat of a character on the ring (render `FLAG_RISE`), so a full zone still shows its flags
  over the crowd; a small gold crown floats over its middle, over everything (2026-11-19: it
  reads as a place to go; render `zonePoles`, `drawZoneCrown`); in the countdown
  a dashed ring with a faint fill shows where it jumps. No tree, pebble or lantern stands inside
  the zone, its next place or any quarter's middle at the zone's starting size
  (`OnScreen.keepOut`); the flat decoration — tufts, flowers, fallen leaves — grows anywhere
  (owner 2026-11-19: King's field had almost none left). While the
  own ghost stands outside the zone, a pill says "Stand in the zone to score" (client
  `zone-hint.ts`) in a row of its own under the band — in King the field starts 24 px lower
  (`scene.ts` `fieldTop`), so the pill never covers the back fence — hidden while a banner shows.
- **The season on the island** (render `season.ts`, `season-decor.ts`, NIGHT 2026-11-19): the
  season in play, as the HUD names it, colours the grass, the tufts and the tree crowns (Light
  and Dark each; the palette's tint, render `palette.ts` `tintLook`) and decorates the island —
  spring blossoms on the crowns and pink and white petals drifting across; summer warmer grass,
  a stronger sun's ring and three butterflies; autumn orange and red crowns, leaves falling and
  tumbling and a few lying on the grass; winter paler grass, snowflakes and snow on the rim, the
  crowns and the pebbles. At a halving the new season fades in over about a second (half that
  with reduced motion). The particles are a function of their index and the time — no memory —
  at most 28 on a desktop, 14 on a phone, drawn below the band and under the labels (render
  `GhostStyle.air`; review 2026-11-20: butterflies hid the own name).
- **Bomb** (render `bomb.ts`, NIGHT 2026-11-18 piece 5): a carrier is unmistakable at any
  size — a large bomb above it (at least the body's size), black with a pale rim, a thick fuse
  as long as the share of the time left before the bombs go off, a glowing spark at its tip,
  and the carrier's body pulsing in a hot halo, quicker as the fuse burns down; its label keeps
  clear of it. **No return** (render `no-return.ts`, 2026-11-19: the return lock was invisible):
  the ghost that just passed a bomb on wears a white pill with an ink outline above its hat — a
  U-turn arrow crossed out in red — for exactly the lock (the server's `GHOST_NO_RETURN`), seen
  by everybody; above its bomb if it carries one again; its label keeps clear of it; the help's
  "What you see" has a line on it.
- **Light and Dark** (Sky Island look, piece 3): a small pill switch in the client's band
  corner (NIGHT 2026-11-19: moved off the top right, where it left the clock's line too little
  room on a phone) and at the viewer's top right (render `look-switch.ts`), Light by default,
  the choice remembered in
  localStorage (`seasonal-spirits.look`; render `storage.ts`, which also keeps the mute and the
  help seen). Dark swaps every colour (render `palette.ts` `DARK`, the page's variables under
  `body.dark`): a night sky with stars and a crescent moon, dimmer island colours, three small
  lanterns on the island, the crack glowing; the team colours stay. Text keeps a contrast of at
  least 4.5:1 in both (tested in `palette.test.ts`); the banner's and the lives' red is
  #CC4858, white on it 4.53:1 (NIGHT 2026-11-19; #FF5A6E was 3.0:1).
- **Ghosts** (Sky Island look 2026-11-18): round toy-like characters (render `character.ts`)
  in their team colour, softly shaded (a highlight at the top left, a shade at the lower right)
  — spring #9BD15A, summer #FF8A3D, autumn #FFC23C, winter #4CC2FF —
  with feet in a darker shade, short arms, a light belly, big eyes, pink cheeks, a smile and the
  season's hat (spring a crown of flowers, summer a straw hat and sunglasses, autumn a beanie
  with a leaf, winter a wool hat with a pompom), each over a soft shadow, facing the side it last
  walked to, bobbing with stepping feet while it moves. Each team's character in each pose is
  painted once per size into offscreen canvases and copied every frame (render `sprites.ts`).
  The own one (render `own.ts`, FIX 2026-11-17-3) has a white ring on the ground under it and a
  white triangle with an ink outline above it, over all others, and "You"; after a respawn, at
  every match start and on joining, the ring pulses outwards three times (1.5 s). While it is
  out after a fall, the band's team line says "You fell — back in 3 … 1" (server time of the
  fall plus `outMs`) and its team's respawn band is drawn faintly on the arena
  (`own-marker.ts`; not after the last life). A character in the air after a jump (render
  `jump.ts`, NIGHT 2026-11-18) rises on a smooth arc over its time in the air — up to 1.5× its
  size and one ghost diameter up on screen at the top, its label and triangle with it — while
  its shadow stays on the ground at its real position, smaller and darker the higher it is; a
  short ring spreads on the ground at the take-off and the landing; "Dodged!" shows in a pill
  above it for a second when the server flags a dash passing under (`GHOST_DODGED`) — moved up
  out of another bubble's way, or left out when there is no room (render `clearBubble`), and
  kept inside the screen's sides and below the bar (render `dodgedAt`, 2026-11-19). The own one
  jumps from the press on (the prediction), not from the server's echo. A dash winding up (the
  owner's option, render `windup.ts`) glows white with an ink-edged line on the ground in its
  direction; the own ghost holds through its wind-up from the press on (the prediction). What
  the drawing remembers between frames is render `trails.ts`. A character faster than running
  (a dash, a knock) leaves three white puffs; a dash's start stretches the body upright, a
  landing and a respawn squash it, a landing kicks up dust at the feet (two puffs on a phone,
  four on a desktop), a knock shows a white star halfway between the knocked one and the dasher
  that hit it, and the knocked one slides with spiral eyes (render `moments.ts`, `effects.ts`; the
  client sees no hit itself: a knock is a character faster than running without dashing); one
  falling off (render `fall.ts`) tips over the edge, turns head-down with an open mouth and
  drops, shrinking, to the sea with three white streaks and an "Aaah!" bubble, and lands in a
  white crown of water with a ring widening round it on the sea, all within `fallMs`; one out is not drawn;
  one just back wears a white dashed ring (protected). Labels (render `ghost-labels.ts`, NIGHT
  2026-11-19: a label had sat on almost every character): only the own character, the real
  players and the top three by score carry one, bots otherwise none, for players and spectators
  alike; white pills with an ink outline — the name, "· 2" for a score of 2 (knockouts or
  points), the short tag in a crowd — in King of the Season's zone always the short tag (NIGHT
  2026-11-18: full names piled up there); in Halving Bomb the score only for the top three and
  the own ghost (render `scoreTopOf`, `GhostStyle.scoreTop`). A label sits beside its character
  or on a leader line no longer than about the character's height (render `labels.ts`); one that
  finds no room there is left out — "You" never; never on another label, under the bar or past
  the screen edge; they keep clear of the hat, a bomb, the rings and the triangle (render
  `reach.ts`).
- **Camera** (owner 2026-11-17, one for all modes and every client): the whole playing area —
  sumo's arena disc as it is now, the walled square of hill and bomb (render `playBox`) — fits
  below the band with a ghost's radius and 8 px to spare (and the fence's posts, render
  `cameraBox`), squashed by the view's tilt (`scene.ts` `camera`, render `fitBox`). It keeps
  clear of the Dash and Jump buttons and, on touch screens, the joystick's thumb zone, and takes
  the larger of two fits: the whole island with its rock (`ISLAND_DEPTH`) at the usual slant in
  the strip between the controls (a desktop, a landscape phone), or the playing surface alone
  across the whole width above the controls (a portrait phone, NIGHT 2026-11-19: the island had
  filled only the top third) — there the controls may cover the sky and the rock, never the
  surface, and the view turns steeper, up to `MAX_TILT` 0.9, to fill the height. The characters
  stay as large as the width allows: drawn larger than their body they would mislead about
  contact. In sumo it follows the arena's edge as the server eases it in after a halving, so
  the smaller arena stays as large on screen; in hill and bomb it follows the walls as they close
  in. **Zoom cap** (planner 2026-11-19, decided 2026-11-19, BACKLOG am): on a screen whose
  shorter side is at least 600 px (desktop, tablet) the camera never comes so close that a
  character's body diameter on screen exceeds 6 % of that side — 48 px at 1280 × 800 (render
  `cameraBox`, `BODY_SHARE`, `CAP_FROM_PX`) — so late Sumo arenas shrink on screen there and
  more sky shows round them — while more than 8 characters stand (planner 2026-11-20: late
  Sumo's island was a third of a desktop's width); with 8 or fewer (`FEW_STANDING`) the camera
  comes closer until the island or field with its rock fills two thirds of the room it is fitted
  into (`CLOSE_FILL`, on a desktop the usable height), never closer than a phone's fit and never
  further out than the cap. Below 600 px (a phone) there is no cap: the camera always fits the
  island or field, so late Sumo, King and Bomb fill the width to the end. The same for players,
  spectators and the viewer. A falling character is
  drawn at the scale of the field, never larger than a standing one. **The phone's follow camera** (`follow.ts`, 2026-11-19: King's and Bomb's square fields
  fitted only a portrait phone's width, the characters were tiny): on a portrait screen, for a
  player in King or Bomb, the camera follows the own character at a scale where a body is 22 px
  wide (`FOLLOW_BODY_PX`, decision 2026-11-19; was Sumo's starting scale, about 14 px), clamped so it shows no more beyond the walls than the middle would, and
  eased over about 150 ms (scale, slant and offset; `CameraEase`); a minimap in the top right
  corner below the band — below the halving's banner while it shows, never under it (`scene.ts`
  `minimapAt`, 2026-11-19) — shows the walls now, King's zone or the bombs' carriers and the own dot,
  each outlined in ink so it reads on every season's ground (3:1 at least, render
  `palette.test.ts`; render `minimap.ts`). Once the walls have closed in so far that the whole field fits at that
  scale, the whole field shows. The owner's setting "Phone: follow camera in walled modes"
  (Match flow, on, applies at once) switches it; desktop, landscape and spectators keep the whole
  field. There is no view choice.
- **Result screen** (`result.ts`): over the result a podium on a small floating island —
  the winning team's character on the middle step, the second and third on the lower ones — with
  a confetti burst in the winner's colour (render `podium.ts`, NIGHT 2026-11-19), the same for
  every mode (the team order of `teamLines`); below it the place, the awards, the teams and the
  players as before, in the white card.
- **Halving staging** (the words per mode in render `modes.ts`): the clock counts the last
  seconds down in red ("HALVING in 0:06 — the arena halves, then Summer is in season", "— the
  zone jumps to Summer and halves", "— the bomb goes off"); at the halving "HALVING — the arena
  halves · <Season> is in season" ("the zone halves · …", "the bomb goes off"; when the walls
  close in "the zone halves and the walls close in · …", "the bomb goes off and the walls close
  in", render `halvingBanner`; 3.5 s) on a red
  banner (#CC4858), slightly tilted, white text with an ink edge — never wider than the screen
  minus 16 px; on a phone its text shrinks, not below 14 px, to at most two lines (`banner-fit.ts`,
  2026-11-19) —, right under the band at the top edge of
  the play area — never over its middle (NIGHT 2026-11-18) — with a short flash and its sound. The match end the same way: "LAST CHANCE — push them
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
  Standing by survival, FIX 2026-11-17) — the own place ("1 knockout", "8 knockouts") and the
  time to the next match at the top, under the podium, so a desktop never has them below the
  card's fold (review 2026-11-20) —, and the bridge box: "This is how Seasonal Tokens
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
  apart, the own one "You", no bot named outside the top three;
- `e2e/help.e2e.ts`: the help on the first visit with its rules and drawings;
- `e2e/spectate.e2e.ts`: a spectator sees a halving and the result and sends only its hello.

Screenshots go to `reports/screens/latest/` (git-ignored). Seasonal Spirits' latency tool,
picture tool (`pnpm looks`) and response spec were removed on this branch: they measured
coins and shrines.
