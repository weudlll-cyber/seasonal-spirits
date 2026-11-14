# Phase 0 — the network probe

The Phase 0 probe answers one question: can 32 players share a live map over WebSockets at
20 Hz, with 100–200 ms one-way latency, with no visible jumps on the client? The result is
numbers; the owner decides whether to continue, change the technology, or change the
concept.

## What the probe does

- Starts the game server in-process on `PORT` (default `3930`).
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
   60 s as numbers. "Visible" cannot be decided by a count: the detector's threshold is
   deliberately strict and flags single-frame overshoots a viewer does not see. The report
   therefore prints `jumps: <n>/60 s — visibility is checked by eye (see docs/PHASE0.md)`,
   and the decision is a visual check of the running viewer (see "Result" below).

The first two criteria are marked `PASS` or `FAIL` in the report; the third carries only
its count. The probe exits 0 in every case: the report is the answer.

## Linux run sheet

One copy-paste block, Node 22 via Corepack if missing. Replace `<git-url>` with the clone
URL (`https://github.com/weudlll-cyber/seasonal-spirits.git`).

```
set -e
command -v node || { corepack enable; corepack prepare node@22 --activate; }
git clone <git-url> seasonal-spirits
cd seasonal-spirits
corepack enable
pnpm install
pnpm probe
cat "$(ls -t reports/phase0/*.md | head -n 1)"
```

## Rules the probe follows

- Each probe run is bounded by `DURATION_S` (default 120 s); no exploratory long runs.
- At most two runs per decision; if one obvious fix is applied, a second run is allowed,
  and both are recorded.
- The report lives under `reports/phase0/` and is committed with the change that produced
  it. Reports are the record of the Phase 0 decision.
