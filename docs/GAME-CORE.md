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
| `src/separation.ts` | Soft separation: ghosts closer than `separationRadius` drift apart                                     |
| `src/geometry.ts`   | Distances, clamping, shrine positions                                                                  |
| `src/rng.ts`        | `mulberry32`, shared with the probe bots                                                               |
| `src/bots/`         | The three strategies (`strategies.ts`) and what they share (`common.ts`)                               |
| `src/simulation.ts` | One full bot match with the sanity list; `src/simulate.ts` is the command                              |
| `src/balance.ts`    | Many matches summed up per strategy and team; `src/balance-cli.ts` is `pnpm balance` (docs/BALANCE.md) |

## One tick

In this order: time and season (a season turn is a halving), each ghost's intent by id (a
securing ghost only completes its secure), soft separation, picking up field coins,
spawning, the countdown, the end.

## The rules as built

- **Match and seasons.** 5:00, four seasons of 75 s in the real order from `startSeason`.
  The state carries the season clock: current, next, index, time left in the season.
- **Coins.** Only coins of the current season spawn, at `coinSpawnPerSecond` all match long,
  up to `maxFieldCoins`. A ghost picks a coin up when their drawn shapes touch: centre
  distance at most the ghost's radius plus `coinRadius` (`touchesCoin` in `src/geometry.ts`).
  A ghost's radius is `ghostRadius` plus `ghostGrowthPerCoin` per carried coin, at most
  `ghostGrowthMax` more (`ghostRadius()`); the client draws with the same function. Before
  2026-11-15 a fixed `pickupRadius` of 30 against differently drawn sizes made pickups look
  early for empty ghosts and late for big carriers.
- **Teams and shrines.** Four teams; team 0 to 3 have their shrines inset from the four
  corners. Ghosts start around their own shrine.
- **Soft separation** (owner decision 2026-11-15). After the moves, every two ghosts closer
  than `separationRadius` are pushed apart by `separationStrength` of the overlap, half each,
  summed before they are applied (the order of the ghosts does not matter); ghosts on the
  same point part along an angle from their ids. Never out of the field, no hard blocking,
  no physics. A securing ghost is never moved (it stands still); its neighbour takes the
  whole push. `separationRadius` stays below `stealRange`, so a thief beside a carrier can
  still steal.
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
  of each season's count to the thief; then the thief waits `stealCooldownMs`. `canSteal`
  says whether a steal would take something now (the match runs, the thief is not securing,
  its cooldown is over, an opponent carrier is in range) — `trySteal` checks exactly that, and
  the server sends it to the clients as the lit Steal button.
- **Rule trials** (owner decision 2026-11-15; measured in BALANCE.md "Round 4"). Three
  switches, each acting in one place, whose defaults are today's game:
  - **R1** `swapMode` `'ratio'` (default `'fixed'`): a swap takes all coins of the current
    season from `swapMinIn` (6) on, at the same rate rounded down (6 → 9, 8 → 12, 10 → 15),
    never in the last season. `swapMinimum` and the swap yield in `src/actions.ts`; the
    shrine offer, `trySwap` and the patient bot read them. With `'fixed'` a swap in the last
    season stays possible, as it always was (only the patient bot avoids it).
  - **R2** `swappedStealProof` `true` (default `false`): the coins a swap gives are shielded
    (`Ghost.shielded`) until the next halving (`applyHalving` clears it, as does a completed
    secure); a steal takes only from the other coins.
  - **R3** `escortRadius` > 0 (default 0, off; trials 50 and 90): a carrier with a teammate
    within that radius cannot be robbed.
  - R2 and R3 act through `isStealTarget` inside `nearestOpponentCarrier` — the one place
    `canSteal` (the lit Steal button), `trySteal` and the hunter bot ask. Bots follow the
    rules (the patient bot swaps from `swapMinimum`, hunters skip protected or escorted
    carriers) but have no new behaviour: nobody seeks an escort.
  - **Random steal share** (`stealShareMax`, absent by default; BALANCE.md "Round 6"): when
    set above `stealShare`, each steal draws its share once, uniformly from [`stealShare`,
    `stealShareMax`], from the match's seeded random source (`stealShareFor`; the same
    `mulberry32` that places the ghosts and spawns the coins, so runs stay reproducible;
    without the switch nothing is drawn and today's matches are identical). The share is
    applied to every season as before (rounded up, shielded coins excluded); a steal that
    would round to nothing takes one coin from the victim's richest season. Whether a steal
    is possible (`canSteal`, `isStealTarget`) does not depend on the share.
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
  its coins of the current season (at least `swapIn`) — or, with fewer, banks them, unless
  the next season's coins it carries are more; before the match end, banks everything. With
  at least `swapIn` coins and an opponent within `bots.threatRange` it goes home at once to
  swap or bank. Both added on 2026-11-15: it used to carry a full load past hunters without
  reacting (robbed 356 times in five seeded matches) and let the halving halve its coins
  (734 old-season coins carried into halvings); after the fix 236 and 102, and its secured
  value rose from 183 to 852.5 (session sheet 2026-11-15-CD).
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

"Collects" (`collect` in `src/bots/common.ts`): head for the nearest field coin that no other
ghost is closer to; without such a coin, walk to the own waypoint — a point inside the square
the shrines span, spread over the field by the ghost's id and moved on every
`bots.waypointMs`, the next one as soon as it is reached. Before 2026-11-15 every collector
took its nearest coin: neighbours shared one target, travelled as one pack of up to ten mixed
ghosts for half a minute and more, and switched together to the next coin
(`src/bots/packs.test.ts`).

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
| `ghostRadius`           | 14      | placeholder (an empty ghost, as drawn)                                  |
| `ghostGrowthPerCoin`    | 0.5     | placeholder (a carrier is larger, CONCEPT.md §2a)                       |
| `ghostGrowthMax`        | 16      | placeholder                                                             |
| `coinRadius`            | 10      | placeholder (a field coin, as drawn)                                    |
| `coinSpawnPerSecond`    | 2       | placeholder (CONCEPT.md leaves the rate open)                           |
| `maxFieldCoins`         | 60      | placeholder                                                             |
| `offSeasonValueFactor`  | 0.5     | CONCEPT.md §2a, §10 decision 2                                          |
| `swapIn` / `swapOut`    | 10 / 15 | CONCEPT.md §2a, §10 decision 2                                          |
| `swapMode`              | fixed   | rule trial R1 (default = today); `'ratio'` swaps from `swapMinIn`       |
| `swapMinIn`             | 6       | placeholder (rule trial R1 value; used only with `'ratio'`)             |
| `swappedStealProof`     | false   | rule trial R2 (default = today)                                         |
| `escortRadius`          | 0       | rule trial R3 (default 0 = off = today; trial values 50, 90)            |
| `stealShareMax`         | absent  | rule trial: random steal share up to this (absent = fixed = today)      |
| `secureDurationMs`      | 2500    | CONCEPT.md §2a: 2–3 s                                                   |
| `shrineRadius`          | 80      | placeholder                                                             |
| `shrineInset`           | 150     | placeholder                                                             |
| `startSpread`           | 60      | placeholder                                                             |
| `stealRange`            | 60      | placeholder (CONCEPT.md leaves the range open)                          |
| `stealShare`            | 0.5     | placeholder (CONCEPT.md leaves the share open)                          |
| `stealCooldownMs`       | 1000    | placeholder                                                             |
| `separationRadius`      | 28      | placeholder (two ghost bodies touching; below `stealRange`)             |
| `separationStrength`    | 0.5     | placeholder (share of the overlap removed per tick)                     |
| `halvingCountdownMs`    | 10 000  | CONCEPT.md §2b, §13: before every halving                               |
| `reconnectGraceMs`      | 12 000  | CONCEPT.md §8: a disconnected player stands 10–15 s, then a bot         |
| `resultPauseMs`         | 15 000  | placeholder (result screen before the next match)                       |
| `bots.cautiousSecureAt` | 5       | placeholder                                                             |
| `bots.hunterSecureAt`   | 8       | placeholder                                                             |
| `bots.arriveRadius`     | 20      | placeholder                                                             |
| `bots.deadlineMarginMs` | 3000    | placeholder (spare time when walking home before a halving)             |
| `bots.waypointMs`       | 4000    | placeholder (how often a collector's waypoint moves on)                 |
| `bots.threatRange`      | 150     | placeholder (a loaded patient bot goes home when an opponent is closer) |
