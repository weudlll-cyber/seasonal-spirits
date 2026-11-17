# Night 2026-11-17 — Seasonal Sumo — morning sheet

Client URL: follows once the hand-over piece is done.

| Piece                                   | State   | Notes                                                                                                                                  |
| --------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Close Seasonal Spirits                | done    | tag `v5-prototype` (on `d635cf2`); merge `a09f803` "merge: Seasonal Spirits paused"; `feat/v5-rules` and `chore/pause` deleted          |
| 2 The Sumo prototype                    | done    | `a8bfb32` on `proto/sumo`; CI 43981811562 and CodeQL 43981811448 green; human-like bots (addendum 2) folded in                         |
| 3 Play and check smoothness             | done    | two full matches at both sizes; tick mean 0.096 ms, max 8.9 ms (in-process); see "Piece 3" below                                       |
| 5 Modes                                 | done    | one shared core, a mode per match (`sumo`, `hill`, `bomb`); `pnpm dev` rotates; help, banner, recap per mode |
| 6 Mode "King of the Season" (hill)      | done    | walls, zone in the season's quarter, 1 point/s inside, jump and halving every 45 s, "King", "Bouncer"           |
| 7 Mode "Halving bomb" (bomb)            | done    | walls, 1 point/s, one bomb per 8, pass by touch, no pass back for 1 s, every 20 s it goes off, "Hot hands", "Cool head" |
| 8 Hand over                             | open    |                                                                                                                                        |

## Needs the owner's word

- Play `proto/sumo` (all modes once built): which is fun, which makes you want another round.
- The placeholders: arena size, dash, push factor, respawn, the bots' reaction time and aim
  noise.

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

## Notes

- Addendum 1 (no team check, no stand-in) and addendum 2 (human-like bots, equal seats)
  arrived during piece 2 and are folded into it: the team check, the fairness search and the
  stand-in tools are removed rather than left dead; the stand-in's perception lives on as
  the bots' eyes.
- The party idea is recorded in BACKLOG OPEN (z) with piece 2's commit; piece 1's merge was
  already done when the addendum arrived.
