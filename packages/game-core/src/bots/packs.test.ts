// Seasonal Sumo — bots must not bunch in one spot for long or stand still (the pack test of
// Seasonal Spirits, 2026-11-15: collectors once travelled as one blob of up to ten ghosts).

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../config.js';
import { distance } from '../geometry.js';
import { simulate } from '../simulation.js';
import type { MatchState } from '../types.js';

const LINK = 40; // field units: ghosts this close (a little more than touching) form a group
const MIN_PACK = 5; // "more than 4 ghosts"
const MAX_PACK_MS = 15_000;

// Groups of at least MIN_PACK ghosts on the arena linked within LINK.
function groups(s: Readonly<MatchState>): Set<number>[] {
  const seen = new Set<number>();
  const out: Set<number>[] = [];
  for (const start of s.ghosts.filter((g) => g.phase === 'in')) {
    if (seen.has(start.id)) continue;
    seen.add(start.id);
    const members = [start];
    for (let i = 0; i < members.length; i++) {
      const a = members[i];
      for (const b of s.ghosts) {
        if (!a || b.phase !== 'in' || seen.has(b.id) || distance(a, b) > LINK) continue;
        seen.add(b.id);
        members.push(b);
      }
    }
    if (members.length >= MIN_PACK) out.push(new Set(members.map((g) => g.id)));
  }
  return out;
}

// One whole 32-bot match per seed, watched once for both checks (NIGHT 2026-11-19: four whole
// matches ran in two test cases, 12–16 s alone, and timed out beside the rest of the suite):
// the longest time one pack kept a core of at least MIN_PACK of the same ghosts, and the share of
// ghost-ticks on the arena spent nearly still (below 5 units/s).
const watched = new Map<number, { longestPackMs: number; stillShare: number }>();

function watch(seed: number): { longestPackMs: number; stillShare: number } {
  const known = watched.get(seed);
  if (known) return known;
  let packs: { core: Set<number>; since: number }[] = [];
  let longest = 0;
  let still = 0;
  let all = 0;
  simulate(DEFAULT_CONFIG, seed, undefined, (s) => {
    packs = groups(s).map((g) => {
      const prev = packs.find((p) => [...g].filter((id) => p.core.has(id)).length >= MIN_PACK);
      const core = prev ? new Set([...g].filter((id) => prev.core.has(id))) : g;
      const since = prev?.since ?? s.elapsedMs;
      longest = Math.max(longest, s.elapsedMs - since);
      return { core, since };
    });
    for (const g of s.ghosts) {
      if (g.phase !== 'in') continue;
      all++;
      if (Math.hypot(g.vx, g.vy) < 5) still++;
    }
  });
  const out = { longestPackMs: longest, stillShare: still / all };
  watched.set(seed, out);
  return out;
}

describe('bots spread out and move', () => {
  // One whole 32-bot match per case: about 3–5 s alone.
  it.each([1, 2, 3])(
    'seed %i: no group of more than 4 ghosts stays together longer than 15 s',
    { timeout: 20_000 },
    (seed) => {
      expect(watch(seed).longestPackMs).toBeLessThanOrEqual(MAX_PACK_MS);
    },
  );

  it(
    'stands nearly still less than 5 % of the time (seed 1, watched above)',
    { timeout: 20_000 },
    () => {
      expect(watch(1).stillShare).toBeLessThan(0.05);
    },
  );
});
