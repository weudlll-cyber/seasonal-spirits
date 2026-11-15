# Session 2026-11-15-RULES — three candidate rule changes for fairness

**Client: http://localhost:5930** — `pnpm dev` running from `master` (the trials do not change
the default game); viewer http://localhost:5931, stop with `pnpm dev:stop`.

Started after MERGE 2026-11-15-CD, from `master` (`d4ae550`) on `feat/rule-trials`. Nothing
merged, no config default changed.

## Step 1 — the three switches

All in `packages/game-core`, each in one place, defaults = today's game:

- **R1 `swapMode`** (`'fixed'` default | `'ratio'`): `swapMinimum` and the swap yield in
  `actions.ts`; from `swapMinIn` (6, placeholder) coins at the same rate, rounded down
  (6 → 9, 7 → 10, 8 → 12, 10 → 15); in `'ratio'` never in the last season. The shrine offer,
  `trySwap` and the patient bot read the same functions. **Noticed:** the task says "not in
  the last season, as today" — but today (`'fixed'`) the core does allow a swap in the last
  season (only the patient bot avoids it). The default stays today's game, so `'fixed'`
  keeps that; `'ratio'` refuses it as asked.
- **R2 `swappedStealProof`** (`false` | `true`): the coins a swap gives go into
  `Ghost.shielded` until the next halving (`applyHalving` clears it, as does a completed
  secure); a steal takes `ceil((carried − shielded) · stealShare)` per season.
- **R3 `escortRadius`** (0 = off | 50 | 90): a carrier with a teammate within the radius
  cannot be robbed.
- R2 and R3 act through the new `isStealTarget` inside `nearestOpponentCarrier` — the one
  function `canSteal` (the lit Steal button), `trySteal` and the hunter bot already share.
  Bots follow the rules but get no new behaviour: **R3 is measured without bots seeking
  escorts** — escorts happen only where teammates happen to walk together.
- `runBalance` now counts swaps per match (through `simulate`'s per-tick observer);
  `pnpm balance` prints them; `pnpm fairness --rules-grid` runs the 24 trial configurations.

Defaults check: `pnpm balance --matches 30 --seed 1` with the defaults gives exactly the last
default N = 30 row of docs/BALANCE.md — patient 10.0 %, cautious 41.7 %, hunter 48.3 %;
means 13.7 / 16.9 / 17.2; teams 30.0 / 16.7 / 30.0 / 23.3 %; 20.8 field coins gone.

Tests (`packages/game-core/src/rules.test.ts`): R1 "swaps from 6 coins at the same rate,
rounded down: 6 → 9, 7 → 10, 8 → 12, 10 → 15", "offers exactly what the swap gives, its
value now and later", "does not swap in the last season", "keeps today's rule by default";
R2 "keeps swapped coins from a steal and makes a carrier of only those no target", "protects
only until the next halving", "protects nothing by default"; R3 "blocks a steal from a
carrier with a teammate within the radius, and unblocks it", "blocks nothing by default".
Every steal test checks that the Steal flag (`canSteal`) agrees with what `trySteal` takes.
`fairness.test.ts` "tries every one of the 24 rule-trial configurations once, today's rules
among them".

## Step 2 — stage 1 (24 configurations × 30 matches, seeds 1–30)

CPU load 29 % before the start (the running `pnpm dev`); 3 min 1 s with 8 processes on 14
cores. The default rows reproduce the known numbers (2 coins/s: 10.0 / 41.7 / 48.3 %).
**1 of 24 within 25–42 %**: R1 + R2, no escort, 2 coins/s — patient 26.7 %, cautious 31.7 %,
hunter 41.7 %, 10.1 swaps per match. Every row with medians, p10, p90, team wins and swaps in
docs/BALANCE.md "Round 4"; raw `reports/rule-trials/stage1.json`.

## Step 3 — stage 2 (the qualifying configuration × 300 matches, seeds 1–300)

2 min 24 s. R1 + R2, no escort, 2 coins/s: patient 24.3 %, cautious 25.3 %, **hunter
50.3 %**; secured median / p10 / p90 patient 13.0 / 8.0 / 21.0, cautious 16.5 / 10.0 / 24.0,
hunter 16.0 / 8.0 / 28.0; teams 21.7–28.0 %; 8.6 swaps per match. **No configuration meets
25–42 % at N = 300.**

## Step 4 — results

Each rule alone against the default row of the same coin rate (N = 30), best player
patient / cautious / hunter in points:

- **R1 ratio**: 1.5 coins/s +8.3 / −10.0 / +1.6; 2 coins/s 0 / −31.7 / +31.7. Swaps 0.3 → 4.1
  and 1.3 → 9.5 per match — R1 is what makes swapping happen; alone it feeds the hunters.
- **R2 proof**: +6.6 / 0 / −6.7 and 0 / +25.0 / −25.0, but with about one swap per match it
  shields almost nothing — the shift is most likely N = 30 noise.
- **R3 escort 50**: −6.7 / −18.4 / +25.0 and −10.0 / −36.7 / +46.7; escort 90: hunters
  96.7 % at both rates. Measured without escort-seeking bots. Scratch count (5 seeds):
  robberies of hunters 6801 → 5064, of patient bots 236 → 329; a hunter is within 50 of its
  team's other hunter about 16 % of the time with and without the rule.
- **R1 + R2**: +10.0 / −8.4 / −1.7 and +16.7 / −10.0 / −6.6 — the only change that lifts the
  patient bot; at N = 300 it stays (24.3 %).

**Recommendation**: R1 and R2 together — the only rule change that gives all three a real
share and makes swapping part of the game (8.6 swaps per match at N = 300); leave out R3 as
built (it hands the game to the hunters). The remaining gap is the hunters' 50.3 %; the lever
measured for it is `stealShare` (0.25 instead of 0.5: hunters 33.5 → 12.0 % in Round 1 and
66.0 → 30.0 % in Round 2, N = 300). Next measurement: R1 + R2 with stealShare 0.25 and 0.35
at 2 coins/s, stage 1 and 2.

## Files (lines before → after, against master `d4ae550`)

Game core: `actions.ts` 125 → 155, `bots/strategies.ts` 97 → 104, `config.ts` 99 → 114,
`types.ts` 76 → 79, `halving.ts` 20 → 22, `match.ts` 121 → 122, `balance.ts` 82 → 89,
`balance-cli.ts` 78 → 78, `fairness.ts` 63 → 86, `fairness-cli.ts` 141 → 149, `index.ts` 19 →
26, new `rules.test.ts` 132, `fairness.test.ts` 29 → 39. Docs: GAME-CORE 159 → 179, BALANCE
663 → 782 (before this commit's BACKLOG rows: BACKLOG 366 → 381). Data:
`reports/rule-trials/stage1.json`, `stage2.json`.

- **Reused:** `nearestOpponentCarrier` (now asks the new `isStealTarget`) — the one place
  `canSteal`, `trySteal` and the hunter bot already shared; the swap yield for `shrineOffer`,
  `trySwap` and (through `swapMinimum`) the patient bot; `applyHalving` for the end of the
  protection; `simulate`'s per-tick observer for counting swaps; `spread` for the swaps;
  `pnpm fairness` with its worker slices and summary; the round-3 distance rule;
  `test-helpers` (`quietConfig`, `matchOf`, `placeAtShrine`, `act`, `runTo`).
- **Removed:** the swap yield's fixed `spent < swapIn` check (now `swapMinimum`); the
  balance CLI's one-off output line for the cleared coins (now a shared `perMatch` line for
  cleared coins and swaps).
- **Noticed, left:** with `'fixed'` (today) a swap in the last season is allowed by the core —
  the task assumed it was not; the default was kept. R3 was measured without bots that seek
  escorts. N = 30 rows move by several points from noise alone (R2 alone).

## NEEDS OWNER

- Which rule, if any, goes into the game — the numbers point to R1 + R2 together, not R3.
- Trial values as placeholders: `swapMinIn` 6 (R1), `escortRadius` 50 / 90 (R3).
- Whether to measure R1 + R2 with a lower `stealShare` next.

## Round 5 — R1 + R2 with a smaller steal share (session 2026-11-15-RULES-2)

A measurement with the existing switches, no code change. R1 + R2 on (`swapMode` 'ratio',
`swappedStealProof` true), `escortRadius` 0, other values default; grid `stealShare` {0.2,
0.25, 0.3, 0.35} × `coinSpawnPerSecond` {2, 2.5}.

- **Stage 1** (8 × 30 matches, seeds 1–30): 50.6 s, CPU load before the start reported as
  0 %. 1 of 8 within 25–42 %: 0.35 / 2 coins/s (30.0 / 33.3 / 36.7 %).
- **Stage 2** (4 × 300 matches, seeds 1–300: the hit and the 3 closest; third place was a
  tie, so both ran): 7 min 16 s, CPU load 74 % before the start (other work on the PC).

| stealShare | coins/s | patient | cautious | hunter | distance | swaps/match |
| --- | --- | --- | --- | --- | --- | --- |
| 0.35 | 2 | **35.0 %** | **32.8 %** | **32.2 %** | 3.3 | 9.1 |
| 0.35 | 2.5 | 25.2 % | 31.3 % | 43.5 % | 20.3 | 14.2 |
| 0.3 | 2 | 37.2 % | 41.6 % | 21.3 % | 24.1 | 9.3 |
| 0.25 | 2 | 39.7 % | 48.3 % | 12.0 % | 42.7 | 10.2 |

**One configuration meets 25–42 % for all three at N = 300**: R1 + R2, stealShare 0.35, 2
coins per second. Secured value per player and match (median / p10 / p90): patient 13.5 / 8.5
/ 22.5, cautious 16.5 / 10.0 / 24.5, hunter 15.5 / 7.5 / 26.0; teams 22.2–27.7 %; 9.1 swaps
per match. Full tables in docs/BALANCE.md "Round 5"; raw data
`reports/rule-trials/round5-*.json`.

Files: docs/BALANCE.md 782 → 850, BACKLOG 381 → 401; new data `round5-configs.json`,
`round5-stage1.json`, `round5-stage2-configs.json`, `round5-stage2.json`; no source file.
Noticed, left: the steal share is a narrow lever (0.3 leaves the hunters at 21.3 %, 0.5 at
50.3 %); 2.5 coins/s with 0.35 gives the hunters 43.5 %; the N = 30 row of the winner moved by
up to 5 points against N = 300.

NEEDS OWNER: which configuration goes into the game — the measured candidate is R1 + R2 with
`stealShare` 0.35 at `coinSpawnPerSecond` 2 (and with it the R1 trial value `swapMinIn` 6).
