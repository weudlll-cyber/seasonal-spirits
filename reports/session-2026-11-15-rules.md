# Session 2026-11-15-RULES — three candidate rule changes for fairness

**Client: http://localhost:5930** — `pnpm dev` running from `master` (the trials do not change
the default game); viewer http://localhost:5931, stop with `pnpm dev:stop`.

Started after MERGE 2026-11-15-CD, from `master` (`d4ae550`) on `feat/rule-trials`. Nothing
merged, no config default changed. In progress.

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
