# The player client (`apps/client`)

The first playable version: plain TypeScript, Canvas 2D and Vite, no game framework. It
sends a direction and the one action; everything it shows comes from the server's state
message (docs/SERVER.md). Development mode only: there is no sign-in yet (CONCEPT.md §12).

## Files

| File                       | What it holds                                                                |
| -------------------------- | ---------------------------------------------------------------------------- |
| `src/main.ts`              | Wiring and the frame loop: interpolate, draw, buttons, result, test hook     |
| `src/connection.ts`        | The one WebSocket: hello, welcome or spectating notice, states, sending      |
| `src/input.ts`             | Keyboard and the touch joystick                                              |
| `src/hud.ts`               | Action button, shrine buttons, HALVING announcement and flash, notices, mute |
| `src/result.ts`            | Result screen and bridge box                                                 |
| `src/sound.ts`             | The halving tone (Web Audio)                                                 |
| `src/config.ts`            | Bridge box on/off and its links, camera span                                 |
| `e2e/`                     | Playwright config, helpers, the player and the spectator specs               |
| `packages/render` (shared) | The Canvas drawing the client and the viewer share: field, ghosts, clock     |

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

- Keyboard: WASD or arrows to move, Space for the action (steal), 1 Secure, 2 Swap.
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

- The camera follows the own ghost (about 1100 field units on the shorter side, never past
  the field edge); a spectator sees the whole field.
- The own ghost has a white ring and the label "You". Carriers are larger, glow, leave a
  short trail and show name and coin count. A ring around a carrier shows its coins: solid
  in the current season's colour, dashed grey for coins worth half now.
- Team colours: Spring #AFB84E, Summer #E06E22, Autumn #F9A825, Winter #04AAF7. Field coins
  are discs in their season's colour (the token logos replace them later). The ground takes
  a cast of the current season's colour.
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

`window.__client` is written every frame for these tests: mode, own ghost and team, own
position and carried coins, season, field coin count, halvings seen, result shown — only
what the screen shows already.
