# Phase 0 — the network probe

The Phase 0 probe answers one question: can 32 players share a live map over WebSockets at
20 Hz, with 100–200 ms one-way latency, with no visible jumps on the client? The result is
numbers; the owner decides whether to continue, change the technology, or change the
concept.

## What the probe does

- Starts the game server in-process on `PORT` (default `3930`). Since 2026-11-14 this is
  the match server (docs/SERVER.md): its own bots hold the 32 slots until the probe bots
  join and replace them.
- Spawns `GHOSTS` real WebSocket bot clients (default 32). Each bot:
  - says `{"kind":"player"}`;
  - sends a normalized direction every 50 ms, `dx`/`dy` as a unit vector;
  - picks a new random direction every 0.5–2.0 s;
  - turns inward near the world edge.
  - Both the outgoing input and the incoming state pass through the artificial delay
    queue (`LATENCY_MIN`..`LATENCY_MAX`, default 100..200 ms).
- Starts one headless spectator (a client that sends nothing but the hello), delays
  incoming states through the same queue, interpolates at 60 Hz with a 100 ms buffer, and
  runs the jump detector.
- Lets everything run for `DURATION_S` seconds (default 120), then stops bots, spectator and
  server.
- Writes a report to `reports/phase0/<ISO-timestamp>-<hostname>.md`.

## Definitions

- **Jump.** Per rendered frame and per ghost, we compare the current position with the
  previous frame's. If the distance exceeds `2 · speed · frameDt + 2` units, that is a
  jump. The threshold is forgiving on purpose: any jump at all is bad. The report counts
  jumps per 60 s.
- **Underrun.** A rendered frame where no later state was available for the target render
  time `now - bufferMs`; the client has to extrapolate from the last two states. Counted
  per 60 s.

## Why the latency is simulated in software

The probe must run on any laptop and on any VPS. Simulating in software is deterministic,
reproducible and does not depend on the operating system's traffic control. The queue is
order-preserving: each item's delivery time is `max(previous delivery, now + random)`, so
even when a later sample happens to be shorter, the earlier item still goes first.

## How to read the report

Three criteria decide the Phase 0 question:

1. **20 Hz with 32 bots under 30 % of one core.** Server-side. The probe reports the
   achieved tick rate and the percentage of one core consumed over the run; both must
   meet the threshold.
2. **State message under 1 KB.** With 32 ghosts: `9 + 6 · 32 = 201 bytes`. Already well
   below 1 KB; this would only fail if the encoding changed.
3. **No visible jumps at 150 ms.** The spectator reports `jumpsPer60s` and underruns per
   60 s as numbers. "Visible" cannot be decided by a count. The report therefore prints `jumps: <n>/60 s — visibility is checked by eye (see docs/PHASE0.md)`,
   and the decision is a visual check of the running viewer (see "Result" below).

The first two criteria are marked `PASS` or `FAIL` in the report; the third carries only
its count. The probe exits 0 in every case: the report is the answer.

## Result

**Phase 0 is accepted on the development PC** (owner decision, 2026-11-14). Measured in
Run 3 on Windows 11, Intel Core Ultra 7 165U, Node 24.20.0, 120 s, 32 bots, 100–200 ms
one-way latency; report
[`reports/phase0/2026-11-14T01-47-08-290Z-Testrechner.md`](../reports/phase0/2026-11-14T01-47-08-290Z-Testrechner.md):

| Criterion                                 | Target          | Run 3                           | Decided by           |
| ----------------------------------------- | --------------- | ------------------------------- | -------------------- |
| 20 Hz with 32 bots under 30 % of one core | ≥ 19 Hz, ≤ 30 % | 20.00 Hz, 18.99 %               | number: PASS         |
| State message under 1 KB                  | < 1024 bytes    | 201 bytes                       | number: PASS         |
| No visible jumps at 150 ms                | none visible    | 32 jumps/60 s, 0 underruns/60 s | visual check: passed |

The third criterion is decided by the owner's visual check of the running viewer on
2026-11-14: no visible jumps. That visual check is the evidence; the count of 32 per 60 s
stays as the record. (The probe report of Run 3 still shows the old wording, `FAIL`, for this
line; reports from later runs carry the count only.)

**Still open:** the same measurement on the target server — the run sheet below.

## Against the match server (2026-11-14)

Two 120 s runs on the same PC after the server started playing real matches (game core on
the 20 Hz loop, 32 slots, the probe bots replacing the server's bots):

| Number                                          | Phase 0 Run 3 (empty map) | Match server, first run | Match server, check run |
| ----------------------------------------------- | ------------------------- | ----------------------- | ----------------------- |
| Achieved Hz                                     | 20.00                     | 20.00                   | 20.00                   |
| CPU, % of one core (whole probe process)        | 18.99 %                   | 23.30 %                 | 16.39 %                 |
| Max tick duration                               | 44 ms                     | 177 ms                  | 26 ms                   |
| State message bytes                             | 201                       | max 454 (avg 408)       | max 454 (avg 406)       |
| Jumps per 60 s                                  | 32                        | 414                     | 0                       |
| Underruns per 60 s                              | 0                         | 162                     | 0                       |
| Spectator frames rendered (60 Hz nominal: 7200) | 5338                      | 4233                    | 5481                    |

First run: report
[`reports/phase0/2026-11-14T12-26-57-230Z-Testrechner.md`](../reports/phase0/2026-11-14T12-26-57-230Z-Testrechner.md),
with other load on the PC (Docker Desktop among it). Check run, same server code, PC mostly
idle: report
[`reports/phase0/2026-11-14T15-11-15-932Z-Testrechner.md`](../reports/phase0/2026-11-14T15-11-15-932Z-Testrechner.md).
The owner had watched the viewer at 15:52 the same day with the PC mostly idle: 0 jumps per
60 s and no visible stutter. The check run's rule (jumps ≤ 50 per 60 s, underruns ≤ 20 per
60 s, max tick ≤ 50 ms) holds, so **the first run's numbers were load on the PC**, not the
match server; nothing in the server was changed for it. The probe runs server, 32 bots and
the spectator in one Node process, so a busy PC shows up in all of jumps, underruns, tick
time and frame count at once. The CPU number is computed over the measurement window only;
Run 3 divided the same CPU time by the uptime including the 1.5 s ramp-up, about 1 % lower.

State size outside the probe: with the 38-byte header of these runs, a whole 32-bot match
encoded tick by tick (seed 1) never exceeded 402 bytes; the full-field bound was 566 bytes.
Since the halving became a season change (CONCEPT.md §13) the header has no centre pool and
is 30 bytes: at most 418 bytes in a whole match (seed 1), full-field bound 558 bytes. The
player client added per-ghost values and the shrine offers (header 34, ghost 13, offer 9
bytes; docs/SERVER.md): at most 550 bytes in a whole match (seed 1), worst case 34 + 13 · 32 +
4 · 60 + 9 · 32 = **978 bytes**, under 1 KB without compaction (tests: `apps/server/src/match-host.test.ts`
"never sends more than 1 KB in a whole 32-bot match, the halvings included";
`packages/protocol/src/state.test.ts`).

## Server run sheet (Docker, leaves nothing behind)

The probe runs from branch `phase0/network-probe` inside a throw-away `node:22` container.
Server and bots run together inside that container; no port is published, so nothing on
the VPS can reach them and they cannot collide with anything on the VPS. Paste the block
into a shell on the VPS:

```
docker run --rm -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 node:22 bash -c '
set -e
git clone --branch phase0/network-probe --depth 1 https://github.com/weudlll-cyber/seasonal-spirits.git /probe
cd /probe
corepack pnpm install --frozen-lockfile
DURATION_S=120 corepack pnpm probe
cat "$(ls -t reports/phase0/*.md | head -n 1)"
'
docker image rm node:22
```

What you will see: Docker pulls the `node:22` image (first time only), then the clone and
the install scroll by for a minute or two. Then the probe prints its `[probe] …` lines and
is quiet for 120 seconds while it measures. At the end it prints the report: server Hz and
CPU, bytes per message, jumps and underruns per 60 s, and the criteria. The report's host
name is the container's random id. When the block ends, the container is gone with
everything in it (clone, packages, report); copy the printed report if you want to keep it.
The second line removes the `node:22` image again; if another container on the VPS uses
that image, Docker refuses and nothing is removed.

The bots and the website on the server keep running throughout: the container shares only
the CPU with them. The probe's CPU number is therefore measured next to the real load, which
is what the target-server measurement is for.

## Rules the probe follows

- Each probe run is bounded by `DURATION_S` (default 120 s); no exploratory long runs.
- At most two runs per decision; if one obvious fix is applied, a second run is allowed,
  and both are recorded.
- The report lives under `reports/phase0/` and is committed with the change that produced
  it. Reports are the record of the Phase 0 decision.
