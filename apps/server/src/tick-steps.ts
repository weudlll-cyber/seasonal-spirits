// Seasonal Spirits — how many fixed steps the server loop runs for the wall time that passed.
// Its own file so the drift correction and its bound are tested without a clock (server.ts).

// At most this much wall time is caught up at once. A late timer callback or a garbage
// collection pause is caught up in full; after a longer gap — the PC in standby, the process
// suspended for hours — the rest is dropped and the match goes on where it stopped. Without
// the bound one loop ran every missed step at once (hours of matches, minutes of a blocked
// event loop: no connection answered; day chain 2026-11-22 piece 1).
const MAX_CATCH_UP_MS = 1000;

// The steps due for `carryMs` (the remainder of the last call) plus `elapsedMs`, and the
// remainder left for the next call.
export function stepsDue(
  carryMs: number,
  elapsedMs: number,
  stepMs: number,
): { steps: number; carryMs: number } {
  const owed = Math.min(carryMs + Math.max(0, elapsedMs), MAX_CATCH_UP_MS);
  const steps = Math.floor(owed / stepMs);
  return { steps, carryMs: owed - steps * stepMs };
}
