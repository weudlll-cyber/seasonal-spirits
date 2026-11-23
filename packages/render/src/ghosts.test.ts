// Seasonal Sumo — the own ghost is always labelled "You", with the protection ring and in a crowd;
// only the own one, the players and the top three carry a label. The own marks: own.test.ts.

import { describe, expect, it } from 'vitest';
import {
  GHOST_BOMB,
  GHOST_BOT,
  GHOST_PROTECTED,
  type GhostState,
} from '@seasonal-spirits/protocol';
import { bodies, recorder } from './canvas-recorder.js';
import { drawGhosts } from './ghosts.js';
import { ghostRadiusPx } from './reach.js';
import { Trails } from './trails.js';
import { fitField, sx, sy } from './view.js';

const ctx = recorder().ctx;

const ghost = (id: number, x: number, flags: number, score = 0): GhostState => ({
  id,
  team: id % 4,
  x,
  y: 1000,
  vx: 0,
  vy: 0,
  flags,
  dashLeftMs: 0,
  score,
  lives: 3,
  jumpLeftMs: 0,
  windUp: null,
});

describe('own label', () => {
  it('calls the own ghost "You" during its respawn protection, in a crowd', () => {
    const own = ghost(3, 1000, GHOST_PROTECTED, 4);
    const crowd = [1, 2, 4, 5, 6, 7].map((id) => ghost(id, 960 + id * 12, GHOST_BOT, id));
    const labels = drawGhosts(fitField(ctx, 132), [...crowd, own], {
      ownId: 3,
      trails: new Trails(),
      nowMs: 0,
      fuse: 1,
    });
    expect(labels.find((l) => l.id === 3)?.text).toBe('You · 4');
  });
});

// NIGHT 2026-11-18: in King of the Season's crowded zone full names piled up.
describe('labels in the hill zone', () => {
  it('names the players in the zone by their short tags, those outside in full, "You" always', () => {
    const inside = [ghost(5, 1000, 0, 2), ghost(6, 1020, 0, 1)];
    const outside = ghost(7, 1500, GHOST_BOT, 3);
    const own = ghost(3, 990, 0, 4);
    const labels = drawGhosts(fitField(ctx, 132), [...inside, outside, own], {
      ownId: 3,
      trails: new Trails(),
      nowMs: 0,
      fuse: 1,
      zone: { x: 1000, y: 1000, r: 120 },
    });
    const text = (id: number) => labels.find((l) => l.id === id)?.text;
    expect([text(5), text(6)]).toEqual(['P5', 'P6']);
    expect(text(7)).toBe('Bot 7 · 3');
    expect(text(3)).toBe('You · 4');
  });
});

// NIGHT 2026-11-18, piece 5: Halving Bomb's labels are names; scores only for the top three and
// the own ghost. NIGHT 2026-11-19: bots outside the top three carry no label at all.
describe('labels in Halving Bomb', () => {
  it('names the top three with their scores and the own ghost, no other bot', () => {
    const scores = [5, 9, 7, 3, 8];
    const others = scores.map((s, i) => ghost(10 + i, 400 + 300 * i, GHOST_BOT, s));
    const own = ghost(3, 1950, 0, 1);
    const labels = drawGhosts(fitField(ctx, 132), [...others, own], {
      ownId: 3,
      trails: new Trails(),
      nowMs: 0,
      fuse: 1,
      scoreTop: 3,
    });
    const text = (id: number) => labels.find((l) => l.id === id)?.text;
    expect([10, 11, 12, 13, 14].map(text)).toEqual([
      undefined,
      'Bot 11 · 9',
      'Bot 12 · 7',
      undefined,
      'Bot 14 · 8',
    ]);
    expect(text(3)).toBe('You · 1');
  });
});

// NIGHT 2026-11-19: a number or a name on almost every character, long leader lines.
describe('who is named', () => {
  it('names the own character, every real player and the top three bots, no other bot', () => {
    const bots = [1, 2, 3, 4, 5].map((id) => ghost(id, 300 + 250 * id, GHOST_BOT, id));
    const player = ghost(8, 500, 0, 0);
    const own = ghost(9, 1900, 0, 0);
    const labels = drawGhosts(fitField(ctx, 132), [...bots, player, own], {
      ownId: 9,
      trails: new Trails(),
      nowMs: 0,
      fuse: 1,
    });
    expect(labels.map((l) => l.text).sort()).toEqual([
      'Bot 3 · 3',
      'Bot 4 · 4',
      'Bot 5 · 5',
      'Player 8',
      'You',
    ]);
  });
});

// Sky Island look 2026-11-18: every character a body in its place, drawn back to front.
describe('characters', () => {
  it('draws each one at its place, the one further down the field over the one behind', () => {
    const r = recorder();
    const v = fitField(r.ctx, 132);
    const front = { ...ghost(5, 1000, 0), y: 1100 };
    drawGhosts(v, [front, ghost(6, 1010, 0)], {
      ownId: null,
      trails: new Trails(),
      nowMs: 0,
      fuse: 1,
    });
    expect(bodies(r).map((b) => b.y)).toEqual([sy(v, 1000), sy(v, 1100)]);
    expect(bodies(r)[0]?.r).toBeCloseTo(ghostRadiusPx(v));
  });
});

// NIGHT 2026-11-18, piece 5: the carrier unmistakable at any size — a bomb at least the body's
// size above it, and the carrier pulsing in a halo; nobody else wears either.
describe('the bomb carrier', () => {
  const draw = (nowMs: number) => {
    const r = recorder();
    const v = fitField(r.ctx, 132);
    drawGhosts(v, [ghost(3, 1000, GHOST_BOMB), ghost(5, 1300, 0)], {
      ownId: null,
      trails: new Trails(),
      nowMs,
      fuse: 0.5,
    });
    const body = ghostRadiusPx(v);
    const centre = (x: number) => r.arcs.filter((a) => a.x === sx(v, x) && a.y === sy(v, 1000));
    const above = r.arcs.filter((a) => a.x >= sx(v, 1000) && a.y < sy(v, 1000) - body);
    return { body, centre, above };
  };

  it('carries a bomb no smaller than its body above it, and only it wears the halo', () => {
    const { body, centre, above } = draw(0);
    expect(Math.max(...above.map((a) => a.r))).toBeGreaterThanOrEqual(body);
    expect(centre(1000).length).toBeGreaterThan(0);
    expect(centre(1300)).toEqual([]);
  });

  it('pulses: its halo grows and shrinks over time', () => {
    const sizes = [0, 150, 300, 450, 600].map((t) =>
      Math.max(
        ...draw(t)
          .centre(1000)
          .map((a) => a.r),
      ),
    );
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeGreaterThan(1);
    expect(Math.min(...sizes)).toBeGreaterThan(draw(0).body);
  });
});
