Client URL: http://localhost:5930 (viewer with the live tuning panel: http://localhost:5931) — `pnpm dev` from `proto/sumo` is running: Sumo only, Points and Last One Standing in turn (the dev default since LIVES; `GAME_MODE=rotate pnpm dev` brings in hill and bomb).

# Night 2026-11-17 — Seasonal Sumo — morning sheet

| Piece                                   | State   | Notes                                                                                                                                  |
| --------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Close Seasonal Spirits                | done    | tag `v5-prototype` (on `d635cf2`); merge `a09f803` "merge: Seasonal Spirits paused"; `feat/v5-rules` and `chore/pause` deleted          |
| 2 The Sumo prototype                    | done    | `a8bfb32` on `proto/sumo`; CI 43981811562 and CodeQL 43981811448 green; human-like bots (addendum 2) folded in                         |
| 3 Play and check smoothness             | done    | two full matches at both sizes; tick mean 0.096 ms, max 8.9 ms (in-process); see "Piece 3" below                                       |
| 5 Modes                                 | done    | `d2f0baa`, CI 43987959269 and CodeQL 43987959097 green; one shared core, a mode per match; `pnpm dev` rotates |
| 6 Mode "King of the Season" (hill)      | done    | walls, zone in the season's quarter, 1 point/s inside, jump and halving every 45 s, "King", "Bouncer"           |
| 7 Mode "Halving bomb" (bomb)            | done    | walls, 1 point/s, one bomb per 8, pass by touch, no pass back for 1 s, every 20 s it goes off, "Hot hands", "Cool head" |
| 8 Hand over                             | done    | `pnpm dev` running with the rotation; client, viewer, server answer; one full hill and one full bomb match played, see "Piece 8" |

## Needs the owner's word

- Play all three modes: which is fun, which makes you want another round. Nothing of
  `proto/sumo` is merged.
- The feel: set arena size, walking speed, dash and push with the viewer's sliders (see
  "Tune") and send the copied line.
- Lives and the variants: the number of lives, Points or Last One Standing, and what Last One
  Standing does after the last season — with the panel (see "Lives"); the copied line holds all.
- The other placeholders: respawn, the bots' reaction time and aim
  noise; the walls (1400 square), the zone (300 at the start), one bomb per 8 players, the
  times (hill 3:00 with a jump every 45 s, bomb 3:00 with a blast every 20 s).
- Try the phone by hand: the scripted phone player did badly in every mode (see the notes);
  most likely the automation's touch, but only a real phone can tell.

## Piece 3 — played

Two full matches on `pnpm dev`, desktop (1280 × 800, keyboard) and Pixel 7 (joystick, Dash
button) at the same time, "Near" until the third season, then "Overview". The scripted
player steers at the nearest ghost on screen and dashes when close; it reacts at once, so it
is a strong player, not an average one. Screenshots: `reports/screens/latest/sumo-*.png`
(start, crowd, the three halvings, recap; both sizes).

- **Desktop:** 32 and 35 knockouts, first of 32 both times, "Best pusher" and "Survivor"
  (2:52 without a fall) in match 1, 8 and 11 own falls. Against a player who never waits,
  the bots are easy prey: they arrive, wobble, dash a moment late.
- **Phone:** 50 and 54 own falls, 15 and 7 knockouts. Most of that is the harness: the tap
  on Dash is sent as a second touch through the same automation channel as the joystick,
  which disturbs the joystick for a moment, so the ghost drifts. A real phone has separate
  fingers; still worth a look by hand.
- **What these notes rest on:** the scripted runs, their counts and the screenshots — not on
  watching a match live by eye. The owner's own play is the real test.
- **Crowds:** the start is four neat arcs, one per team, and the teams meet in the middle
  early (the crowd screenshot fired in the first season). Over a match there are ~520 falls
  for 32 ghosts (simulate, seed 1), so the scrums do throw people off all the time.
- **Halving:** the dashed ring during the countdown does its job. In the last halving
  screenshot the ghosts sit packed along the shrunken edge, several half over it: the
  shrink catches people who were fighting, which is where the drama is.
- **Dash:** the scripted desktop player won both matches mostly by dashing whenever close,
  so the dash is strong; the cooldown ring on the button reads clearly in the screenshots.
  Whether it *feels* satisfying needs a human hand.
- **Confusing or awkward:** the halving banner covers the middle of the arena for its full
  time, right where the fight is (both sizes). On the phone in "Overview" after the last
  halving the arena is ~180 px wide and the joystick sits over its lower left; labels around
  the tiny disc crowd each other (none off screen, none wrong). The recap's team scores and
  the bridge text fit; the player list shows the top 8.
- **Broken:** nothing found; no label fault at either size in either match; matches 303 s.
- **Do the bots look human?** In the screenshots they do not move in lockstep after the
  start, and by construction they hesitate, dash late or at nothing, and some go too close
  to the edge (66 uncredited falls per simulated match are bots walking off on their own).
  Next to the instant script they are clearly weaker — about what an average human at
  250–450 ms would be. Values: reaction
  250–450 ms per bot, ± 50 ms per decision; aim noise ± 6° at average form; a good dash
  taken 60 % × form; form 0.85–1.15.

**Smoothness.** In-process, `MatchHost.tick` plus `encodeState`, 32 ghosts, 3 full matches
(18 900 ticks): mean 0.096 ms, p99 0.47 ms, max 8.9 ms — far below 50 ms. The live dev
server: 20.0 Hz, 452 bytes per state; its `maxTickMs` over 15 min uptime was 88 ms once,
with two Chromium windows and Vite on the same machine (one outlier; the in-process max is
8.9 ms, so the cause is the machine, not the tick). Background load 74 % CPU before the
runs, 34 % after.

## Piece 8 — hand-over and the modes as played

`pnpm dev` (rotation on): server 19.8–20.0 Hz, 493 bytes per state, `maxTickMs` 5 over 11 min
with the two browsers; client and viewer answer (200). A scripted player joined during a sumo
match and played the next two in full at desktop and phone size: King of the Season, then
Halving Bomb (183 s each, no label fault at either size). Screenshots:
`reports/screens/latest/{hill,bomb}-{desktop,phone}-{start,play,halving-1,halving-2,recap}.png`.
Sumo was played twice in piece 3. What these notes rest on: the runs' counts and the
screenshots, not a human hand.

- **Seasonal Sumo** (piece 3): scrums at the middle that break up fast with a dash, a ring of
  ghosts caught by the shrinking edge at every halving; a player who dashes whenever close
  wins easily against the bots.
- **King of the Season:** the zone pulls everyone into one big scrum — at times 25 of 32
  ghosts in or around it — and at every jump the whole crowd runs across the field to the new,
  smaller zone: the funniest moment of the mode, and the halving is easy to read. The desktop
  player (into the zone, then at the nearest ghost) was "King" with 102 s of 180 and first of
  32; a bot was "Bouncer" with 90 — bounces are cheap in a scrum this tight, probably too
  many to mean much. Team scores close (645–772). Awkward: with everyone in one disc the
  labels pile up; the 3.5 s banner covers the field just as the run to the new zone starts.
- **Halving Bomb:** four bombs, carriers chase, the others drift away; passes happen (the
  "Hot hands" bot passed 9) and the carriers' points visibly halve at each blast. The ticking
  bomb above a ghost is readable on desktop but small; the fuse and spark show the time.
  Awkward: everyone's score rises in step, so most labels read the same number ("Bot 4 · 28");
  20 s turns come fast and the banner shows 8 times in 3 minutes; the scripted player without
  a bomb kept away well, but once it held one it carried it for long stretches (333 of 1326
  samples) and ended 20th of 32 — the bots flee convincingly.
- **Phone:** in hill the scripted phone player stayed pressed against the right wall almost
  the whole match (2 points), and in bomb it held a bomb most of the time; with the same logic
  the desktop player did well. The same pattern as piece 3 (the Dash tap and the joystick come
  through one automation touch channel) — I suspect the harness, not the game, but it is not
  proven.
- **Bots** (all modes, unchanged values): reaction 250–450 ms per bot ± 50 ms per decision,
  aim noise ± 6° at average form, a good dash taken 60 % × form, form 0.85–1.15. They look
  like hesitant humans: they overshoot, sometimes dash at nothing, and in hill they crowd the
  zone as people would.

## Fix — the whole arena always on screen

Owner's observation (1918 × 945, "Near"): only the upper half of the arena showed. Now one
camera for all three modes fits the whole playing area below the band, clear of the Dash
button and the joystick; in sumo it follows the shrinking edge, so the arena stays as large
on screen (783 → 770 px wide on desktop over three halvings). The view toggle, key V and the
minimap are gone; the bots see the whole playing area too. One sumo match played at 1918 ×
945 and on a Pixel 7: no fault. Screenshots:
`reports/screens/latest/sumo-{desktop,phone}-{start,last-halving}.png`.

## Fix 2 — bots zip around and are almost impossible to hit

Owner's observation (desktop, Sumo): the bots zip around very fast, there is practically no
chance to hit them; the band text cut at the left; no ghost shows "You".

**Measured** (bots: `simulate`, seeds 1–3, 96 bot-matches; live: a Node client drawing as the
browser does, 60 s of Sumo on `pnpm dev`, pixels at 1918 × 945, r = ghost radius 16; D = arena
diameter 1800):

| What                                          | Before                     | After                      |
| --------------------------------------------- | -------------------------- | -------------------------- |
| bot dashes per minute (median / max)          | 22.6 / 26.1                | 15.3 / 17.0                |
| bot time at or above top speed (median)       | 22 %                       | 14 %                       |
| bot speed median / p90 (u/s)                  | 253 / 546 (0.14 / 0.30 D/s) | 233 / 361 (0.13 / 0.20 D/s) |
| a bot's dash carries (median / p90)           | 5.5 / 7.0 diameters        | 3.1 / 4.6 diameters        |
| scripted player: dashes per minute on arena   | 49.5                       | 48.2                       |
| scripted player: at or above top speed        | 29 %                       | 17 %                       |
| scripted player: speed median / p90 (u/s)     | 260 / 580                  | 238 / 360                  |
| other ghost behind, at a dash hit (median / p90) | 64 u = 28 px = 4.0 r / 6.5 r | 29 u = 13 px = 1.8 r / 3.1 r |
| other ghost behind, every frame (median / p90) | 2.6 r / 5.0 r              | 1.1 r / 1.5 r              |
| own ghost ahead of the server (median / p90)  | 1.4 r / 3.2 r              | 1.3 r / 2.5 r              |
| drawn path jerk p99 (units per frame²)        | 10.3                       | 7.9                        |
| crossing the arena at top speed               | 5.6 s                      | 5.6 s (unchanged)          |

**Cause.** The bots dashed about 23 times a minute, nearly whenever the 1.5 s cooldown let
them, and each dash flung them 5–7 ghost diameters at up to 900 u/s — a fifth of their time
faster than anyone can run. On top, the client drew every other ghost 100 ms behind the
newest state: at the moment of a dash hit 4 ghost radii (p90 6.5) behind where it really
was, while the own ghost is drawn about 1.4 radii ahead — so a player aimed at a ghost that
had already gone.

**Changed.** Bots dash at most once per 3 s (`bots.dashGapMs`, placeholder) and only when
their brain has a target lined up; the dash at nothing (`bots.earlyDashChance`) is gone.
Their speed and dash are the players' own (one physics). The dash is lowered from 900 to
640 u/s (−29 %, placeholder), so it carries at most 4 ghost diameters before it is back at
top speed (7.3 before); top speed stays (crossing 5.6 s). Other ghosts are drawn 50 ms (one
tick) behind instead of 100 ms, extrapolated briefly when a state is late: tried 100, 60,
50, 30 ms and full extrapolation — 50 ms gives the same hit lag as 30 ms (1.8 r) with less jerk;
full extrapolation gets to 1.1 r but doubles the jerk. The remaining ~1.8 r at a hit is the
knock itself, which no client can foresee.

**Band and "You".** Not reproduced in Chromium at 1918 × 945: the page never scrolled
(scroll offsets 0 throughout), the team line starts 12 px from the edge; a cut at the left
of both the canvas line and the band points at something covering the window's left edge
(a browser side panel, a window partly off screen) — worth a look on the owner's machine.
What was really cut: on a 390 px phone the countdown line ("HALVING in 0:06 — the arena
halves, then Summer is in season") ran past the right edge; it now shrinks to fit (13 px
down to 9 px). "You": in 73 frames of respawn protection on the live client the own ghost
was "You" every time; the owner probably saw it while out (not drawn for 3 s after a fall).
Tests now guard both: the band text at 1918 × 945, 1280 × 800, 390 × 844 and 844 × 390, and
"You" in every sampled frame and with the protection ring in a crowd.

## Tune — smaller arena, slower walking, harder pushes, live sliders

Owner's observation after fix 2: nobody falls off in the first season, clumps in the middle,
too fast overall, a push does not carry far enough, the ghosts tiny. New starting values (all
placeholders, the owner decides with the sliders): arena 25 ghost diameters across
(`arenaRadius` 900 → 400), walking 25 % slower (`maxSpeed` 320 → 240, `acceleration`
1200 → 900), dash twice the top speed (`dashSpeed` 640 → 480, carries 3 diameters), a dash hit
throws at `knockSpeed` 320 — set, not added on top of the bounce, so the throw no longer grows
with the number of ticks the dash touches — and the thrown ghost counts `knockWeight` 10
heavier for the dash's 250 ms, so a crowd behind it gives way; no bounce (`restitution`
0.6 → 0).

Measured with 32-bot sumo matches, seeds 1–10 (scratch script on `game-core`; pushes in an
empty match, the hit ghost standing and holding nothing, the dasher holding on for its dash):

| Measure                                                   | Before (`d218cc8`)        | After                     |
| --------------------------------------------------------- | ------------------------- | ------------------------- |
| Falls per match in season 1 / 2 / 3 / 4                   | 4.8 / 19.8 / 64.4 / 172.5 | 73.4 / 126.0 / 204.8 / 126.3 |
| Ghost-time in clumps (≥ 5 others within two diameters)    | 0.9 %                     | 32.9 %                    |
| Arena across / crossing at top speed                      | 56 diameters / 5.6 s      | 25 diameters / 3.3 s      |
| Dash hit throws a standing ghost                          | 15.8 diameters            | 4.8 diameters             |
| Dash hit into a crowd of four behind it                   | 4.8 diameters (30 %)      | 3.9 diameters (81 %)      |
| Plain bump at top speed                                   | 3.0 diameters             | 1.5 diameters             |

- The first season now has falls (73 instead of 5 per match, about two per ghost).
- The clump share rose with the smaller arena: 32 ghosts on a quarter of the old disc. The
  bots seek the nearest opponent and the middle; their distances (`bots.edgeMargin` 140,
  `bots.dashRange` 220) were set for the 900 arena and are not on the sliders — left as they
  are, worth a look once the owner has chosen a size.
- Crossing the arena takes 3.3 s now, under the 4 s of fix 2's rule; it follows from the
  owner's two numbers (25 diameters, 25 % slower), and the sliders move it.
- A bump moves a standing ghost 1.5 diameters, not 1: with no bounce at all the runner still
  shares its speed with the one it hits; less would need a new rule. The push slider does not
  change it (it is the dash hit's).
- Dash carry 900 → 640 in fix 2 was the session's own measurement, not the owner's: the
  comment at `dashSpeed` said "owner 2026-11-17" and now says what was measured.

**Live sliders.** Two windows: the game on http://localhost:5930, the viewer on
http://localhost:5931 with the panel "Live tuning" at the top right — arena size (shown in
ghost diameters across), walking speed, dash strength, push strength. A change holds at once
in the running match (the arena eases to its new size over 2 s, like a halving); the bots and
the player's own prediction use the new numbers. Reset brings back the starting values; the
line under the sliders holds the four numbers, Copy puts them on the clipboard — send that
line and the session sets them as the new starting values. Checked live: the panel answers
and shows the starting line; arena 400 → 560 and walking 240 → 360 reached the running match
(the client's arena 560 after 3 s), Reset brought 400 back, a POST with a foreign `Origin` got
403. Security: docs/SERVER.md "Live tuning", THREATS row 39.

## Fix 3 — passing through, and finding the own ghost

Owner's observation after the tune: the own ghost is found but not distinct enough; driving at
bots to push them, he often passed straight through them.

**Cause, measured.** Two things, one on each side.

- Server: a bug from the tune. The thrown ghost's crowd weight (`knockWeight` 10) went into
  the throw speed too: a ghost thrown a moment ago that dashed — or was dashed into — threw at
  10 × 320 = 3200 u/s, 160 units a tick, five ghost diameters, and flew through everything in
  its way. Running is 12 units a tick, a dash start 24, the diameter 32: at the normal speeds
  one tick never stepped over a ghost, but the sliders allow a dash of 60 a tick.
- Client: the own ghost's prediction ignored the other ghosts: it was drawn running through a
  bot until the server's answer (with the contact) arrived and pulled it back.

| Measure                                                                   | Before (`9f3c65a`) | After |
| ------------------------------------------------------------------------- | ------------------ | ----- |
| Seeded 32-bot matches (seeds 1–10): pairs crossing without a contact       | 3125 (62 a match-minute; 1413 through the middle) | 2 (grazes) |
| … ghost steps longer than a diameter in one tick (longest)                 | 5329 (188 units)   | 7 (37) |
| Scripted player on the live stack: own ghost crossing another (server)     | 1 in 90 s          | 0 in 90 s |
| … own ghost drawn deep in another (closer than 0.75 diameter) while the server has them apart | 10.7 % of frames | 0.8 % (28 of 3488, 180 s) |

**Fix.** The weight now only moves ghosts apart; a throw is `knockSpeed` times the season
ratio. A tick runs in sub-steps (no ghost moves more than a third of a radius in one, at the
fastest the rules and sliders allow: 5 at the starting values, up to 12 at the slider tops),
contacts resolved after each; `stepGhost` takes the same sub-steps, so the prediction matches.
The prediction stops the own ghost at a ghost it touches (it may slide round it, as the
server's contact lets it; wedged between two, it stays where it was drawn). What is left on the
client: another ghost moving into the standing own one within a frame, until the server pushes
it aside.

**The own ghost now.** Drawn on top of every other ghost; a thick white ring on a dark edge; a
small white arrow pointing down at it from above; "You". After a respawn, at every match start
and on joining, a ring pulses three times (1.5 s). While out after a fall the band's team line
reads "You fell — back in 3 / 2 / 1" and the team's respawn band (its quarter, a quarter to
three quarters of the radius) is drawn faintly on the arena — derived from what the client
already has, no new message. The arena-size slider moves every ghost with the edge (nobody falls
by a slider; the change still shows at once).

**Checked live** (`pnpm dev`, Sumo, 15 s seasons for the check): 108 s, two match changes, 15
falls, five slider changes 400 ↔ 300: the client owned its ghost in all 537 samples; the band
line counted 3, 2, 1.

## Lives — limited lives, two Sumo variants, more sliders

Owner's decision after playing with the sliders: the smaller the arena, the more crowded and
confusing it gets — fewer players should be left in the late phases.

**What the owner sees.** Next to "You are Team …" the own lives as hearts (3); a lost one fades.
After a fall the line counts "You fell — back in 3 / 2 / 1"; after the last life it reads "You
are out — watching", the Dash button goes and the view stays on the whole arena; back in at the
next match. The clock names the variant ("Seasonal Sumo · Points", "· Last One Standing"); each
team chip shows its ghosts still in ("Spring 4 · 7 in" in Points, "Spring 7 in" in Last One
Standing). The help's first line is the variant's rule in one sentence. Points ends at its time
or once only one team has ghosts left, the most knockouts wins; Last One Standing has no points
and the last ghost in wins for its team. Its result lists the winner, the teams still in at the
time limit and the teams knocked out, last out first, with "Last one standing" and "Best pusher".

**The panel.** Below the four sliders: lives (1–9, from the next match), the variant (Points /
Last One Standing / alternate, from the next match), after the last season (stop, time limit /
keep halving / stop, no time limit — at once) and keep halving every (30–120 s, at once). The
copy line holds every value, the choices by name. `pnpm dev` alternates the variants.

- "Stop, time limit" (default): no shrink after the third halving; at the time limit the team
  with the most ghosts still in wins, ties by lives left, then team order.
- "Keep halving": after the third halving the arena halves every interval until one is left;
  no time limit.
- "Stop, no time limit": the size stays, no time limit, the last one wins; the clock shows the
  time played ("1:07 played").

**Played** (`pnpm dev`, 15 s seasons for the check, a scripted player running off the edge now
and then): one Points and one Last One Standing match, then the panel. Hearts 3 → 2 → 1 → 0,
the countdown 3, 2, 1 between, "You are out — watching" after the last; the chips counted the
ghosts down; the help switched sentence with the variant; Points' result as before, Last One
Standing's "1. Winter winner, 2. Autumn 5 still in …". "Stop, no time limit" switched in a
running match: past the 60 s limit the clock read "1:07 played"; "keep halving every 30 s":
the arena halved on until one Summer ghost was left. A page on another origin: 403. Reset.

**Odd, noted.** The copy line no longer fit two lines (now four). The Dash button stayed while
out of lives (now hidden). In Last One Standing "Your place" on the result screen still ranks by
knockouts. With "keep halving" the camera follows the tiny arena, so the last ghosts are drawn
very large. In the 60 s check matches Last One Standing ended by the time limit with 2–5 ghosts
per team still in. Seeded 32-bot matches (seeds 1–5, 3 lives): Points runs its 5:00 with 3–11
of 32 left; "stop, time limit" the same, won by the team with the most left; "keep halving" is
over at 5:10–5:17; "stop, no time limit" was over twice (18:39, 20:45) and three times not
after 30:00 — at radius 141 the bots' edge margin of 140 keeps them in the middle (BACKLOG
OPEN ac).

## Notes

- Addendum 1 (no team check, no stand-in) and addendum 2 (human-like bots, equal seats)
  arrived during piece 2 and are folded into it: the team check, the fairness search and the
  stand-in tools are removed rather than left dead; the stand-in's perception lives on as
  the bots' eyes.
- The party idea is recorded in BACKLOG OPEN (z) with piece 2's commit; piece 1's merge was
  already done when the addendum arrived.
