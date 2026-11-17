// Seasonal Sumo — no ghost passes through another (FIX 2026-11-17-3, owner: "I drove at bots to
// push them and passed straight through"): a dash that reaches a ghost always hits it, also at
// the fastest the sliders allow; a thrown ghost that dashes throws no harder than any other; in
// bot matches no tick ends with two solid ghosts having crossed.

import { describe, expect, it } from 'vitest';
import type { GameConfig } from './config.js';
import { botRoster, simulate } from './simulation.js';
import { act, cfg, ghost, matchOf, place } from './test-helpers.js';
import type { MatchState } from './types.js';

const D = 2 * cfg.ghostRadius;
const two = [
  { id: 1, team: 0 as const },
  { id: 2, team: 1 as const },
];
// The top of the live tuning's ranges (protocol TUNING_RANGES): 60 units a tick at a dash start.
const FAST: GameConfig = { ...cfg, dashSpeed: 1200, knockSpeed: 960 };

describe('a dash that reaches a ghost', () => {
  it('always hits it and throws it forward, from any distance, at the fastest dash', () => {
    for (let gap = 2 * D; gap <= 4 * D; gap += 1) {
      const m = matchOf(FAST, two);
      place(m, 1, -gap, 0);
      const hit = place(m, 2, 0, 0);
      act(m, 1, { dx: 1, dy: 0, action: 'dash' });
      for (let i = 0; i < 4; i++) act(m, 1, { dx: 1, dy: 0 });
      expect(hit.knockedUntilMs, `gap ${String(gap)}`).toBeGreaterThan(0);
      expect(hit.x, `gap ${String(gap)}`).toBeGreaterThan(m.state.arena.centre.x + D);
      expect(ghost(m, 1).x, `gap ${String(gap)}`).toBeLessThan(hit.x);
    }
  });

  it('throws at knockSpeed even when the dasher was just thrown itself', () => {
    const m = matchOf(cfg, two);
    place(m, 1, -2 * D, 0).knockedUntilMs = 10_000; // thrown a moment ago: counts heavier
    const hit = place(m, 2, 0, 0);
    act(m, 1, { dx: 1, dy: 0, action: 'dash' });
    let fastest = 0;
    for (let i = 0; i < 6; i++) {
      act(m, 1, { dx: 1, dy: 0 });
      fastest = Math.max(fastest, Math.hypot(hit.vx, hit.vy));
    }
    expect(fastest).toBeGreaterThan(cfg.knockSpeed * 0.9);
    expect(fastest).toBeLessThan(cfg.knockSpeed * cfg.inSeasonPush * 1.1);
  });
});

// Between two tick ends: the straight path of b relative to a came within a diameter while both
// ends are clearly apart and the two swapped sides along it.
function crossed(a0: Pos, b0: Pos, a1: Pos, b1: Pos): boolean {
  const p = { x: b0.x - a0.x, y: b0.y - a0.y };
  const q = { x: b1.x - a1.x, y: b1.y - a1.y };
  const d = { x: q.x - p.x, y: q.y - p.y };
  const len2 = d.x * d.x + d.y * d.y;
  if (len2 === 0 || Math.hypot(p.x, p.y) <= D + 1 || Math.hypot(q.x, q.y) <= D + 1) return false;
  const t = Math.max(0, Math.min(1, -(p.x * d.x + p.y * d.y) / len2));
  const close = Math.hypot(p.x + d.x * t, p.y + d.y * t);
  return close < D - 1 && p.x * d.x + p.y * d.y < 0 && q.x * d.x + q.y * d.y > 0;
}
interface Pos {
  x: number;
  y: number;
}

describe('bot matches', () => {
  it('end no tick with two solid ghosts having passed through each other', () => {
    const short: GameConfig = { ...cfg, seasonDurationMs: 10_000, matchDurationMs: 40_000 };
    let prev = new Map<number, Pos>();
    let crossings = 0;
    simulate(short, 3, botRoster(32), (s: Readonly<MatchState>) => {
      const solid = new Map(
        s.ghosts
          .filter((g) => g.phase === 'in' && s.elapsedMs >= g.protectedUntilMs)
          .map((g) => [g.id, { x: g.x, y: g.y }]),
      );
      const ids = [...solid.keys()];
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a0, b0] = [prev.get(ids[i] ?? -1), prev.get(ids[j] ?? -1)];
          const [a1, b1] = [solid.get(ids[i] ?? -1), solid.get(ids[j] ?? -1)];
          if (a0 && b0 && a1 && b1 && crossed(a0, b0, a1, b1)) crossings++;
        }
      }
      prev = solid;
    });
    expect(crossings).toBe(0);
  });
});
