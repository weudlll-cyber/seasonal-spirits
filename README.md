# Seasonal Spirits

Seasonal Spirits is a real-time team game for the Seasonal Entertainment community. Four
teams, named after the four Seasonal Tokens (Spring, Summer, Autumn, Winter), move their
ghosts on one map and compete for coins in a five-minute match.

Concept: [CONCEPT.md](CONCEPT.md). Phase 0 (the network probe) is the current work.

## Status

Phase 0: network probe. The game's core mechanics live in `packages/game-core` as a pure,
headless simulation. Phase 1 wires them into the server. Nothing is merged to `master` yet
from the probe branch.

## Repository layout

- `apps/server` — authoritative tick server + WebSocket. Phase 0: empty-map ghost movement.
- `apps/viewer` — browser spectator (Vite + Canvas, plain TypeScript, no framework).
- `packages/protocol` — binary state encoding, delay queue, interpolation, jump detection.
- `packages/game-core` — pure game logic, deterministic, driven by `tick(dt)`.
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
pnpm simulate     # game-core 5-minute match with 32 bots, headless
pnpm verify       # format:check + lint + typecheck + test
```

The Linux run sheet for the probe is in [docs/PHASE0.md](docs/PHASE0.md).

## Documents

- [CONCEPT.md](CONCEPT.md) — the concept, decided 2026-11-14.
- [CLAUDE.md](CLAUDE.md) — working rules for Claude Code sessions in this repository.
- [docs/PHASE0.md](docs/PHASE0.md) — what Phase 0 measures and why.
- [docs/NIGHT-RUN.md](docs/NIGHT-RUN.md) — the launch recipe for an unattended night run.
- [docs/GAME-CORE.md](docs/GAME-CORE.md) — the mechanics as built in `packages/game-core`.
- [docs/BACKLOG.md](docs/BACKLOG.md) — OPEN / CLOSED backlog.

## Licence

AGPL-3.0-or-later. See [LICENSE](LICENSE).
