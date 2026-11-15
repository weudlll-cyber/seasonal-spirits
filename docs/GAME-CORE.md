# The game core (`packages/game-core`)

Pure TypeScript: no network, no graphics, no clock and no randomness of its own. A match is
driven by `tick(dtMs, intents)`; its time is the sum of the `dt` values and every random
value comes from the seed (`mulberry32`), so the same seed and the same intents give the same
match. It builds CONCEPT.md §2a, §2b with §13 and the controls part of §8 — nothing from §7
"Dropped", no season specials, no spectator prediction, no team chat.

## Files

| File                | What it holds                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/config.ts`     | Every number of the game (table below)                                                                 |
| `src/seasons.ts`    | Season order, the season clock, coin values                                                            |
| `src/types.ts`      | Match state, intents, events, result                                                                   |
| `src/match.ts`      | `Match`: one tick in a fixed order                                                                     |
| `src/field.ts`      | Coin spawning and picking up                                                                           |
| `src/actions.ts`    | Swap, secure, steal — each checks its own conditions; the shrine offer                                 |
| `src/halving.ts`    | The halving at a season turn                                                                           |
| `src/geometry.ts`   | Distances, clamping, shrine positions                                                                  |
| `src/rng.ts`        | `mulberry32`, shared with the probe bots                                                               |
| `src/bots/`         | The three strategies (`strategies.ts`) and what they share (`common.ts`)                               |
| `src/simulation.ts` | One full bot match with the sanity list; `src/simulate.ts` is the command                              |
| `src/balance.ts`    | Many matches summed up per strategy and team; `src/balance-cli.ts` is `pnpm balance` (docs/BALANCE.md) |

## One tick

In this order: time and season (a season turn is a halving), each ghost's intent by id (a
securing ghost only completes its secure), picking up field coins, spawning, the countdown,
the end.

## The rules as built

- **Match and seasons.** 5:00, four seasons of 75 s in the real order from `startSeason`.
  The state carries the season clock: current, next, index, time left in the season.
- **Coins.** Only coins of the current season spawn, at `coinSpawnPerSecond` all match long,
  up to `maxFieldCoins`. A ghost within `pickupRadius` picks a coin up.
- **Teams and shrines.** Four teams; team 0 to 3 have their shrines inset from the four
  corners. Ghosts start around their own shrine.
- **Carrying.** A ghost with any coin moves at `carrySpeedFactor` of its speed. Carried coins
  are public state (CONCEPT.md §2a: a carrier is visible).
- **Value.** A coin is worth 1 in its own season and `offSeasonValueFactor` (½) outside it.
- **Swap** (own shrine). All carried coins of the current season, at least `swapIn`, become
  `floor(n · swapOut / swapIn)` of the next season: 10 → 15 → 22 → 33.
- **Secure** (own shrine, something carried). Takes `secureDurationMs`; the ghost stands
  still and can be robbed, which cancels the secure. It banks at the values of the season in
  which it was started (the value the player read on the button).
- **Shrine offer** (`shrineOffer`): what the two buttons show, computed here and sent to a
  player in its own shrine (CONCEPT.md §3: the player reads, never calculates): the secure
  value now, and the swap's coin count with its value now (half, it is the next season's) and
  later (full). A swap gives exactly the offered count.
- **Steal** (one action, no aiming). The target is the nearest opponent carrier within
  `stealRange` — never a teammate, never the thief. The victim loses `ceil(n · stealShare)`
  of each season's count to the thief; then the thief waits `stealCooldownMs`.
- **Halving** at every season turn inside the match (CONCEPT.md §2b, §13): 1:15, 2:30 and
  3:45 of a 5-minute match; the match end is not one. The old season's field coins disappear
  (counted in `stats.cleared`), the new season's coins fall at the same rate. Carried coins
  keep their count; the old season's are now worth half, so every halving is a deadline to
  swap or secure. The state carries `halvingCountdownMs` during the last
  `halvingCountdownMs` (10 s) before each halving and a `halving` event with the new season
  in exactly one tick each time.
- **End.** Only secured value counts; coins still carried and unfinished secures are lost.
  `result()` gives the secured value per player and per team.

## Bots

Three small state machines over the public state (`src/bots/strategies.ts`); each picks a
mode, then acts on it:

- **patient**: collects and holds; when the next halving comes near, walks home and swaps
  its coins of the current season (at least `swapIn`); before the match end, banks
  everything.
- **cautious**: collects; at `bots.cautiousSecureAt` coins, and with anything at all when
  the next halving or the end comes near, walks home and banks.
- **hunter**: chases the nearest opponent carrier that carries more than the hunter itself,
  walks right onto it, and steals when the carrier a steal would hit (the nearest in range)
  is richer too; at `bots.hunterSecureAt` coins, or in the last season with anything, walks
  home and banks. Before 2026-11-15 a hunter chased every carrier: in a pack the hunters
  robbed each other, a rounded-up steal always moved a single coin, the loot circulated, and
  the pack stood still for minutes (`src/bots/hunter.test.ts`).

"Near" (`deadlineNear` in `src/bots/common.ts`): the time left in the season is just enough
to walk home at carrying speed, secure, and keep `bots.deadlineMarginMs` spare.

## `pnpm simulate --seed <n>`

One full match, 32 bots (8 per team: 3 patient, 3 cautious, 2 hunters), in 50 ms ticks as
fast as the machine runs. It prints the season timeline with the three halvings (field coins
gone, carried coins kept), the secured value per team and per player, and the sanity list: no
negative counts (checked after every tick), one halving per season turn, carried coins
conserved across each halving (end of the tick before = at the halving), field coins
accounted (spawned = picked up + gone at halvings + left). It exits 1 if a sanity check
fails.

## Configuration (`src/config.ts`)

| Key                     | Value   | Source                                                                  |
| ----------------------- | ------- | ----------------------------------------------------------------------- |
| `matchDurationMs`       | 300 000 | CONCEPT.md §4: 5 minutes                                                |
| `seasonDurationMs`      | 75 000  | CONCEPT.md §2: four seasons of 75 s                                     |
| `startSeason`           | spring  | placeholder (the website's season clock will provide it, CONCEPT.md §2) |
| `fieldSize`             | 2000    | placeholder (Phase 0 world)                                             |
| `ghostSpeed`            | 300     | placeholder (units/s, Phase 0 speed)                                    |
| `carrySpeedFactor`      | 0.7     | placeholder (CONCEPT.md §8: carrying slows; the factor is open)         |
| `pickupRadius`          | 30      | placeholder                                                             |
| `coinSpawnPerSecond`    | 2       | placeholder (CONCEPT.md leaves the rate open)                           |
| `maxFieldCoins`         | 60      | placeholder                                                             |
| `offSeasonValueFactor`  | 0.5     | CONCEPT.md §2a, §10 decision 2                                          |
| `swapIn` / `swapOut`    | 10 / 15 | CONCEPT.md §2a, §10 decision 2                                          |
| `secureDurationMs`      | 2500    | CONCEPT.md §2a: 2–3 s                                                   |
| `shrineRadius`          | 80      | placeholder                                                             |
| `shrineInset`           | 150     | placeholder                                                             |
| `startSpread`           | 60      | placeholder                                                             |
| `stealRange`            | 60      | placeholder (CONCEPT.md leaves the range open)                          |
| `stealShare`            | 0.5     | placeholder (CONCEPT.md leaves the share open)                          |
| `stealCooldownMs`       | 1000    | placeholder                                                             |
| `halvingCountdownMs`    | 10 000  | CONCEPT.md §2b, §13: before every halving                               |
| `reconnectGraceMs`      | 12 000  | CONCEPT.md §8: a disconnected player stands 10–15 s, then a bot         |
| `resultPauseMs`         | 15 000  | placeholder (result screen before the next match)                       |
| `bots.cautiousSecureAt` | 5       | placeholder                                                             |
| `bots.hunterSecureAt`   | 8       | placeholder                                                             |
| `bots.arriveRadius`     | 20      | placeholder                                                             |
| `bots.deadlineMarginMs` | 3000    | placeholder (spare time when walking home before a halving)             |
