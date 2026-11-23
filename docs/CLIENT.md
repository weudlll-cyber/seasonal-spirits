# The player client (`apps/client`) — Seasonal Sumo prototype

Plain TypeScript, Canvas 2D and Vite, no game framework. It sends a direction and the two
actions, Dash and Jump; everything it shows comes from the server's state message (docs/SERVER.md).
Development mode only: there is no sign-in yet. On `proto/sumo` it plays Seasonal Sumo and
its sister modes, King of the Season and Halving Bomb (docs/GAME-CORE.md "Game modes"); the
mode comes with every state, and field, clock, help, banner and result follow it. Seasonal
Spirits' client is on `master`.

## Files

| File                       | What it holds                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `src/main.ts`              | Wiring and the frame loop: interpolate, predict, draw, HUD, result, test hook               |
| `src/scene.ts`             | One canvas frame: sky, the camera on the whole island, ghosts, labels, clock                |
| `src/help.ts`              | The help overlay: the mode's rules, "What you see", the controls; open, close, focus        |
| `src/help-drawings.ts`     | The help's drawings in code: one per rule and per mark of "What you see"                    |
| `src/help-keys.ts`         | The help by keyboard: the scroll keys move the card, Esc and other keys close it            |
| `src/scores.ts`            | The team pills in the band: score and ghosts still in per team, the leader ringed           |
| `src/lives.ts`             | The own lives as red circles in the band; "You are out — watching"                          |
| `src/connection.ts`        | The one WebSocket: hello, welcome or spectating notice, states, recap, settings             |
| `src/input-sender.ts`      | When the direction goes out: at once on a change, 60 ms apart, never repeated               |
| `src/prediction.ts`        | Where the own ghost is drawn: by the own input and dash, corrected to the server            |
| `src/own-marker.ts`        | When the own ghost pulses, and the "You fell — back in N" countdown                         |
| `src/input.ts`             | Keyboard (WASD/arrows, Space to dash, Shift to jump) and the touch joystick                 |
| `src/hud.ts`               | Dash and Jump buttons with cooldown rings, announcements and flash, notices, mute           |
| `src/banner-fit.ts`        | The halving banner's text shrunk to at most two lines on a narrow screen                    |
| `src/result.ts`            | Result screen: the podium, the mode's awards, scores per team and player, bridge            |
| `src/frame/`               | The frame in React with the kit's blocks: game bar, result frame, docked chat               |
| `src/styles/`              | The page's own CSS, linked from `index.html` in cascade order: base, controls, hud, screens |
| `src/start.ts`             | The start screen while the client joins                                                     |
| `src/follow.ts`            | The phone's follow camera in King and Bomb, eased                                           |
| `src/team-line.ts`         | The band's team line: "You are Team …", the fall's countdown, out                           |
| `src/zone-hint.ts`         | King's hint "Stand in the zone to score" while outside the zone                             |
| `src/sound.ts`             | The sounds, synthesised with Web Audio, behind the Sound switch                             |
| `src/sound-events.ts`      | Which sounds a new state calls for                                                          |
| `src/config.ts`            | Bridge box on/off, its links and its line per mode                                          |
| `vite/viewer-pages.ts`     | Development only: the viewer at /viewer/ and the admin panel at /admin/ on this address     |
| `vite/dev-admin.ts`        | Development only: whether the game shows its "Admin" link                                   |
| `vite.config.ts`           | The dev server and build: ports, the LAN mode, the kit's theme script, website mode         |
| `index.html`               | The page: the canvas, the band, the controls, the screens, the CSS links                    |
| `e2e/`                     | Playwright config, helpers and the specs                                                    |
| `packages/render` (shared) | What client and viewer share: island, characters, clock, words, the look switch             |

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

- **Top bar** (the frame in the kit's look, owner decision 2026-11-20: the kit's surface and text
  colours with the island's ink outline and drop shadow). Fonts by DECISIONS D7 (kit K4): Luxora
  Grotesk from `@seasonal/kit` for every official text — the help, the start card, the result
  frame, the kit's bar with the team line and the corner, the chat, the admin panel, the
  connection notice and `/admin/`'s network numbers (D10); Fredoka,
  bundled with `@fontsource/fredoka`, for the game's own texts — the canvas with the result
  podium's place numbers (D10), and on the page the
  banner, the score chips, the zone hint, the spectator's pill and the Dash and Jump buttons
  (`--font-game`, `styles/base.css`), loaded at once by render `canvas-font.ts`; no request to a
  font service. The season clock: one line
  in a small white pill at the top left (render `clock.ts`, 36 px `CLOCK_HEIGHT`; NIGHT
  2026-11-19 removed its row of season cells, which repeated the team pills) — a dot in the
  season's colour, the mode's name with sumo's variant, "Seasonal Sumo · Points" or "· Last One
  Standing", the season, the time left and the next season, the countdown in red; with no
  deadline at all — Last One Standing "stop, no time limit" after the third halving — the time
  played, "· 6:52 played"; 13 px, shrinking to 11 px at the least on a phone, and where even
  that does not fit (a long mode's name beside the viewer's switch) without "· next: <season>"
  (`fittedLine`, review 2026-11-22). Under it the band:
  "You are Team <Season>" in a white pill behind the team's colour dot, the own lives as red
  circles beside it (sumo only; a lost one white; past five lives one and the number left, "×7",
  so the team line keeps its room on a phone), the corner buttons — the kit's theme toggle, "?"
  and Sound in the kit's bar-button look (on a phone a round note ♪, struck through when off),
  and in the dev build only a
  plain "Admin" link at 14 px to `/admin/` on the same address (`frame/Bar.tsx`, `vite/dev-admin.ts`; chain
  2026-11-21: one address — the client's dev server also serves the viewer at `/viewer/` and the
  admin panel at `/admin/`, `vite/viewer-pages.ts`) —, and a
  white pill per team with its colour dot (sumo Points "Spring 12 · 7 in": knockouts and ghosts
  still in; Last One Standing "Spring 7 in"; hill and bomb "Spring 12"; the leader outlined in
  its colour; on a narrow phone the team's name is left out, its dot names it). Out of lives the
  team line says "Out — watching" (short enough for a 390 px phone, 2026-11-19) until
  the next match, without the Dash and Jump buttons; the view stays on the whole arena. The band is 78 px
  (`BAND_HEIGHT`; 68 px before the kit's game bar). Its buttons are 44 px targets on every
  screen (kit v0.10.0; 36 px on a desktop before), and a keyboard focus shows the kit's ring,
  2 px in the text colour outside the control.
- **The frame in React** (night chain 2026-11-21 piece 4; owner decision 2026-11-20: the frame
  comes from the kit; `src/frame/`, React 19.3.1, the kit's pinned peer): `Frame.tsx` renders
  once, synchronously, before the game's modules look their parts up by id, so they fill them
  as before. The band's top row is the kit's `GameBar` (`Bar.tsx`): the kit's `BackLink` (website
  mode only), the team line and the lives as its lead, the corner on the right; while a match
  runs the kit's focus mode marks `<html data-sk-focus>` (`frame-store.ts`, fed by the loop). The
  result is the kit's `ResultFrame` (`ResultCard.tsx`, below). The docked chat with its call
  slot is the kit's `ChatDock` with the website's chat frame (`Dock.tsx`), in website mode only:
  `WEBSITE_MODE=1` at the client's start (exactly "1", off by default and today) shows the back
  link and the dock. Not taken: the kit's `StartCard` — its "Opens in N s" counts down to a round,
  and Sumo's start screen is a short joining splash with no countdown; it waits until Seasonal
  Party has a lobby with a countdown (owner decision 2026-11-21).
- **Field** (Sky Island look, owner's choice 2026-11-18; render `field.ts`). Seen from three
  quarters above: screen y = field y × the view's tilt (`VIEW_TILT` 0.55, steeper on a portrait
  phone up to `MAX_TILT` 0.9 — see Camera; render `view.ts`; input directions stay screen =
  field). Three layers (owner 2026-11-19: the crack lay over the trees, the fence over the
  characters): the ground — the top, the flat decoration (tufts, flowers, the lanterns' halos,
  the season's fallen leaves and snow), Sumo's crack, King's glow, ring and next place, and every
  character's shadow and ground rings —, under one depth order (`byDepth`, by the ground y of each
  foot) of the characters with everything that stands: each tree, pebble and lantern, each
  fence post and each stretch of rail between two posts, King's flag poles (render
  `standing.ts`, `fence.ts`), the own character after all of them; over them hit stars and
  puffs, King's crown, the labels and "Dodged!", and over everything the own arrow. Nothing of a
  character is cut anywhere. Around it
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
- **Light and Dark** (the kit's theme, night chain 2026-11-21 pieces 3 and 4): the kit's round
  theme toggle in the client's band corner (`frame/Bar.tsx`; the canvas follows the theme the
  page shows, render `look-switch.ts` `followTheme`) and a small pill switch at the viewer's top
  right (render `look-switch.ts` `bindLookSwitch`). The game starts in the player's own setting
  (owner decision 2026-11-21; it replaces Light by default of 2026-11-18), by the kit's theme: the
  stored choice `se.theme` (`light`/`dark`) — inside the website (same origin, `/games/<slug>/`)
  the one made on the website, which stores the same key (seasonal-entertainment
  `client/src/theme/theme.js` line 12, `client/public/theme-init.js` line 14), standalone the one
  made in the game —, else the device's setting, followed live while nothing is stored; set on
  `<html data-theme>` before the first paint by the kit's `theme-init.js` (`themeInit` in both
  Vite configs). A choice under the game's old key `seasonal-spirits.look` is carried over once
  and the key removed (`carryOverLook`; a stored choice is never overridden). Dark swaps every colour (render `palette.ts` `DARK`, the page's variables under
  `:root[data-theme='dark']`, the frame's from the kit's dark tokens): a night sky with stars and a crescent moon, dimmer island colours, three small
  lanterns on the island, the crack glowing; the team colours stay. Text keeps a contrast of at
  least 4.5:1 in both (tested in `palette.test.ts`); the banner's and the lives' red is
  #CC4858, white on it 4.53:1 (NIGHT 2026-11-19; #FF5A6E was 3.0:1).
- **Ghosts** (Sky Island look 2026-11-18): round toy-like characters (render `character.ts`)
  in their team colour, softly shaded (a highlight at the top left, a shade at the lower right)
  — the website's season colours, exactly as the kit's `tokens.css` holds them (owner decision
  2026-11-20; client `season-colours.test.ts` compares): spring #AFB84E, summer #E06E22, autumn
  #F9A825, winter #04AAF7 — with feet in a darker shade (82 % in Light, 72 % in Dark), short arms, a light belly, big eyes, pink cheeks, a smile and the
  season's hat (spring a crown of flowers, summer a straw hat and sunglasses, autumn a beanie
  with a leaf, winter a wool hat with a pompom), each over a soft shadow, facing the side it last
  walked to, bobbing with stepping feet while it moves. Each team's character in each pose is
  painted once per size into offscreen canvases and copied every frame (render `sprites.ts`).
  The own one (render `own.ts`, FIX 2026-11-17-3; owner 2026-11-20: in a crowd it was still
  lost) is drawn after every other character, at their size, with a soft white glow round its
  outline (3 px, painted into its own sprites). Under it a thick ring in its team's colour with a
  white edge and an ink outline, 1.6 × its width, breathing between 1.0 and 1.12 × once a second,
  drawn right before its body, over the feet of those standing in front (a crowd hid it);
  the ink outline stands out at 3:1 or more on every season's ground in both looks (render
  `palette.test.ts`: 8.2–11.5:1 in Light, 4.1–5.9:1 in Dark). Above it, over its hat, a bomb or
  a "no return" mark (render `ghostReach`), a large arrow in its team's colour with an ink
  outline and a white edge inside it (as the ring; Spring green on Spring grass needed it), a white
  "YOU" over it, bobbing 3 px once a second, drawn over everything of the
  field (only the HUD and the banners come over it), and never so high that "YOU" goes under the
  top bar (then it stands lower, over the hat); no other label or "Dodged!" goes in the
  arrow's box (render `ownMarkerBox`) — they move or are left out —, the own "Dodged!" stands to
  its left and the own label "You · n" to its right, or left when the screen's edge is there —
  clear of other characters if one side has room, else over a character there; never under another
  label. When the own
  character is outside the visible field, a small arrow in its team's colour at that edge points
  to it (render `drawOwnOffScreen`). After a respawn, at every match start and on joining, the
  ring pulses outwards three times (1.5 s). While it is
  out after a fall, the band's team line says "You fell — back in 3 … 1", on a phone under
  480 px "Back in 3 … 1", so its seconds are never cut to "…" beside the corner's buttons
  (review 2026-11-22) (server time of the fall plus `outMs`) and its team's respawn band is drawn faintly on the arena
  (`own-marker.ts`; not after the last life). A character in the air after a jump (render
  `jump.ts`, NIGHT 2026-11-18) rises on a smooth arc over its time in the air — up to 1.5× its
  size and one ghost diameter up on screen at the top, its label and arrow with it — while
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
  drops, at its standing size, to the sea with three white streaks and an "Aaah!" bubble, and
  lands in a white crown of water with a ring widening round it on the sea, all within `fallMs`.
  Off Sumo's island (render `offIsland`, `offBack`; planner 2026-11-20: one off the back was
  drawn large in the sky over the island) a character — falling, or in the air beyond the edge
  after a jump — has its standing size and no shadow or ring in the sky; one off the back is
  drawn behind the island's body, which hides it as it drops (render `drawFallsBehind`, through
  `drawField`'s `behind`), one off the sides or the front in front of it; one out is not drawn;
  one just back wears a white dashed ring (protected). Labels (render `ghost-labels.ts`, NIGHT
  2026-11-19: a label had sat on almost every character): only the own character, the real
  players and the top three by score carry one, bots otherwise none, for players and spectators
  alike; white pills with an ink outline — the name, "· 2" for a score of 2 (knockouts or
  points), the short tag in a crowd — in King of the Season's zone always the short tag (NIGHT
  2026-11-18: full names piled up there); in Halving Bomb the score only for the top three and
  the own ghost (render `scoreTopOf`, `GhostStyle.scoreTop`). A label sits beside its character
  or on a leader line no longer than about the character's height (render `labels.ts`); one that
  finds no room there is left out — "You" never; never on another label, under the bar or past
  the screen edge; they keep clear of the hat, a bomb, the rings and the own arrow (render
  `reach.ts`, `ownMarkerBox`).
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
  drawn at the scale of the field, the size of a standing one. **The phone's follow camera** (`follow.ts`, 2026-11-19: King's and Bomb's square fields
  fitted only a portrait phone's width, the characters were tiny): on a portrait screen, for a
  player in King or Bomb, the camera follows the own character at a scale where a body is 22 px
  wide (`FOLLOW_BODY_PX`, decision 2026-11-19; was Sumo's starting scale, about 14 px), clamped so it shows no more beyond the walls than the middle would, and
  eased over about 150 ms (scale, slant and offset; `CameraEase`); a minimap in the top right
  corner below the band — below the halving's banner while it shows, never under it (`scene.ts`
  `minimapAt`, 2026-11-19). It is drawn to the scale of the walls at the match's start (game-core's
  config) and shows (owner decision 2026-11-20): the field's edge — the walls as they stand now,
  the grass inside them, closing in on the map at each King halving; in Bomb with closing off it
  stays put (in King and Bomb nobody falls, game-core `walled`: the walls are where a character
  stops) —; a frame round the part of the field the screen shows, from the drawn view (render
  `fieldSeen`), a white line on an ink line; King's zone; Bomb's carriers as a dark bomb dot in a
  hot ring, and no other player; the own dot in its team's colour on top. Every mark reads on
  every season's ground in Light and Dark (3:1 at least, render `palette.test.ts`; render
  `minimap.ts`). Once the walls have closed in so far that the whole field fits at that
  scale, the whole field shows. The owner's setting "Phone: follow camera in walled modes"
  (Match flow, on, applies at once) switches it; desktop, landscape and spectators keep the whole
  field. There is no view choice.
- **Result screen** (`result.ts`): over the result a podium on a small floating island —
  the winning team's character on the middle step, the second and third on the lower ones — with
  a confetti burst in the winner's colour (render `podium.ts`, NIGHT 2026-11-19), the same for
  every mode (the team order of `teamLines`). Since piece 4 (night chain 2026-11-21) in the kit's
  `ResultFrame` (`frame/ResultCard.tsx`): "Result", the own place and the time to the next match
  at the top, the podium as its reveal, the awards and the teams beside it on a desktop (under it
  on a phone), then the players and the bridge box below. The whole result fits the screen
  without scrolling (second night chain 2026-11-21, piece 4; its look in `frame/result.css`): the
  kit measures both parts (`useFitScale`, `--fit`, the rest marked `data-sk-fit-fixed`) and every
  size shrinks with it — the podium fastest, 190 px down to 60 px —, never below the 14 px text
  floor (the Seasonal Party floor the owner set on 2026-11-21; no `data-sk-game`, so the kit's
  strictest floors hold, the scale's floor Mini Games' 0.6, as the kit's `FIT_FLOORS` has no
  Seasonal Party entry yet). What still does not fit at the floor goes to one named scroll area,
  the players' list (a region labelled "Players", reachable by keyboard); the head, the podium,
  the teams and the bridge box with "Start here", "Try the simulator" and "No financial advice"
  always show whole. Measured at 375 × 667, 390 × 844, 360 × 780 and 430 × 932: all eight
  players show, nothing scrolls (`e2e/result-fit.e2e.ts`). Small print (`.small`) is 14 px.
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
  controls. It follows the match on screen. The card scrolls with a finger or the mouse wheel,
  and by keyboard (DECISIONS D3, `help-keys.ts`): it opens with the focus on its "×" (kept when the
  card is rebuilt for a new match), the arrows move it a line, Page Up/Down and Space (Shift+Space
  back) a page, Home and End to its ends, Tab and a modifier alone leave it as it is; its "×" at
  the top right, a tap outside it, Esc or any other key closes it (owner 2026-11-20: on a phone
  every touch closed it), and the focus goes back where it was. The drawings' labels are 14 px. While more of the card lies below its bottom edge a
  fade shows there, held as the card scrolls and gone at its end (`moreBelow`, `#help .card.more`;
  owner 2026-11-20).
- **Result**: the mode's two awards ("Best pusher"/"Survivor", "Last one standing"/"Best
  pusher", "King"/"Bouncer", "Hot hands"/"Cool head"), the score per team — in Last One
  Standing the teams in their final order instead: the winner, the teams still in at the time
  limit ("5 still in"), then those knocked out, last out first ("out 2nd") — and the top eight
  players and the own place in the server's order (game-core `ranked`: by score; in Last One
  Standing by survival, FIX 2026-11-17), each with its score — in Last One Standing with when it
  went out instead, "out at 1:42" in match time or "still in" (`playerText`, the recap's `outMs`;
  owner 2026-11-20: the knockouts beside the survival order read as unsorted) — the own place
  ("1 knockout", "8 knockouts"; in Last One Standing "out at 1:42") and the
  time to the next match at the top, under the podium, so a desktop never has them below the
  card's fold (review 2026-11-20) —, and the bridge box with the mode's line (DECISIONS D6,
  `config.ts` `BRIDGE_TEXTS`): "This is how Seasonal Tokens work: every halving cuts in half —"
  and in Sumo "here it cuts the arena.", in King of the Season "here the zone jumps to the next
  season and shrinks, down to its smallest.", in Halving Bomb "here every bomb goes off and cuts
  its carrier's points." (no share named: `blastShare` is a setting, half by default); then
  "Start here", "Try the simulator", "No financial advice".

## Browser tests (`pnpm e2e`)

Playwright starts its own stacks with 15 s seasons — Sumo Points on 3932/5932 (9 lives; the admin
settings open to its own page, presets under `test-results/`), King of the Season on 3933/5933,
Halving Bomb on 3934/5934 — and plays at desktop size (keyboard) and phone size (Pixel 7,
touch):

- `e2e/play.e2e.ts`: join, move, dash (the cooldown starts), jump (the own ghost in the air), a
  halving with the arena halving, the last chance, "MATCH OVER", the result with the awards and
  the bridge box;
- `e2e/modes.e2e.ts`: King of the Season and Halving Bomb each — join, move, dash, jump, "MATCH
  OVER", the result with the mode's awards and the bridge box with the mode's line; in Bomb the carriers' screenshot
  and at most three scores besides the own;
- `e2e/panel.e2e.ts` (desktop): a setting changes play (the jump off: the Jump button goes), a
  preset saves and loads, the starting settings back at the end;
- `e2e/readability.e2e.ts`: the team line, the scores readable in the band, every sampled
  frame's playing area wholly on screen and clear of the controls, its labels in view and
  apart, the own one "You", no bot named outside the top three;
- `e2e/help.e2e.ts`: the help on the first visit with its rules and drawings, scrolled on the
  card and closed with "×", a key or a tap beside it; on a desktop read to its end by keyboard
  (the focus on its "×", Page Down to the end, Home back) and closed with Esc;
- `e2e/spectate.e2e.ts`: a spectator sees a halving and the result and sends only its hello;
- `e2e/result-fit.e2e.ts` (phone): the whole result, the bridge box included, fits 375 × 667,
  390 × 844, 360 × 780 and 430 × 932, its text at 14 px or more;
- `e2e/text-style.e2e.ts`: the fonts by DECISIONS D7 — the banner, score chips, zone hint and the
  Dash and Jump buttons in Fredoka; the help, start card, team line, corner and connection notice
  in Luxora Grotesk, `/admin/`'s network numbers too (D10); every page text on screen at 14 px or more with the help open (DECISIONS D3).

Screenshots go to `reports/screens/latest/<spec>/` (git-ignored, like every screenshot under
`reports/screens/`). Each spec's folder holds only its latest run (owner decision 2026-11-21:
screenshots do not pile up): it is cleared on the run's first shot of that spec (`e2e/stack.ts`
`screenshotPath`, the review images' rule `scripts/review-capture/src/topics.ts`
`clearOncePerRun`). Seasonal Spirits' latency tool,
picture tool (`pnpm looks`) and response spec were removed on this branch: they measured
coins and shrines.
