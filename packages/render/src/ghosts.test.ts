// Seasonal Sumo — the own ghost is always labelled "You": also with the respawn protection's
// dashed ring around it and in a crowd (owner 2026-11-17: no ghost showed "You"); and only the
// own ghost wears the ring, the arrow and the pulse (FIX 2026-11-17-3).

import { describe, expect, it } from 'vitest';
import {
  GHOST_BOMB,
  GHOST_BOT,
  GHOST_PROTECTED,
  type GhostState,
} from '@seasonal-spirits/protocol';
import { drawGhosts, ghostRadiusPx } from './ghosts.js';
import { Trails } from './trails.js';
import { fitField, sx, sy } from './view.js';

// A canvas that draws nothing and measures text at 6 px per character.
const canvas = { width: 1280, height: 800 };
const ctx = new Proxy<Record<string | symbol, unknown>>(
  { canvas },
  {
    get: (o, k) =>
      k in o
        ? o[k]
        : k === 'measureText'
          ? (t: string) => ({ width: 6 * t.length })
          : () => undefined,
    set: (o, k, v) => {
      if (k !== 'canvas') o[k] = v;
      return true;
    },
  },
) as unknown as CanvasRenderingContext2D;

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
      labelAll: false,
      fuse: 1,
    });
    expect(labels.find((l) => l.id === 3)?.text).toBe('You · 4');
  });
});

// NIGHT 2026-11-18: in King of the Season's crowded zone full names piled up.
describe('labels in the hill zone', () => {
  it('names the ghosts in the zone by their short tags, those outside in full, "You" always', () => {
    const inside = [ghost(5, 1000, GHOST_BOT, 2), ghost(6, 1020, GHOST_BOT, 1)];
    const outside = ghost(7, 1500, GHOST_BOT, 3);
    const own = ghost(3, 990, 0, 4);
    const labels = drawGhosts(fitField(ctx, 132), [...inside, outside, own], {
      ownId: 3,
      trails: new Trails(),
      nowMs: 0,
      labelAll: true,
      fuse: 1,
      zone: { x: 1000, y: 1000, r: 120 },
    });
    const text = (id: number) => labels.find((l) => l.id === id)?.text;
    expect([text(5), text(6)]).toEqual(['5', '6']);
    expect(text(7)).toBe('Bot 7 · 3');
    expect(text(3)).toBe('You · 4');
  });
});

// NIGHT 2026-11-18, piece 5: Halving Bomb's labels are names; scores only for the top three and
// the own ghost.
describe('labels in Halving Bomb', () => {
  it('names every ghost, with a score only for the top three and the own ghost', () => {
    const scores = [5, 9, 7, 3, 8];
    const others = scores.map((s, i) => ghost(10 + i, 400 + 300 * i, GHOST_BOT, s));
    const own = ghost(3, 1950, 0, 1);
    const labels = drawGhosts(fitField(ctx, 132), [...others, own], {
      ownId: 3,
      trails: new Trails(),
      nowMs: 0,
      labelAll: false,
      fuse: 1,
      scoreTop: 3,
    });
    const text = (id: number) => labels.find((l) => l.id === id)?.text;
    expect([10, 11, 12, 13, 14].map(text)).toEqual([
      'Bot 10',
      'Bot 11 · 9',
      'Bot 12 · 7',
      'Bot 13',
      'Bot 14 · 8',
    ]);
    expect(text(3)).toBe('You · 1');
  });
});

// A canvas that records its arcs (centre and radius in px) and the paths it closes (arrows).
function recorder() {
  const arcs: { x: number; y: number; r: number }[] = [];
  const arrows: { x: number; y: number }[] = [];
  let start = { x: 0, y: 0 };
  const calls: Record<string, (...a: number[]) => unknown> = {
    arc: (x, y, r) => arcs.push({ x, y, r }),
    moveTo: (x, y) => (start = { x, y }),
    closePath: () => arrows.push(start),
    measureText: () => ({ width: 30 }),
  };
  const rec = new Proxy<Record<string | symbol, unknown>>(
    { canvas },
    {
      get: (o, k) =>
        k in o ? o[k] : typeof k === 'string' && k in calls ? calls[k] : () => undefined,
      set: (o, k, v) => {
        if (k !== 'canvas') o[k] = v;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { rec, arcs, arrows };
}

describe('own marks', () => {
  const draw = (ownId: number | null, ownPulseMs: number | null) => {
    const r = recorder();
    const v = fitField(r.rec, 132);
    drawGhosts(v, [ghost(3, 1000, 0), ghost(5, 1300, 0)], {
      ownId,
      trails: new Trails(),
      nowMs: 0,
      labelAll: false,
      fuse: 1,
      ownPulseMs,
    });
    const body = ghostRadiusPx(v);
    const at = (x: number) => ({ x: sx(v, x), y: sy(v, 1000) });
    const around = (x: number) =>
      r.arcs.filter((a) => a.x === at(x).x && a.y === at(x).y && a.r > body + 0.5).map((a) => a.r);
    return { r, body, at, around };
  };

  it('rings the own ghost and points an arrow down at it, and no other', () => {
    const { r, at, around } = draw(3, null);
    expect(around(1000).length).toBeGreaterThan(0);
    expect(around(1300)).toEqual([]);
    expect(r.arrows).toHaveLength(1);
    expect(r.arrows[0]?.x).toBe(at(1000).x);
    expect(r.arrows[0]?.y).toBeLessThan(at(1000).y);
  });

  it('pulses a growing ring round the own ghost only, while the pulse runs', () => {
    const still = draw(3, null).around(1000);
    const pulsing = draw(3, 250);
    expect(Math.max(...pulsing.around(1000))).toBeGreaterThan(Math.max(...still));
    expect(pulsing.around(1300)).toEqual([]);
    expect(draw(3, 5000).around(1000)).toEqual(still); // over after 1.5 s
  });

  it('marks nothing when the client watches', () => {
    const { r, around } = draw(null, 250);
    expect(around(1000)).toEqual([]);
    expect(r.arrows).toEqual([]);
  });
});

// NIGHT 2026-11-18, piece 5: the carrier unmistakable at any size — a bomb at least the body's
// size above it, and the body pulsing in a halo; nobody else wears either.
describe('the bomb carrier', () => {
  const draw = (nowMs: number) => {
    const r = recorder();
    const v = fitField(r.rec, 132);
    drawGhosts(v, [ghost(3, 1000, GHOST_BOMB), ghost(5, 1300, 0)], {
      ownId: null,
      trails: new Trails(),
      nowMs,
      labelAll: false,
      fuse: 0.5,
    });
    const body = ghostRadiusPx(v);
    const centre = (x: number) => r.arcs.filter((a) => a.x === sx(v, x) && a.y === sy(v, 1000));
    const above = r.arcs.filter((a) => a.x >= sx(v, 1000) && a.y < sy(v, 1000) - body);
    return { body, centre, above };
  };

  it('carries a bomb no smaller than its body above it, and only it', () => {
    const { body, centre, above } = draw(0);
    expect(Math.max(...above.map((a) => a.r))).toBeGreaterThanOrEqual(body);
    expect(centre(1300).map((a) => a.r)).toEqual([body]);
  });

  it('pulses: its halo and body grow and shrink over time', () => {
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
