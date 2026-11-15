# The player client (`apps/client`)

The first playable version: plain TypeScript, Canvas 2D and Vite, no game framework. It
sends a direction and the one action; everything it shows comes from the server's state
message (docs/SERVER.md). Development mode only: there is no sign-in yet (CONCEPT.md §12).

## Files

| File                       | What it holds                                                                  |
| -------------------------- | ------------------------------------------------------------------------------ |
| `src/main.ts`              | Wiring and the frame loop: interpolate, draw, buttons, result, test hook       |
| `src/scene.ts`             | One canvas frame: field, ghosts, labels below the bar, clock, Near extras      |
| `src/view-mode.ts`         | "Near" / "Overview": the corner button and V, remembered                       |
| `src/minimap.ts`           | The minimap in "Near", in the corner away from the own shrine (tested)         |
| `src/arrow.ts`             | The "Your shrine" arrow at the screen edge (placement tested)                  |
| `src/storage.ts`           | Remembered choices (mute, view) in localStorage, safe when storage throws      |
| `src/connection.ts`        | The one WebSocket: hello, welcome or spectating notice, states, sending        |
| `src/input.ts`             | Keyboard and the touch joystick                                                |
| `src/hud.ts`               | Buttons, HALVING announcement and flash, notices, mute; HUD rects on the field |
| `src/result.ts`            | Result screen and bridge box                                                   |
| `src/sound.ts`             | The halving tone (Web Audio)                                                   |
| `src/config.ts`            | Bridge box on/off and its links, camera span                                   |
| `e2e/`                     | Playwright config, helpers, the player and the spectator specs                 |
| `packages/render` (shared) | The Canvas drawing the client and the viewer share: field, ghosts, clock       |

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

## Controls (CONCEPT.md §8)

- Keyboard: WASD or arrows to move, Space for the action (steal), 1 Secure, 2 Swap, V
  switches the view.
- Touch (the primary pointer is a finger): a joystick appears where the left thumb touches
  the left half of the screen; the action button sits under the right thumb. The buttons
  never reach into the left half.
- At the own shrine the same spot shows two buttons instead of the action button:
  "Secure (<value now>)" and "Swap (<n> <next season>, worth <now> now / <later> later)".
  The numbers are the server's offer for the own ghost (`offers` in the state), never
  computed by the client; a button is greyed out when it would do nothing.
- The direction goes out when it changes, at most every 100 ms; actions go out at once.
  That keeps a player well inside the server's 20 messages per second.

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
  right of it when a visible control (the action or shrine buttons) covers that spot
  (`shrineLabelAt`, tested).
- **Ghosts and coins.** Ghosts are circles in their team colour; the own ghost has a white
  ring and the label "You". Carriers are larger, glow, leave a short trail and show name and
  coin count; a ring shows their coins: solid in the current season's colour, dashed grey
  for coins worth half now. Field coins are small diamonds in their season's colour (the
  token logos replace them later), so a Summer coin no longer looks like a Team Summer
  ghost. Team colours: Spring #AFB84E, Summer #E06E22, Autumn #F9A825, Winter #04AAF7. The
  ground takes a cast of the current season's colour.
- **Names.** Every ghost on screen is named (`placeLabels`, `packages/render/src/labels.ts`,
  tested; owner's observation 2026-11-15: unnamed dots): the own one "You" (with its coin
  count), a carrier its name and coin count ("Bot 7 · 3"), any other ghost — for players —
  its tag, the bot's number ("7", "P5" for a player); spectators see full names. Labels never
  overlap: the own label first and on top, then the carriers, richest first, each at the
  first free spot — the full text above or below the ghost, then its tag above, below, right
  or left, then the tag further out joined to the ghost by a thin leader line. Nothing is
  drawn under the bar, and a label at the screen edge is moved inside.
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

## After the match

The result screen lists the teams and the top eight players by secured value, the own place,
the time to the next match, and the bridge box with the exact text of CONCEPT.md §8, "Start
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
choice surviving a reload. In every frame it samples while walking: every ghost on screen named, no label under the bar
or past the screen edge, the arrow out of the thumb zones, the own shrine label under no
control and not under the minimap. Screenshots `<size>-hud.png`, `<size>-near.png` and
`<size>-overview.png`. The spectator spec also checks that a spectator has no team line and
no view button.

`window.__client` is written every frame for these tests: mode, own ghost and team, own
position and carried coins, season, field coin count, halvings seen, result shown, and what
the frame drew (view mode, bottom of the bar, minimap and arrow positions, own shrine in
sight and its label's box, the controls and thumb zones on the field, the placed labels) —
only what the screen shows already.
