# Backlog

Three parts: `OPEN` (rewritten completely as reality changes, each topic with what "done"
means), `CLOSED` (appended to, each topic with the commit that finished it) and
`CHECKS DONE` (appended to, every check that ran; see CLAUDE.md "Checks").

## OPEN

In the order decided on 2026-11-14.

a. **Safety net — owner part.** CodeQL, osv-scanner and Renovate are in the repository
(CLOSED). Still to switch on by the owner on GitHub, as described in
[SECURITY.md](SECURITY.md): secret scanning with push protection, branch protection for
`master` requiring `verify`, `dependencies` and `analyze`, Copilot code review on pull
requests, and the Renovate app. Done when: all four are on and a test push of a fake
secret is refused.

b. **Server plays real matches.** `packages/game-core` on the server's 20 Hz loop, inputs
for direction, steal, secure and swap through the shared validator, server-side bots
filling up to 32, the match lifecycle, the extended state message, a debug view in the
viewer. Done when: `pnpm dev` shows full matches with 32 bots one after another, the state
message size is measured against 1 KB, and a probe run against the match server is
recorded in PHASE0.md.

b2. **Game-core placeholders.** The values marked `placeholder — owner decides` in
`packages/game-core/src/config.ts` (list in [GAME-CORE.md](GAME-CORE.md)), and whether
the halving is "at 3:45" or "at the Autumn → Winter turn" when a match starts in another
season. Done when: the owner has decided each and config.ts carries the source.

c. **First playable version.** Rough visuals, phone joystick from the start; the client
framework decision (CONCEPT.md §8, after Phase 0) is taken here. Done when: a person can
join and steer a ghost through a full match on desktop and phone, checked with
Playwright in desktop and phone sizes.

d. **Balance by simulation.** Many bot matches. Done when: the owner has a short table per
strategy (patient, cautious, hunter) with win share and value spread.

e. **Phase 0 on the target server.** Run sheet ready (Docker, leaves nothing behind) in
[PHASE0.md](PHASE0.md). Done when: the report from the VPS is recorded in PHASE0.md and
in CHECKS DONE, with the owner's decision.

f. **Later.**

- Graphics, including the real logo assets for the four coin kinds (the owner provides
  them). Done when: the coins carry the logos and the map follows the season.
- Game evening (CONCEPT.md §5, Phase 2). Done when: an evening with sign-up,
  assignment, rotation and evening score runs end to end.
- Call-load measurement with test listeners, at the move to the server. Done when: the
  match server's numbers with a parallel website call on the same VPS are recorded.
- Phone check over Wi-Fi and mobile network, once there is something to steer. Done
  when: a match was played on a phone on both networks and the result is recorded.

g. **Last: embedding into the website.** Built ready per the website's
`docs/GAME-INTEGRATION.md` from the start; the website-side registration happens only
when the system is stable. The website-session tasks from CONCEPT.md §12: slug
`seasonal-spirits` in `server/src/games/embedded.js`, the installer question in
`deploy/install/lib/games.sh`, the feed denial in `deploy/site/Caddyfile`, tests, and the
"embedded only" exception note in `docs/GAME-INTEGRATION.md`. Done when: the game runs
under `/games/seasonal-spirits` with the website's sign-in.

## CLOSED

- 2026-11-14 — repository skeleton, toolchain, CI, docs, Phase 0 network probe (server,
  viewer, probe tool, protocol, bots, interpolation, jump detection, tests) — `88bbe18`.
- 2026-11-14 — `.tsbuildinfo` git-ignored — `6b97afc`.
- 2026-11-14 — Phase 0 jumps fix: interpolation on the server-time axis with a smooth
  render clock — `dd3c9f0`.
- 2026-11-14 — CORS on `/metrics-lite`, viewer screenshot, morning sheet — `97a4a26`.
- 2026-11-14 — second night run: start condition checked, pieces 4–5 not started —
  `7ec8086`.
- 2026-11-14 — correction: an earlier line here listed `packages/game-core` with
  `pnpm simulate` as finished. It was never built (see `7ec8086`); it is OPEN b.
- 2026-11-14 — LICENSE replaced with the verbatim AGPL-3.0 text — `42efab0`.
- 2026-11-14 — owner's e-mail address removed from the night report — `3d7a63d`.
- 2026-11-14 — read-only access to the three sibling clones — `439274a`.
- 2026-11-14 — toolchain aligned with seasonal-mini-games: pnpm 12.14.0, exact
  devDependency pins, ESLint 10 strict typed linting, strict tsconfig base, Prettier
  config file, CI with pinned actions and a frozen lockfile — `9236745`.
- 2026-11-14 — probe report: jumps as a count checked by eye, not PASS/FAIL — `5da02dc`.
- 2026-11-14 — **Phase 0 on the development PC**: accepted after the owner's visual check;
  result recorded in [PHASE0.md](PHASE0.md) — commit "docs: Phase 0 result, server run
  sheet, check rules and verify:changed".
- 2026-11-14 — server run sheet rewritten for Docker; CLAUDE.md rules (source hygiene,
  security, settings, tests, checks); `pnpm verify:changed`; CI skips docs-only pushes —
  same commit (`14144d8`).
- 2026-11-14 — `phase0/network-probe` merged into `master` with the owner's approval
  (`--no-ff`) — `f065fd1`; the branch is deleted on origin and locally.
- 2026-11-14 — safety net in the repository: CodeQL on every push, pull request and weekly;
  osv-scanner CI job with `osv-scanner.toml`; `renovate.json`; `.gitattributes` (LF);
  package versions pinned exactly; vite 5 → 8 (the viewer builds unchanged; fixes eight
  vite advisories and one esbuild advisory); minimatch forced to 11.0.1; docs/SECURITY.md;
  PHASE0.md without the unmeasured overshoot sentence; machine paths removed from the
  night report — `ce87fee` on `chore/safety-net`.
- 2026-11-14 — **game core**: `packages/game-core` per CONCEPT.md §2a, §2b, §8 (seasons,
  coins, carrying, value, swap, secure, steal, halving with pool and countdown, result),
  three bot strategies, one config file, `pnpm simulate --seed <n>`; docs/THREATS.md with a
  test per entry and the shared client message validator in `packages/protocol` (fixes the
  crash on `null`); `/metrics-lite` loopback only, CORS in development only; validated
  environment, dev tools refuse production; `pnpm dev` / `pnpm dev:stop` — commit
  "feat: game core, threat list, pnpm dev" on `feat/game-core`.

## CHECKS DONE

| Date       | Check                                                                | Tree or commit                                                     | Result                                                                                                                                                                                              | Evidence                                                                                      |
| ---------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 2026-11-14 | probe 120 s (Run 1, baseline)                                        | probe code of `6b97afc`                                            | 20.00 Hz, 19.3 % CPU, 201 B, 5712 jumps/60 s, 76 underruns/60 s                                                                                                                                     | `reports/phase0/2026-11-14T01-38-37-921Z-Testrechner.md` (committed in `dd3c9f0`)             |
| 2026-11-14 | probe 120 s (Run 2, first fix attempt)                               | uncommitted intermediate on `6b97afc`                              | 20.03 Hz, 22.1 % CPU, 201 B, 15917 jumps/60 s, 0 underruns/60 s                                                                                                                                     | `reports/phase0/2026-11-14T01-42-58-785Z-Testrechner.md` (committed in `dd3c9f0`)             |
| 2026-11-14 | probe 120 s (Run 3, committed fix)                                   | `dd3c9f0`                                                          | 20.00 Hz, 18.99 % CPU, 201 B, 32 jumps/60 s, 0 underruns/60 s                                                                                                                                       | `reports/phase0/2026-11-14T01-47-08-290Z-Testrechner.md`                                      |
| 2026-11-14 | viewer self-check, headless Chromium                                 | `97a4a26`                                                          | 32 ghosts drawn, 201 B per state, server 19.98 Hz                                                                                                                                                   | `reports/phase0/viewer-2026-11-14T01-58-16-014Z.png`, `reports/night-2026-11-14.md`           |
| 2026-11-14 | full `pnpm verify` (local, night run)                                | `97a4a26`                                                          | green, 25 tests                                                                                                                                                                                     | `reports/night-2026-11-14.md`                                                                 |
| 2026-11-14 | viewer visual check by owner                                         | running server and viewer of `97a4a26`                             | no visible jumps — Phase 0 accepted on the development PC                                                                                                                                           | [PHASE0.md](PHASE0.md) "Result"                                                               |
| 2026-11-14 | format:check, lint, typecheck, test (local)                          | working tree committed as `9236745`                                | green, 25 tests                                                                                                                                                                                     | commit `9236745`                                                                              |
| 2026-11-14 | full CI                                                              | `9236745`                                                          | success                                                                                                                                                                                             | [run 43588700880](https://github.com/weudlll-cyber/seasonal-spirits/actions/runs/43588700880) |
| 2026-11-14 | probe unit tests, lint/typecheck of probe                            | working tree committed as `5da02dc`                                | green, 9 tests                                                                                                                                                                                      | commit `5da02dc`                                                                              |
| 2026-11-14 | full CI                                                              | `5da02dc`                                                          | success                                                                                                                                                                                             | [run 43588940883](https://github.com/weudlll-cyber/seasonal-spirits/actions/runs/43588940883) |
| 2026-11-14 | `pnpm verify:changed`                                                | working tree committed as "docs: Phase 0 result, server run sheet" | widened to the full tree (toolchain changed since `origin/master`): lint, typecheck green, 38 tests green; format found 2 Markdown files, fixed, commit `14144d8`                                   |
| 2026-11-14 | full CI                                                              | `14144d8`                                                          | success                                                                                                                                                                                             | [run 43589608597](https://github.com/weudlll-cyber/seasonal-spirits/actions/runs/43589608597) |
| 2026-11-14 | full CI on the merge commit                                          | `f065fd1` (master; tree equal to `14144d8`)                        | success                                                                                                                                                                                             | [run 43590445361](https://github.com/weudlll-cyber/seasonal-spirits/actions/runs/43590445361) |
| 2026-11-14 | osv-scanner v2.7.0 on pnpm-lock.yaml (local Docker)                  | `f065fd1`                                                          | 10 known vulnerabilities: vite 5.4.21 (8), esbuild 0.21.5, minimatch 10.2.6                                                                                                                         | output in the safety-net commit message                                                       |
| 2026-11-14 | osv-scanner v2.7.0 on pnpm-lock.yaml (local Docker)                  | working tree committed as "chore: safety net"                      | no issues found                                                                                                                                                                                     | same commit                                                                                   |
| 2026-11-14 | viewer production build with vite 8.3.4                              | working tree committed as "chore: safety net"                      | builds, 11 modules, no warnings                                                                                                                                                                     | same commit                                                                                   |
| 2026-11-14 | `pnpm verify:changed`                                                | working tree committed as "chore: safety net"                      | widened to the full tree (package manifests changed): lint, typecheck green, 38 tests green; format failed on CRLF working copies only, fixed by .gitattributes + Prettier, format re-checked green | same commit                                                                                   |
| 2026-11-14 | full CI (verify + dependencies)                                      | `ce87fee`                                                          | success                                                                                                                                                                                             | [run 43590949079](https://github.com/weudlll-cyber/seasonal-spirits/actions/runs/43590949079) |
| 2026-11-14 | CodeQL                                                               | `ce87fee`                                                          | success                                                                                                                                                                                             | [run 43590949106](https://github.com/weudlll-cyber/seasonal-spirits/actions/runs/43590949106) |
| 2026-11-14 | game-core, protocol, server, probe, scripts unit tests               | working tree committed as "feat: game core, threat list, pnpm dev" | 93 tests in 18 files green                                                                                                                                                                          | same commit                                                                                   |
| 2026-11-14 | mutation check of the garbage-message test                           | same tree with the old raw JSON.parse put back for one run         | the test failed with the old crash (uncaught TypeError on null); fix restored, green                                                                                                                | same commit message                                                                           |
| 2026-11-14 | `pnpm simulate --seed 1`                                             | same tree                                                          | four sanity checks ok; halving at 3:45, 471 carried → 224 kept + 247 pooled                                                                                                                         | docs/GAME-CORE.md, session report                                                             |
| 2026-11-14 | `pnpm dev` live start, `/metrics-lite`, viewer HTTP, `pnpm dev:stop` | same tree                                                          | 19.92 Hz, 32 clients, 32 ghosts; viewer 200; all three stopped, ports free                                                                                                                          | session report                                                                                |
| 2026-11-14 | `pnpm verify:changed` (lint, typecheck, format)                      | same tree                                                          | first run: 11 files unformatted, 2 lint, 1 type error; fixed; lint, typecheck, format re-run green                                                                                                  | same commit                                                                                   |
