// Seasonal Sumo review capture — the minimap's moments: the first seconds, each halving once the
// walls have settled (numbered from the match's own first), the last seconds, then done.

import { describe, expect, it } from 'vitest';
import type { ClientView } from '../../../apps/client/e2e/stack.js';
import { MinimapDirector } from './minimap-moments.js';

const frame = (v: Partial<ClientView>): ClientView =>
  ({
    own: { x: 0, y: 0, flags: 0, dashLeftMs: 0 },
    halvings: 0,
    countdown: null,
    result: false,
    ...v,
  }) as ClientView;

describe("the minimap's moments", () => {
  it('shoots the start, each halving once the walls have settled, and the last seconds', () => {
    const d = new MinimapDirector();
    expect(d.observe(frame({ halvings: 4 }), 0)).toBeNull();
    expect(d.observe(frame({ halvings: 4 }), 1500)).toBe('start');
    expect(d.observe(frame({ halvings: 5 }), 2000)).toBeNull(); // the walls still moving
    expect(d.observe(frame({ halvings: 5 }), 4400)).toBeNull();
    expect(d.observe(frame({ halvings: 5 }), 4500)).toBe('halving-1');
    expect(d.observe(frame({ halvings: 5 }), 9000)).toBeNull();
    const end = { halvings: 5, countdown: { ms: 2900, toEnd: true } };
    expect(d.observe(frame(end), 9100)).toBe('last-seconds');
    expect(d.finished).toBe(true);
  });

  it('starts over when the team changes: a new match', () => {
    const d = new MinimapDirector();
    d.observe(frame({ team: 0 }), 0);
    expect(d.observe(frame({ team: 0 }), 1500)).toBe('start');
    expect(d.observe(frame({ team: 1, halvings: 1 }), 2000)).toBeNull();
    expect(d.observe(frame({ team: 1, halvings: 1 }), 3500)).toBe('start');
    expect(d.observe(frame({ team: 1, halvings: 2 }), 4000)).toBeNull();
    expect(d.observe(frame({ team: 1, halvings: 2 }), 6500)).toBe('halving-1');
  });
});
