# The player client (`apps/client`)

The first playable version: plain TypeScript, Canvas 2D and Vite, no game framework. It
sends a direction and the one action; everything it shows comes from the server's state
message (docs/SERVER.md). Development mode only: there is no sign-in yet (CONCEPT.md §12).

## Files

| File                       | What it holds                                                                   |
| -------------------------- | ------------------------------------------------------------------------------- |
| `src/main.ts`              | Wiring and the frame loop: interpolate, draw, buttons, result, test hook        |
| `src/scene.ts`             | One canvas frame: field, ghosts, labels below the bar, clock, Near extras       |
| `src/view-mode.ts`         | "Near" / "Overview": the corner button and V, remembered                        |
| `src/minimap.ts`           | The minimap in "Near", in the corner away from the own shrine (tested)          |
| `src/arrow.ts`             | The "Your shrine" arrow at the screen edge (placement tested)                   |
| `src/storage.ts`           | Remembered choices (mute, view, help seen) in localStorage, safe when it throws |
| `src/help.ts`              | The help overlay: five rules with drawings made in code, the controls           |
| `src/connection.ts`        | The one WebSocket: hello, welcome or spectating notice, states, sending         |
| `src/input-sender.ts`      | When the direction goes out: at once on a change, 60 ms apart, never repeated   |
| `src/prediction.ts`        | Where the own ghost is drawn: by the own input, corrected to the server         |
| `src/input.ts`             | Keyboard and the touch joystick                                                 |
| `src/hud.ts`               | Buttons, HALVING announcement and flash, notices, mute; HUD rects on the field  |
| `src/result.ts`            | Result screen and bridge box                                                    |
| `src/sound.ts`             | The halving tone (Web Audio)                                                    |
| `src/config.ts`            | Bridge box on/off and its links, camera span                                    |
| `e2e/`                     | Playwright configs, helpers, the specs, the latency measurement                 |
| `packages/render` (shared) | The Canvas drawing the client and the viewer share: field, ghosts, clock        |

Reused rather than rebuilt: the state decoding, interpolation, render clock and buffer
trimming from `packages/protocol` (the same the viewer and the probe use), the server text
reader `parseServerMessage`, ghost names (`ghostName`), field size and shrine positions
from the game core's config.

## Joining

The client says `{"kind":"player"}`. The server gives it a free slot (a bot leaves), with
the name "Player <ghost>" and a team chosen by the server, and answers with a welcome. When
every slot already has a player, the server answers `{"kind":"spectating","reason":"full"}`
and the client watches the whole field and says so on screen. After a lost connection the
client asks for a reload; a reconnect is a new player until the website sign-in exists.

## Spectator mode (`?spectate=1`)

http://localhost:5930/?spectate=1 joins as a spectator (CONCEPT.md §5: watching is the
step before playing): the whole field, every ghost named, the season clock and the halving
staging as players see them, the result screen with the bridge box (no own place), and no
controls — no joystick, no buttons, keys do nothing. The client sends its hello and then
nothing; the server would close a spectator that sends anything (THREATS row 12). Only the
exact value `1` switches it on. The browser spec `e2e/spectate.e2e.ts` (desktop size)
watches a halving and the result and counts the frames sent to the match server: exactly
the hello.

## Help and steal feedback

Owner's observation 2026-11-15: stealing was not understood.

- **Help** (`src/help.ts`): an overlay with the rules of CONCEPT.md §2a in plain words, each
  with a small drawing made in code (inline SVG, no image files) — only the current season's
  coins fall; a coin is worth 1 in its own season, ½ otherwise; at the own shrine Secure
  banks now and Swap turns the season's coins, from 6 on, into the next season's (every 2
  become 3; not in the last season — the numbers come from the game config); swapped coins
  are safe until the next halving (the shield); every season change is a halving, secure or
  swap before it; carrying makes you bigger, glowing and slower, and others can steal a
  random part of your coins, at least one — plus the controls for keyboard and touch. It opens by itself
  on the first visit (remembered in the browser), any time with "?" (the key or the band's
  "?" button), and closes with one tap or any key; that key reaches no game control.
- **Steal button**: lit only while the server says a steal would take something right now
  (`GHOST_CAN_STEAL` in the state: the core's `canSteal` — an opponent carrier in range, the
  cooldown over, not securing), dimmed otherwise; it can always be pressed.
- **Range ring**: while an opponent carrier is within twice the steal range, a faint dashed
  ring around the own ghost shows the steal range.
- **Shield**: a ghost carrying swapped coins (`GHOST_SHIELDED`) has an ice-white hexagon
  around it (`packages/render/src/ghosts.ts`), drawn for every ghost in the client and the
  viewer: those coins cannot be stolen until the next halving.
- **Messages**: after a steal the two players involved see "You stole 3 from Bot 7" or
  "Bot 7 stole 2 from you" for 2.5 s. The server sends this notice
  (`{"kind":"steal",…}`, read by `parseServerMessage`) only to those two players;
  spectators and everyone else get nothing (THREATS rows 29, 30).

## Controls (CONCEPT.md §8)

- Keyboard: WASD or arrows to move, Space for the action (steal), 1 Secure, 2 Swap, 3 and 4
  the team signals, V switches the view, ? opens the help.
- **Team signals** (owner decision 2026-11-16): "Attack" (key 3) and "To shrine" (key 4), or
  the two small buttons above the action buttons. The server passes a signal only to the
  players of the sender's team (THREATS rows 34, 35); each of them sees a ring in the team
  colour with the signal's word at the sender's position for 3 s (`signalShowMs`,
  `src/signals.ts`), and a ring on the minimap. The task asked for keys 1 and 2, which are
  Secure and Swap; 3 and 4 until the owner decides.
- Touch (the primary pointer is a finger): a joystick appears where the left thumb touches
  the left half of the screen; the action button sits under the right thumb. The buttons
  never reach into the left half.
- At the own shrine the same spot shows two buttons instead of the action button:
  "Secure (<value now>)" and "Swap (<n> <next season>, worth <now> now / <later> later)".
  The numbers are the server's offer for the own ghost (`offers` in the state), never
  computed by the client; a button is greyed out when it would do nothing.
- The direction goes out at once when it changes, unless the last one went out less than
  60 ms ago (`SEND_GAP_MS`, `src/input-sender.ts`); then the next frame sends it. A direction
  equal to the last one sent is never sent again. At most 17 directions in any second, so
  with actions (sent at once) and signals a player stays inside the server's 20 messages per
  second. Before 2026-11-16 the direction waited for the next frame and went out at most
  every 100 ms.
- **The own ghost answers at once** (session 2026-11-16-RESPONSE): it is drawn where the own
  direction has already taken it, moved with the server's own movement rule (`stepGhost` in
  game-core: speed, carrying, field edge) and pulled smoothly towards the server's position
  (`src/prediction.ts`; the server's word counts as `PREDICTION_LAG_MS` old, a gap fades by
  frame time / `CORRECTION_MS` per frame, above `SNAP_DISTANCE` it snaps). Display only:
  nothing of it leaves the client, the server's position is the truth (THREATS row 36).
  Every other ghost stays 100 ms behind the newest state, interpolated. Measured: a key
  press shows on screen in 8 ms median (14 ms p90) against 113 ms (129 ms) before
  (docs/BALANCE.md "Response").

## Screen

Built for readability after the owner's play test of 2026-11-15 (team unclear, own shrine
lost, only part of the field visible, coins looking like ghosts, names overlapping and
hidden under the top bar).

- **Top bar.** The season clock, and below it a band for every client: on the left "You are
  Team <Season>", large, in the team colour (spectators see no such line; below 480 px width
  it reads "Team <Season>" so the name is never cut off), on the right the corner buttons
  "View: …" and "Sound on/off". No control sits on the field there. The field, the ghosts
  and every label are drawn only below the bar (`belowBar` in `packages/render/src/view.ts`).
- **View modes** (owner decision 2026-11-15), the corner button "View: Near / Overview" or V,
  remembered in the browser; every player starts in "Near":
  - "Near": the camera follows the own ghost (about 1100 field units on the shorter side,
    never past the field edge, except that it may look past the bottom edge by the height
    of the controls at the bottom of the screen, so the bottom shrines rise above them). A
    minimap below the bar, in the top corner away from the own shrine's side (so it never
    covers the own shrine), shows the whole field: every shrine (the own one ringed), coins
    as dots, other ghosts as tiny dots in their team colours, the own ghost white, and the
    part the camera shows. When the own shrine is out of sight an arrow at the screen edge
    points to it, labelled "Your shrine"; it keeps out of the minimap and of the thumb zones
    (the action or shrine buttons, and on touch screens the joystick corner, 220 × 260 px
    at most; `hudOnField` in `src/hud.ts`, `edgeArrow` in `src/arrow.ts`, tested). Phone and
    desktop alike.
  - "Overview": the whole field fits the screen.
  - A spectator always sees the whole field and has no view button.
- **Shrines.** The own shrine glows, breathes gently and is labelled "Your shrine"; the
  others keep "<Season> shrine". A shrine label sits below its shrine, or above, left or
  right of it when that spot is out of view or a visible control (the action or shrine
  buttons) covers it; a shrine in a corner of the view moves its label inside
  (`shrineLabelAt`, tested). Before 2026-11-16 a shrine at the bottom edge of the view put
  its label below the screen.
- **Ghosts and coins.** Ghosts are circles in their team colour; the own ghost has a white
  ring and the label "You". Carriers are larger, glow, leave a short trail and show name and
  coin count; a ring shows their coins: solid in the current season's colour, dashed grey
  for coins worth half now. Field coins are small diamonds in their season's colour (the
  token logos replace them later), so a Summer coin no longer looks like a Team Summer
  ghost. Team colours: Spring #AFB84E, Summer #E06E22, Autumn #F9A825, Winter #04AAF7. The
  ground takes a cast of the current season's colour.
- **Picking up.** Ghosts and coins are drawn with the game core's sizes (`ghostRadius`,
  `coinRadius`; render `ghostRadiusPx`, `coinRadiusPx`, tested), and the field coins come
  from the newest state (since 2026-11-16): the own ghost is drawn at the newest moment or
  ahead of it, and its coin disappears 66 ms (median) after the drawn shapes touch, against
  197 ms with the coins of the buffered moment. The price: another ghost's coin disappears
  about 114 ms before that ghost's drawn shape reaches it (32 ms after with the buffered
  coins; docs/BALANCE.md "Response"). From 2026-11-15 to 2026-11-16 the coins came from the
  buffered moment (`stateAt`, removed); before that from the newest state too. Only in a phone's
  "Overview" are the shapes drawn larger than their size (at least 4 px for a ghost, 3 px for
  a coin), so there they touch slightly before the pickup.
- **Names.** Every ghost on screen is named (`placeLabels`, `packages/render/src/labels.ts`,
  tested; owner's observation 2026-11-15: unnamed dots): the own one "You" (with its coin
  count), a carrier its name and coin count ("Bot 7 · 3"), any other ghost — for players —
  its tag, the bot's number ("7", "P5" for a player); spectators see full names. Labels never
  overlap each other, another ghost or a shrine label (since 2026-11-16; before, names could
  sit on the ghost next door or on a shrine label): the own label first and on top, then the
  carriers, richest first, each at the first free spot — the full text above or below the
  ghost, then its tag above, below, right or left, then the tag further out joined to the
  ghost by a thin leader line. Nothing is drawn under the bar, and a label at the screen
  edge is moved inside.
- **Separation.** Ghosts softly push each other apart in the game core (docs/GAME-CORE.md),
  so crowds no longer stack on one point.
- The season clock at the top shows the four seasons of the match in order, the current one
  highlighted, the time left and the next season; the team values sit on the right when the
  screen is wide enough.

## Halving staging (CONCEPT.md §2b, §13)

At every season change: the clock counts down the last 10 s in red; at the halving a large
"HALVING — <Season> is in season" announcement (3.5 s), a short white flash, the new
season's coins start to fall and the ground changes colour, carried coins of the old
season switch to the dashed half-value look, and one tone plays. The tone is generated with
Web Audio (no audio file), sounds only after the first key or touch, and can be muted with
the "Sound on/off" button (remembered in the browser).

The match end is staged the same way (owner decision 2026-11-16; one mechanism, `Hud.deadline`
and `DeadlineTone`): in the last 10 s the clock reads "LAST CHANCE — secure now · 0:07" in
red — the server says the countdown runs to the end (`STATE_TO_END`) —, at the end
"MATCH OVER" (2 s), the flash and the tone; then the result screen. During the result the
clock reads "Match over".

## After the match

The result screen comes from the server's recap message (since 2026-11-16) and lists the
match's awards — "Biggest steal: Bot 11 took 3 from Bot 21", "Closest save: Bot 30, 0.1 s
left", "Last secure: Bot 13, 1"; one nobody earned is left out —, the teams and the top
eight players by secured value, the own place, the time to the next match, and the bridge
box with the exact text of CONCEPT.md §8, "Start
here" (the website's newcomer page, `https://stentertainment.net/start`), "Try the simulator"
(`https://seasonaltokens.org`) and "No financial advice". `bridge.enabled` in `src/config.ts`
switches the box off; it is on by default. The next match starts after the result pause.

## Development

- `pnpm dev` starts server, client (http://localhost:5930) and viewer (5931) hidden.
- `pnpm dev --lan` also binds server and client to the local network and prints the address
  for a phone in the same Wi-Fi; never the default, refused with `NODE_ENV=production`.
- `SEASON_SECONDS` (15–75) and `RESULT_SECONDS` (3–60) shorten the match on the server; the
  server is development only.

## Browser tests (`pnpm e2e`)

Playwright (pinned dev dependency, Chromium) starts its own server on 3932 with 15 s seasons
and the client on 5932, then plays one short match at desktop size (keyboard) and at phone
size (Pixel 7, touch through the browser's own input pipeline): join, move, reach the own
shrine and read both labelled buttons, see a HALVING announcement and the new season's
coins, and the result screen with the bridge box. Screenshots of each step go to
`reports/screens/latest/` (git-ignored). CI runs it as its own job (`e2e`).

`e2e/readability.e2e.ts` (both sizes) checks the play tests' points: "You are Team …"
visible and not cut off, the corner buttons inside the band, in "Near" the minimap, the own
shrine in sight at home with its label drawn, the arrow once the shrine is out of sight and
gone again at home, V (desktop) or the button (phone) switching to "Overview" and the
choice surviving a reload. In every frame it samples while walking: every ghost on screen
named, no label under the bar, past the screen edge, on another label or on a shrine label,
every shrine label in view wholly inside it, the arrow out of the thumb zones, the own shrine
label under no control and not under the minimap. Screenshots `<size>-hud.png`, `<size>-near.png` and
`<size>-overview.png`. The spectator spec also checks that a spectator has no team line and
no view button.

`e2e/help.e2e.ts` (both sizes, an empty browser storage): the help shows on the first visit
with its five drawings, closes with a key or a tap, stays closed after a reload and opens
again with "?" (key on desktop, button on the phone); screenshot `<size>-help.png`. Every
other spec starts with the help marked as seen (`storageState` in the Playwright config).
`e2e/feedback.e2e.ts` (desktop) runs against a second stack — server 3934 with
`SCENARIO=steal`, client 5934 — where every joining player stands beside an opponent hunter
carrying nothing (`apps/server/src/scenario.ts`, development only): the hunter robs the
player ("… stole … from you"), the Steal button lights up with the range ring shown, Space
robs it back ("You stole … from …"), walking away dims the button; screenshot
`desktop-steal.png`.
`e2e/response.e2e.ts` (desktop): eight key presses from standing; the drawn own ghost moves
within 50 ms of the key in the median (measured 8 ms; 113 ms before the prediction).

**`pnpm latency`** (on demand, never in `pnpm e2e`): `e2e/latency.measure.ts` with its own
config (`e2e/latency.config.ts`, server 3938 with the default 5-minute match, client 5938,
one desktop Chromium). It records every state, every message sent, every key and every frame
(`e2e/recorder.ts`), collects coins for 90 s, presses a movement key 55 times from standing,
and reads the recording (`e2e/latency.ts`): key → drawn moving with its parts (until sent,
until the server's state shows it, until drawn), coin spawned → drawn, and the pickup offset
for both coin sources. Writes `reports/response/latency-latest.json`; results in
docs/BALANCE.md "Response".

`window.__client` is written every frame for these tests: the frame's time and the server
moments it shows (render target, newest state, coins), mode, own ghost and team, own
position and carried coins, season, field coin count, halvings seen, result shown, and what
the frame drew (view mode, bottom of the bar, minimap and arrow positions, own shrine in
sight and its label's box, the controls and thumb zones on the field, the placed labels) —
only what the screen shows already.
