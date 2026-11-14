# Seasonal Spirits

Seasonal Spirits is a real-time team game for the Seasonal Entertainment community. Four
teams, named after the four Seasonal Tokens (Spring, Summer, Autumn, Winter), move their
ghosts on one map and compete for coins in a five-minute match.

Concept: [CONCEPT.md](CONCEPT.md). Phase 1 (the game with its core) is the current work.

## Status

Phase 0 (network probe) is accepted on the development PC and merged. The game's core
mechanics live in `packages/game-core` as a pure, headless simulation, and the server plays
them: match after match with 32 slots, bots in every slot without a player. The first
playable version is the player client (`apps/client`, development mode without sign-in);
the viewer stays the debug view.

## Repository layout

- `apps/server` — the match server: game core on the 20 Hz loop, WebSocket, server bots.
- `apps/client` — the player client (Vite + Canvas 2D, plain TypeScript): keyboard and
  touch controls, the shrine buttons, the halving staging, the result screen.
- `apps/viewer` — browser spectator and debug view with network numbers.
- `packages/render` — the Canvas drawing both browser apps share.
- `packages/protocol` — binary state encoding, the client message validator, delay queue,
  interpolation, jump detection.
- `packages/game-core` — the match: seasons, coins, swap / secure / steal, halving, bots.
- `tools/probe` — bot clients + headless spectator + measurement run.
- `scripts/` — `pnpm dev`, `pnpm verify:changed`.

## Ports

- Game server: `3930` (override: `PORT`)
- Player client: `5930` (override: `CLIENT_PORT`)
- Viewer: `5931` (override: `VIEWER_PORT`)
- Browser tests: server `3932`, client `5932` (their own stack, never `pnpm dev`'s)

Chosen 2026-11-14 as the first free `*930` pair at that time; see
[docs/NIGHT-RUN.md](docs/NIGHT-RUN.md).

## Running

Prerequisites: Node >= 22, pnpm. `corepack enable` installs pnpm from `package.json`.

```
pnpm install
pnpm dev          # match server (32 bots), client and viewer in the background; prints URLs
pnpm dev --lan    # the same, also open to the local network: prints the address for a phone
pnpm dev:stop     # stops exactly the processes pnpm dev started
pnpm simulate --seed 1  # one full 32-bot match of the game core, headless, with a sanity list
pnpm probe        # full probe run: server + 32 bots + headless spectator, writes a report
pnpm server       # just the server, in the foreground (SEASON_SECONDS=15 for a 1-minute match)
pnpm client       # just the client on http://localhost:5930, in the foreground
pnpm viewer       # just the viewer on http://localhost:5931, in the foreground
pnpm e2e          # Playwright: the client at desktop and phone size on a short match
pnpm verify       # format:check + lint + typecheck + test (the full suite, as in CI)
pnpm verify:changed  # the same checks, only for what changed since origin/master
```

`pnpm dev` starts the three processes hidden (no windows on Windows; the same on Linux and
macOS), writes their output to `logs/dev-*.log` and their PIDs to `tmp/dev-pids.json`, and
waits until server, client and viewer answer. It refuses to start if a port is taken or a
previous `pnpm dev` is still running, and with `NODE_ENV=production`. `--lan` is
development only and never the default; on Windows the firewall may ask once whether Node
may accept connections.

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
- [docs/GAME-CORE.md](docs/GAME-CORE.md) — the mechanics as built in `packages/game-core`.
- [docs/CLIENT.md](docs/CLIENT.md) — the player client as built: joining, controls, screen,
  halving staging, result and bridge box, browser tests.
- [docs/SERVER.md](docs/SERVER.md) — the match server as built: slots, lifecycle, state
  message, bounds.
- [docs/SECURITY.md](docs/SECURITY.md) — the automated security checks and the settings
  only the owner can switch on.
- [docs/THREATS.md](docs/THREATS.md) — what a cheating or broken client can try, the
  server's answer and the test for each.
- [docs/BACKLOG.md](docs/BACKLOG.md) — OPEN / CLOSED / CHECKS DONE.

## Licence

AGPL-3.0-or-later. See [LICENSE](LICENSE).
