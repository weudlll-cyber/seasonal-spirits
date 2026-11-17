// Seasonal Sumo — "Halving Bomb": one bomb per 8 players on distinct carriers, the pass to a
// touching opponent (never a teammate), the second without a pass back, and the explosion at
// the halving that halves each carrier's points and hands out new bombs.

import { describe, expect, it } from 'vitest';
import { botRoster } from '../simulation.js';
import { ghost, matchOf, modeCfg, place, runTo } from '../test-helpers.js';
import type { Match } from '../match.js';

const cfg = modeCfg('bomb');
// Ghosts 1 and 2 on Spring, 3 and 4 on Summer.
const four = [
  { id: 1, team: 0 as const },
  { id: 2, team: 0 as const },
  { id: 3, team: 1 as const },
  { id: 4, team: 1 as const },
];

// The match's one bomb goes to `carrier`, fresh.
function hand(m: Match, carrier: number): void {
  m.state.bombs.splice(0, m.state.bombs.length, { carrier, from: null, backAtMs: 0 });
}

const carrier = (m: Match): number | undefined => m.state.bombs[0]?.carrier;

describe('bombs', () => {
  it('hands out one bomb per 8 players to distinct carriers, at least one', () => {
    expect(new Set(matchOf(cfg, botRoster(32)).state.bombs.map((b) => b.carrier)).size).toBe(4);
    expect(matchOf(cfg, four).state.bombs).toHaveLength(1);
  });

  it('passes on touching an opponent, never to a teammate', () => {
    const m = matchOf(cfg, four);
    hand(m, 1);
    place(m, 1, 0, 0);
    place(m, 2, 2 * cfg.ghostRadius, 0); // a teammate touching
    place(m, 3, 0, 300);
    place(m, 4, 0, -300);
    runTo(m, 100);
    expect(carrier(m)).toBe(1);
    place(m, 3, 0, 2 * cfg.ghostRadius); // an opponent touching
    runTo(m, 150);
    expect(carrier(m)).toBe(3);
    expect(ghost(m, 1).passes).toBe(1);
  });

  it('cannot go back to the ghost that just gave it for one second', () => {
    const m = matchOf(cfg, four);
    hand(m, 1);
    place(m, 1, 0, 0);
    place(m, 2, -300, 0);
    place(m, 3, 2 * cfg.ghostRadius, 0);
    place(m, 4, 0, -300);
    runTo(m, 50); // 1 → 3; they keep touching
    expect(carrier(m)).toBe(3);
    runTo(m, 50 + cfg.bomb.passBackMs - 50);
    expect(carrier(m)).toBe(3);
    runTo(m, 50 + cfg.bomb.passBackMs);
    expect(carrier(m)).toBe(1);
  });

  it('goes off at the halving: each carrier’s points halve, new bombs go out', () => {
    const m = matchOf(cfg, four);
    const turn = cfg.seasonDurationMs;
    runTo(m, turn - 50);
    const held = carrier(m);
    const others = four.map((r) => r.id).filter((id) => id !== held);
    const before = m.state.ghosts.map((g) => g.scoreMs);
    runTo(m, turn);
    expect(m.state.events.some((e) => e.type === 'halving')).toBe(true);
    // Everyone earned 1 point per second; the carrier's points halved, then this tick's 50 ms.
    expect(ghost(m, held ?? 0).scoreMs).toBe((turn - 50) / 2 + 50);
    for (const id of others) expect(ghost(m, id).scoreMs).toBe(turn);
    expect(before.every((ms) => ms === turn - 50)).toBe(true);
    expect(m.state.bombs).toHaveLength(1);
  });
});
