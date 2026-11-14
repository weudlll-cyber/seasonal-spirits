// Seasonal Spirits — interpolation + extrapolation for the client render loop.
// Pure functions; the headless spectator and the browser viewer share them so they
// measure the same thing.

import type { GhostState, ServerState } from './state.js';

export interface BufferedState {
  // Client-local reception time in ms (after the artificial delay queue).
  receivedAt: number;
  state: ServerState;
}

export interface InterpolationResult {
  ghosts: GhostState[];
  underrun: boolean; // true if we had to extrapolate because no later state was available
}

// Linear per-ghost interpolation between the two states around (now - bufferMs).
// If no later state exists, extrapolate from the last two (counts as an underrun).
// If only one state exists, return it as-is.
export function interpolate(
  buffer: BufferedState[],
  now: number,
  bufferMs: number,
): InterpolationResult {
  if (buffer.length === 0) {
    return { ghosts: [], underrun: true };
  }
  const target = now - bufferMs;
  if (buffer.length === 1) {
    return { ghosts: buffer[0]!.state.ghosts.map((g) => ({ ...g })), underrun: true };
  }
  // Find the pair (a, b) with a.receivedAt <= target < b.receivedAt.
  for (let i = 0; i < buffer.length - 1; i++) {
    const a = buffer[i]!;
    const b = buffer[i + 1]!;
    if (a.receivedAt <= target && target < b.receivedAt) {
      const dt = b.receivedAt - a.receivedAt;
      const t = dt <= 0 ? 0 : (target - a.receivedAt) / dt;
      return { ghosts: lerpGhosts(a.state.ghosts, b.state.ghosts, t), underrun: false };
    }
  }
  // Target beyond the newest state → extrapolate from the last two.
  const last = buffer[buffer.length - 1]!;
  const prev = buffer[buffer.length - 2]!;
  const dt = last.receivedAt - prev.receivedAt;
  const t = dt <= 0 ? 0 : (target - prev.receivedAt) / dt;
  return { ghosts: lerpGhosts(prev.state.ghosts, last.state.ghosts, t), underrun: true };
}

function lerpGhosts(a: GhostState[], b: GhostState[], t: number): GhostState[] {
  const byId = new Map<number, GhostState>();
  for (const g of a) byId.set(g.id, g);
  const out: GhostState[] = [];
  for (const gb of b) {
    const ga = byId.get(gb.id);
    if (!ga) {
      out.push({ ...gb });
      continue;
    }
    out.push({
      id: gb.id,
      x: ga.x + (gb.x - ga.x) * t,
      y: ga.y + (gb.y - ga.y) * t,
      flags: gb.flags,
    });
  }
  return out;
}

// Drop states older than (now - bufferMs - keepMs). Caller keeps the buffer bounded.
export function trimBuffer(buffer: BufferedState[], now: number, keepMs: number): void {
  const cutoff = now - keepMs;
  while (buffer.length > 2 && buffer[0]!.receivedAt < cutoff) {
    buffer.shift();
  }
}
