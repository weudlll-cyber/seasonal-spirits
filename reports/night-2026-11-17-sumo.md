Client URL: http://localhost:5930 (viewer http://localhost:5931) — `pnpm dev` from `proto/sumo` is running.
The modes take turns match by match: Seasonal Sumo (5:00) → King of the Season (3:00) → Halving Bomb (3:00) → Sumo …; whichever match is running when you open it comes first, each followed by 15 s of result.

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
- The placeholders: arena size, dash, push factor, respawn, the bots' reaction time and aim
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

## Notes

- Addendum 1 (no team check, no stand-in) and addendum 2 (human-like bots, equal seats)
  arrived during piece 2 and are folded into it: the team check, the fairness search and the
  stand-in tools are removed rather than left dead; the stand-in's perception lives on as
  the bots' eyes.
- The party idea is recorded in BACKLOG OPEN (z) with piece 2's commit; piece 1's merge was
  already done when the addendum arrived.
