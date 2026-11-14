# Seasonal Spirits

Seasonal Spirits is a real-time team game for the Seasonal Entertainment community. Four
teams, named after the four Seasonal Tokens (Spring, Summer, Autumn, Winter), move their
ghosts on one map and compete for coins in a five-minute match.

Concept: [CONCEPT.md](CONCEPT.md). Phase 0 (the network probe) is the current work.

## Status

Phase 0: network probe. The game's core mechanics come next, in `packages/game-core` as a
pure, headless simulation (not built yet); Phase 1 wires them into the server. Nothing is
merged to `master` yet from the probe branch.

## Repository layout

- `apps/server` — authoritative tick server + WebSocket. Phase 0: empty-map ghost movement.
- `apps/viewer` — browser spectator (Vite + Canvas, plain TypeScript, no framework).
- `packages/protocol` — binary state encoding, delay queue, interpolation, jump detection.
- `tools/probe` — bot clients + headless spectator + measurement run.

## Ports

- Game server: `3930` (override: `PORT`)
- Viewer dev server: `5930` (override: `VIEWER_PORT`)

Chosen 2026-11-14 as the first free `*930` pair at that time; see
[docs/NIGHT-RUN.md](docs/NIGHT-RUN.md).

## Running

Prerequisites: Node >= 22, pnpm. `corepack enable` installs pnpm from `package.json`.

```
pnpm install
pnpm probe        # full probe run: server + 32 bots + headless spectator, writes a report
pnpm server       # just the server (for the viewer)
pnpm viewer       # browser viewer on http://localhost:5930
pnpm verify       # format:check + lint + typecheck + test (the full suite, as in CI)
pnpm verify:changed  # the same checks, only for what changed since origin/master
```

## Checks

Locally, `pnpm verify:changed` checks only what a change can have affected; the full suite
runs in GitHub Actions on every push. Which check runs when, and how a check that already
ran is recorded instead of repeated, is in [CLAUDE.md](CLAUDE.md) ("Checks") and in the
CHECKS DONE part of [docs/BACKLOG.md](docs/BACKLOG.md).

The server run sheet for the probe (Docker, leaves nothing installed) is in
[docs/PHASE0.md](docs/PHASE0.md).

## Documents

- [CONCEPT.md](CONCEPT.md) — the concept, decided 2026-11-14.
- [CLAUDE.md](CLAUDE.md) — working rules for Claude Code sessions in this repository.
- [docs/PHASE0.md](docs/PHASE0.md) — what Phase 0 measures and why.
- [docs/NIGHT-RUN.md](docs/NIGHT-RUN.md) — the launch recipe for an unattended night run.
- [docs/GAME-CORE.md](docs/GAME-CORE.md) — the mechanics planned for `packages/game-core`.
- [docs/SECURITY.md](docs/SECURITY.md) — the automated security checks and the settings
  only the owner can switch on.
- [docs/BACKLOG.md](docs/BACKLOG.md) — OPEN / CLOSED / CHECKS DONE.

## Licence

AGPL-3.0-or-later. See [LICENSE](LICENSE).
