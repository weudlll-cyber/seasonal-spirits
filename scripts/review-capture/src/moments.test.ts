// Seasonal Sumo review capture — the moments it shoots: 2 s before a halving, then its banner, the
// moving walls or breaking island and the new season; match over, result and the next match's
// first seconds, after which the run ends; the player's own moments once each.

import { GHOST_FALLING, GHOST_OUT, GHOST_PROTECTED } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import type { ClientView } from '../../../apps/client/e2e/stack.js';
import { Director } from './moments.js';

const frame = (v: Partial<ClientView>): ClientView =>
  ({
    ghost: 1,
    own: { x: 0, y: 0, flags: 0, dashLeftMs: 0 },
    gameMode: 'sumo',
    area: null,
    halvings: 0,
    countdown: null,
    result: false,
    ...v,
  }) as ClientView;

const moments = (d: Director, at: number): string[] => d.due(at).map((s) => s.moment);

describe('the moments of a match', () => {
  it('shoots 2 s before a halving, then its banner, the movement and the new season', () => {
    const d = new Director();
    d.observe(frame({}), 0);
    d.observe(frame({ countdown: { ms: 1900, toEnd: false } }), 100);
    expect(moments(d, 100)).toEqual(['halving-1-before']);
    d.observe(frame({ halvings: 1 }), 2000);
    expect(moments(d, 2300)).toEqual(['halving-1-banner']);
    expect(moments(d, 3300)).toEqual(['halving-1-moving']);
    expect(moments(d, 4500)).toEqual(['season-2-start']);
  });

  it('shoots match over, the result and the next match, then ends the run', () => {
    const d = new Director();
    d.observe(frame({}), 0);
    d.observe(frame({ result: true }), 1000);
    expect(moments(d, 10_000)).toEqual(['match-over', 'result', 'result-later']);
    expect(d.finished).toBe(false);
    d.observe(frame({ result: false }), 20_000);
    expect(moments(d, 22_500)).toEqual(['next-match']);
    expect(d.finished).toBe(true);
  });

  it("shoots the player's fall and respawn once, for the player's page only", () => {
    const d = new Director();
    const own = (flags: number): ClientView => frame({ own: { x: 0, y: 0, flags, dashLeftMs: 0 } });
    for (const [flags, t] of [
      [GHOST_FALLING, 0],
      [GHOST_OUT, 100],
      [GHOST_PROTECTED, 200],
      [GHOST_FALLING, 300],
    ] as const)
      d.observe(own(flags), t);
    const shots = d.due(300);
    expect(shots.map((s) => s.moment)).toEqual(['own-fall', 'own-respawn']);
    expect(shots.every((s) => s.roles?.join() === 'player')).toBe(true);
  });
});
