# The game core (`packages/game-core`)

Pure, headless, deterministic simulation of one match. Driven by `tick(dt)` and seeded by
a fixed number. No network, no graphics; the server will wire this in during Phase 1.

See [CONCEPT.md](../CONCEPT.md) §2a, §2b, §4, §8 (controls part) and §9 Phase 1 for the
rules this package implements. Nothing from "Dropped" (§7) is here: no "loot grows", no
"centre shrine", no "whole loot", no "frost", no spectator prediction, no team chat, no
season specials.

## What one match contains

- A 5-minute match (`matchDurationMs`, configurable), four seasons of 75 s in the real
  order Spring → Summer → Autumn → Winter, starting with a configured season.
- Coins of the current season appear on the field at the spawn rate. After the halving
  (3:45 of 5:00, at the Autumn → Winter turn) the spawn rate is halved.
- Four teams, each with its own shrine. A ghost carrying a coin is slower and visible in
  the state.
- At the own shrine a ghost can:
  - **Secure**: start a 2–3 s secure action (configurable), interruptible by a steal;
    when it completes, the carrier's coins are banked at their current value.
  - **Swap**: 10 of the current season's coins become 15 of the next season (both counts
    configurable).
- Anywhere on the field a ghost can **steal**: the nearest opponent carrier in range (no
  aiming) loses a configurable share of its carried coins to the thief.
- The **halving** is the big event. At the Autumn → Winter turn:
  - all carried unsecured coins are halved;
  - the halves drop into a pool at the map centre, for any ghost to pick up;
  - a `HALVING` event lives in the state for exactly one tick so a client can stage the
    effect;
  - a countdown from 10 s before the halving is carried in the state.

## Values and halves

A coin's value depends on whether it is in its own season:

- in season: full value;
- outside: half (both factors configurable).

The three example players from CONCEPT.md §2a come out of these rules without special
cases. The tests reproduce them.

## Bots

Three strategies in `packages/game-core/src/bots/`:

- **patient**: holds the season's coin, swaps at the home shrine, never robs;
- **cautious**: secures early, often, little at a time;
- **hunter**: avoids carrying, tries to steal from carriers.

Each is a tiny state machine that reads the public state and produces one intent per
`tick`: move, secure, swap, steal. The intent is applied by the core.

## Configuration

One file: `packages/game-core/src/config.ts`. Every number lives there. Numbers taken from
CONCEPT.md carry a comment naming the section. Numbers **not** yet in CONCEPT.md carry
`// placeholder — owner decides`; the morning sheet lists them for the owner. Nothing in
this package reads a magic number directly.

## Running

```
pnpm simulate
```

Runs one 5-minute match in accelerated time, seeded, with 32 bots (8 per team, strategies
mixed). Prints a season timeline, the halving moment and pool size, the final values per
team and player, and a sanity list (no negative coins, pool fully accounted, value
conservation at the halving).
