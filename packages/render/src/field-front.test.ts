// Seasonal Sumo — what stands in front of the characters in King and Bomb (owner 2026-11-19: a
// full zone hid its outline and crown, characters stood over the fences): the bodies are cut to
// the walls on screen — nothing of a character beyond the side or near fence —, then the zone's
// ring, flags and crown and the side and near fences come over them; sumo has none of it.

import type { GhostState, ServerState } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import { recorder } from './canvas-recorder.js';
import { fieldFront, playBox } from './field.js';
import { drawGhosts } from './ghosts.js';
import { Trails } from './trails.js';
import { fitBox, sx, sy } from './view.js';

const CROWN_GOLD = '#FFC23C';
const hill = (wall: number): ServerState =>
  ({
    mode: 1,
    wall,
    season: 0,
    area: { x: 1000 - wall / 2, y: 1000 + wall / 2, r: wall / 2 },
    next: null,
  }) as unknown as ServerState;
const ghost = (id: number, x: number, y: number): GhostState => ({
  id,
  team: id % 4,
  x,
  y,
  vx: 0,
  vy: 0,
  flags: 0,
  dashLeftMs: 0,
  score: 0,
  lives: 3,
  jumpLeftMs: 0,
  windUp: null,
});

// How many ellipses (the bodies, their shadows) were drawn when the bodies were cut to the walls,
// when the zone's crown was drawn, and in all.
function counts(
  s: ServerState,
  ghosts: GhostState[],
): { clip: number; crown: number; all: number } {
  const r = recorder();
  const v = fitBox(r.ctx, 100, playBox(s));
  const at = { clip: -1, crown: -1 };
  const fill = (): void => {
    if (r.ctx.fillStyle === CROWN_GOLD) at.crown = r.ellipses.length;
  };
  const clip = (): void => {
    if (at.clip < 0) at.clip = r.ellipses.length; // the first; each body clips its own shading
  };
  Object.assign(r.ctx, { fill, clip });
  drawGhosts(v, ghosts, {
    ownId: null,
    trails: new Trails(),
    nowMs: 0,
    fuse: 1,
    front: fieldFront(v, s),
  });
  return { ...at, all: r.ellipses.length };
}

describe('in front of the characters', () => {
  it('cuts the bodies to the walls on screen: the side walls and the near one', () => {
    const r = recorder();
    const s = hill(260);
    const v = fitBox(r.ctx, 100, playBox(s));
    expect(fieldFront(v, s)?.clip).toEqual({
      left: sx(v, 1000 - 260),
      top: 0,
      right: sx(v, 1000 + 260),
      bottom: sy(v, 1000 + 260),
    });
    expect(fieldFront(v, { ...s, mode: 0, wall: 0 })).toBeNull();
  });

  it("draws the zone's crown over a crowd standing on it, the bodies inside the cut", () => {
    const s = hill(260);
    const z = s.area ?? { x: 0, y: 0 };
    const crowd = Array.from({ length: 12 }, (_, i) => ghost(i + 1, z.x + (i % 4) * 9, z.y));
    const n = counts(s, crowd);
    expect(n.all).toBeGreaterThanOrEqual(crowd.length);
    expect(n.clip).toBe(0); // cut before the first shadow or body
    expect(n.crown).toBe(n.all); // the crown after the last body
  });
});
