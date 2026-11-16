# The game core (`packages/game-core`) — Seasonal Sumo prototype

Pure TypeScript: no network, no graphics, no clock and no randomness of its own. A match is
driven by `tick(dtMs, intents)`; its time is the sum of the `dt` values and every random
value comes from the seed (`mulberry32`), so the same seed and the same intents give the same
match. On the branch `proto/sumo` (NIGHT 2026-11-17) the core plays **Seasonal Sumo**, a rough
prototype the owner plays before anything is polished or merged; Seasonal Spirits is paused
(its last merged state is on `master`, the V5 rules on the tag `v5-prototype`).

## Files

| File                      | What it holds                                                                  |
| ------------------------- | ------------------------------------------------------------------------------ |
| `src/config.ts`           | Every number of the prototype (table below), all placeholders                  |
| `src/seasons.ts`          | Season order and the season clock                                              |
| `src/types.ts`            | Match state, ghosts and their phases, intents, events, result                  |
| `src/match.ts`            | `Match`: one tick in a fixed order; `halt` for a ghost a player takes over     |
| `src/geometry.ts`         | Distances, clamping, `stepGhost` (momentum) and `dashVelocity`                 |
| `src/arena.ts`            | The arena disc, its halving and easing, start and respawn spots                |
| `src/collisions.ts`       | Ghosts bump: apart, bounce, the dash's knock, the in-season push, touch credit |
| `src/falls.ts`            | Falling off, the credit, out time, respawn                                     |
| `src/halving.ts`          | The halving at a season turn                                                   |
| `src/recap.ts`            | The recap's awards: "Best pusher", "Survivor"                                  |
| `src/bots/bot.ts`         | The bot's brain (`botIntent`)                                                  |
| `src/bots/human.ts`       | The human-like layer every bot plays through (`createBot`)                     |
| `src/human/perception.ts` | What a bot sees: the "Near" view, a reaction time late                         |
| `src/simulation.ts`       | One full bot match with the sanity list; `src/simulate.ts` is `pnpm simulate`  |

Removed on this branch, because Sumo does not use them: coins, prices, shrines, securing,
the price board, the team check (`pnpm balance`), the fairness search and the human
stand-in round (`pnpm human`) — no balance work tonight (owner's addendum, 2026-11-17).

## One tick

In this order: time and season (a season turn is a halving), the arena's edge, falls ending
and respawns, each ghost's intent and movement by id (a dash first), collisions, new falls,
the end, the countdown.

## The rules as built (all numbers placeholders)

- **Match and seasons.** 5:00, four seasons of 75 s in the real order from `startSeason`.
- **Arena.** A disc in the middle of the field, `arenaRadius` 900 at the start. Each team
  starts on its own quarter (Spring top left, Summer top right, Autumn bottom right, Winter
  bottom left), on a ring at `startSpread` of the radius.
- **Movement with momentum** (`stepGhost`, also the client's prediction): the held direction
  accelerates by `acceleration` while the speed along it is below `maxSpeed`; `friction`
  takes a share of the speed per second (exponential, so the step size does not matter). A
  dash or a knock may go faster than running and then slows.
- **Dash** (the one action): the speed becomes `dashSpeed` towards the held direction (or
  along the motion); for `dashMs` the ghost knocks what it hits; the next dash only after
  `dashCooldownMs` — the core's rule, whatever a client sends.
- **Collisions** (`collideGhosts`, grown from Spirits' soft separation): two ghosts on the
  arena that overlap are moved apart and bounce (`restitution`), the overlap shared by their
  push factors; the team whose season is in season pushes `inSeasonPush` harder. A dashing
  ghost adds `knockSpeed` (times the push ratio) to the one it hits. Each remembers the last
  opponent that touched it; teammates give no credit.
- **Falling.** A ghost whose centre leaves the arena falls: +1 knockout for the last opponent
  that touched it within `creditMs`, and for its team; nobody scores without one. It falls
  for `fallMs` (the animation), is out until `outMs` after the fall, then respawns on its
  team's quarter at the freest of a few seeded spots, protected for `protectMs` (nothing
  pushes it, it pushes nothing).
- **Halving** at 1:15, 2:30 and 3:45: the next season comes into season and the arena's area
  halves (radius × 1/√2: 900 → 636 → 450 → 318); the edge eases in over `arenaShrinkMs`
  (slow, fast, slow). A ghost the edge passes under falls. During the 10 s countdown the
  clients draw the edge after the halving (`nextRadius`) as a dashed ring.
- **End.** The team with the most knockouts wins; `result()` gives knockouts and falls per
  player and team and each ghost's longest time on the arena without a fall. The end is
  staged like a halving (countdown, `match-end` event).
- **Recap** (`src/recap.ts`): "Best pusher" — the most knockouts (folded from the `fall`
  events; the first to reach the top keeps it); "Survivor" — the longest time without a fall
  (from the result).

## Bots

**Seats.** Bots only fill missing players: every team has 8 seats (32 slots); a joining
player takes a bot's seat in the team with the fewest players at once (the ghost stops,
`halt`), a leaving one stands for the reconnect grace, then a bot takes the seat again
(apps/server `match-host.ts`). Teams stay equal at all times.

**The brain** (`botIntent`): near the edge (`bots.edgeMargin`) back inward; otherwise to the
nearest opponent it can push, approaching a little from the side of its own wander point
(an angle by id, moved on every `bots.wanderMs`, so bots do not all meet in one spot), and a
dash when within `bots.dashRange`, lined up (`bots.dashAimCos`), not near the edge and the
cooldown over; with nobody to push, to the wander point.

**The human-like layer** (`createBot`, owner requirement 2026-11-17), the same for every bot:

- it sees what a player's "Near" view shows around it (`NEAR_VIEW`, 2000 × 1100 field units),
  a reaction time late (`perceive` in `src/human/perception.ts`);
- each bot's reaction time is drawn from `bots.reactionMs` (250–450 ms) and varies by
  ± `bots.reactionJitterMs` (50) per decision, in whole ticks;
- its direction carries aim noise of ± `bots.aimNoiseDeg` (6°) at average form;
- it takes a good dash chance only with `bots.dashChance` × form (0.6: else too late), dashes
  at nothing now and then (`bots.earlyDashChance`, too early), hesitates for
  `bots.hesitateMs` now and then (`bots.hesitateChance` ÷ form), and its own edge margin is
  drawn from [`bots.edgeSlack`, 1] × `bots.edgeMargin` (some go too close to the edge);
- its form drifts by up to ± `bots.formStep` every `bots.formEveryMs` within `bots.form`
  (0.85–1.15): sharper and steadier on a good run, sloppier in a weak spell;
- all of it from the bot's own seeded source, `botSeed(match seed, seat)`: runs repeat.

Tests: `src/bots/bot.test.ts` (the brain), `src/bots/human.test.ts` (delay respected, aim
noise within the band, form within its band, same seed same match), `src/bots/packs.test.ts`
(no group of more than 4 together longer than 15 s, nearly still less than 5 % of the time).

## `pnpm simulate --seed <n>`

One full match, 32 bots, in 50 ms ticks as fast as the machine runs: the season timeline
with the arena's radius at each halving, falls with and without credit, knockouts per team
and per player, and the sanity list — positions and speeds finite, one halving per season
turn, the arena halving its area each time, every knockout one credited fall and never by a
teammate. It exits 1 if a check fails. Seed 1 on 2026-11-17: 519 falls in 5:00 (453
credited), 95–123 knockouts per team.

## Configuration (`src/config.ts`) — every value a placeholder the owner decides

| Key                                                          | Value                    | Meaning                                             |
| ------------------------------------------------------------ | ------------------------ | --------------------------------------------------- |
| `matchDurationMs` / `seasonDurationMs`                       | 300 000 / 75 000         | 5:00, four seasons                                  |
| `arenaRadius`                                                | 900                      | the start; × 1/√2 at each halving                   |
| `arenaShrinkMs`                                              | 2000                     | the edge eases in                                   |
| `ghostRadius`                                                | 16                       |                                                     |
| `acceleration` / `friction` / `maxSpeed`                     | 1200 / 2.5 / 320         | running                                             |
| `dashSpeed` / `dashMs` / `dashCooldownMs`                    | 900 / 250 / 1500         | the dash                                            |
| `knockSpeed` / `restitution`                                 | 700 / 0.6                | a dash's knock, the bounce                          |
| `inSeasonPush`                                               | 1.25                     | the team in season pushes harder                    |
| `fallMs` / `outMs` / `protectMs`                             | 600 / 3000 / 1000        | fall, out, protected                                |
| `creditMs`                                                   | 3000                     | a fall counts for the last opponent touch within it |
| `startSpread`                                                | 0.6                      | the start ring                                      |
| `deadlineCountdownMs` / `reconnectGraceMs` / `resultPauseMs` | 10 000 / 12 000 / 15 000 |                                                     |
| `bots.*`                                                     | see "Bots"               |                                                     |
