# Backlog

Two parts: `OPEN` (rewritten completely as reality changes) and `CLOSED` (appended to with
the commit that finished the item).

## OPEN

- Phase 0 decision: continue / change technology / change the concept. Owner input needed
  once the probe report sits in `reports/phase0/`.
- Config placeholders in `packages/game-core/src/config.ts` — see the morning sheet for
  the list; each is marked `// placeholder — owner decides`.
- Client-framework decision (Phaser or other) after Phase 0.
- Website session: slug `seasonal-spirits` in the embedded-games list, installer question,
  feed denial, and the "embedded only" exception note. Noted in CONCEPT.md §12.
- Phase 1: wire `packages/game-core` into `apps/server`.
- Phase 1: real logo assets for the four coin kinds; the owner provides them.
- A Linux VPS run of the probe at the owner's hosting to confirm the numbers.

## CLOSED

- 2026-11-14 — repository skeleton, toolchain, CI, docs (`phase0/network-probe`).
- 2026-11-14 — Phase 0 network probe: server, viewer, probe tool, protocol, bots,
  interpolation, jump detection, tests.
- 2026-11-14 — `packages/game-core`: deterministic mechanics, three bot strategies,
  `pnpm simulate`.
- 2026-11-14 — toolchain aligned with seasonal-mini-games: pnpm 12.14.0, exact
  devDependency pins, ESLint 10 strict typed linting, strict tsconfig base, Prettier
  config file, CI with pinned actions and a frozen lockfile (`phase0/network-probe`).
