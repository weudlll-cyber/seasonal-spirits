// Seasonal Sumo — the own character found at a glance (owner 2026-11-20: in a crowd the "You"
// pill hid under a "Dodged!", the thin white ring vanished on the grass, others stood in front of
// it): only it wears the ring in its team's colour, breathing, and the arrow above; it is drawn
// after every other character; no other label or "Dodged!" goes in the arrow's box, the own label
// sits beside it; the arrow goes over a carried bomb, its fuse and spark; off screen an arrow at
// the edge points to it.

import { GHOST_BOMB, GHOST_DODGED, type GhostState } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import { bodies, recorder } from './canvas-recorder.js';
import { drawGhosts, type GhostStyle } from './ghosts.js';
import { LABEL_HEIGHT, type PlacedLabel } from './labels.js';
import { DODGED_BOX } from './jump.js';
import { ownMarkerBox } from './own.js';
import { ghostRadiusPx, ghostReach } from './reach.js';
import { Trails } from './trails.js';
import { fitField, overlaps, sx, sy, type Rect, type View } from './view.js';

const ghost = (id: number, x: number, y: number, flags = 0): GhostState => ({
  id,
  team: id % 4,
  x,
  y,
  vx: 0,
  vy: 0,
  flags,
  dashLeftMs: 0,
  score: id,
  lives: 3,
  jumpLeftMs: 0,
  windUp: null,
});

const OWN = 3;

// One frame of `ghosts` at `nowMs` (a whole beat: the arrow at the bottom of its bob); `trails`
// recorded before when given.
function frame(ghosts: GhostState[], opts: Partial<GhostStyle> = {}, nowMs = 0) {
  const r = recorder();
  const v = fitField(r.ctx, 132);
  const style: GhostStyle = { ownId: OWN, trails: new Trails(), nowMs, fuse: 1, ...opts };
  const labels = drawGhosts(v, ghosts, style);
  return { r, v, labels };
}

const labelBox = (p: PlacedLabel): Rect => ({
  left: p.x - p.width / 2,
  right: p.x + p.width / 2,
  top: p.y - LABEL_HEIGHT,
  bottom: p.y,
});

// The own arrow's box for the own ghost `g` standing in view `v`.
const markerOf = (v: View, g: GhostState): Rect =>
  ownMarkerBox(v, { x: g.x, y: g.y, top: ghostReach(ghostRadiusPx(v), g) });

describe('the own marks', () => {
  const pair = [ghost(OWN, 1000, 1000), ghost(5, 1300, 1000)];
  // The rings on the ground under the character at `x`, wider than its shadow.
  const rings = (f: ReturnType<typeof frame>, x: number): number[] =>
    f.r.ellipses
      .filter((e) => e.x === sx(f.v, x) && e.y > sy(f.v, 1000) && e.rx > ghostRadiusPx(f.v) * 1.2)
      .map((e) => e.rx);

  it('rings the own character, about 1.6 times its width, and points an arrow down at it', () => {
    const f = frame(pair);
    const body = ghostRadiusPx(f.v);
    expect(Math.min(...rings(f, 1000))).toBeCloseTo(body * 1.6, 6);
    expect(rings(f, 1300)).toEqual([]);
    const arrows = f.r.closed.filter((c) => c.x === sx(f.v, 1000) && c.y < sy(f.v, 1000));
    expect(arrows).toHaveLength(1);
    expect(f.r.texts).toContain('YOU');
  });

  it('breathes the ring gently: 1.12 times its size half a beat on, back after a beat', () => {
    const still = Math.min(...rings(frame(pair), 1000));
    expect(Math.min(...rings(frame(pair, {}, 500), 1000))).toBeCloseTo(still * 1.12, 6);
    expect(Math.min(...rings(frame(pair, {}, 1000), 1000))).toBeCloseTo(still, 6);
  });

  it('pulses a growing ring round the own character only, while the respawn pulse runs', () => {
    const still = rings(frame(pair), 1000);
    const pulsing = frame(pair, { ownPulseMs: 250 });
    expect(Math.max(...rings(pulsing, 1000))).toBeGreaterThan(Math.max(...still));
    expect(rings(pulsing, 1300)).toEqual([]);
    expect(rings(frame(pair, { ownPulseMs: 5000 }), 1000)).toEqual(still); // over after 1.5 s
  });

  it('marks nothing when the client watches', () => {
    const f = frame(pair, { ownId: null, ownPulseMs: 250 });
    expect(rings(f, 1000)).toEqual([]);
    expect(f.r.closed.filter((c) => c.x === sx(f.v, 1000) && c.y < sy(f.v, 1000))).toEqual([]);
    expect(f.r.texts).not.toContain('YOU');
  });
});

describe('the own character drawn last', () => {
  it('comes over every other character, also over those standing in front of it', () => {
    const own = ghost(OWN, 1000, 980);
    const front = [ghost(5, 1005, 1000), ghost(6, 990, 1010), ghost(7, 1010, 1020)];
    const f = frame([own, ...front]);
    const drawn = bodies(f.r);
    expect(drawn).toHaveLength(4);
    expect(drawn.at(-1)?.y).toBe(sy(f.v, 980));
    // The others still back to front among themselves.
    expect(drawn.slice(0, 3).map((b) => b.y)).toEqual([1000, 1010, 1020].map((y) => sy(f.v, y)));
    // And at the same size as the others.
    expect(new Set(drawn.map((b) => b.r)).size).toBe(1);
  });

  // 2026-11-20 capture: in a crowd those standing in front hid the own ring.
  it('draws its ring over the others standing in front, right before its own body', () => {
    const own = ghost(OWN, 1000, 980);
    const f = frame([own, ghost(5, 1005, 1000), ghost(6, 990, 1010)]);
    const isBody = (e: { rx: number; ry: number }): boolean => Math.abs(e.ry / e.rx - 1.04) < 0.001;
    const ringAt = f.r.ellipses.findIndex(
      (e) => e.x === sx(f.v, 1000) && e.rx > ghostRadiusPx(f.v) * 1.5,
    );
    const bodiesAt = f.r.ellipses.flatMap((e, i) => (isBody(e) ? [i] : []));
    expect(ringAt).toBeGreaterThan(bodiesAt.at(-2) ?? Infinity);
    expect(ringAt).toBeLessThan(bodiesAt.at(-1) ?? -1);
  });
});

describe("the own arrow's box", () => {
  // The own character in a crowd of players (all named), every one just dodged a dash.
  const own = ghost(OWN, 1000, 1000);
  const crowd = [
    [960, 1000],
    [1040, 1000],
    [1000, 950],
    [970, 940],
    [1030, 940],
    [1000, 1050],
    [940, 960],
    [1060, 960],
  ].map(([x, y], i) => ghost(10 + i, x ?? 0, y ?? 0));
  const all = [own, ...crowd];
  const trails = new Trails();
  trails.record(all, 0);
  trails.record(
    all.map((g) => ({ ...g, flags: GHOST_DODGED })),
    1000,
  );
  const f = frame(all, { trails }, 1000);
  const box = markerOf(f.v, own);

  it('keeps every other label out of it, the own one beside it and over no other', () => {
    const others = f.labels.filter((p) => !p.own);
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) expect(overlaps(labelBox(p), box)).toBe(false);
    const mine = f.labels.find((p) => p.own);
    expect(mine?.text).toBe('You · 3');
    const b = mine ? labelBox(mine) : box;
    expect(b.left >= box.right || b.right <= box.left).toBe(true);
    expect(b.bottom > box.top && b.top < box.bottom).toBe(true);
    for (const p of others) expect(overlaps(labelBox(p), b)).toBe(false);
  });

  it('keeps every other "Dodged!" out of it, the own one beside it', () => {
    const bubbles = f.r.textsAt.filter((t) => t.text === 'Dodged!');
    expect(bubbles.length).toBeGreaterThan(1);
    for (const t of bubbles) {
      const pill = {
        left: t.x - DODGED_BOX.width / 2,
        right: t.x + DODGED_BOX.width / 2,
        top: t.y - DODGED_BOX.height / 2,
        bottom: t.y + DODGED_BOX.height / 2,
      };
      expect(overlaps(pill, box)).toBe(false);
    }
    expect(bubbles.some((t) => t.x < box.left && t.y > box.top && t.y < box.bottom)).toBe(true);
  });
});

// 2026-11-20 capture: with a character beside the arrow, "You · 3" went below the own one.
describe('the own label beside the arrow', () => {
  it('stays beside the arrow with another character standing right there', () => {
    const own = ghost(OWN, 1000, 1000);
    const probe = frame([own]);
    const box = markerOf(probe.v, own);
    // A player whose body stands where the label would go, right of the arrow's box.
    const at = (px: number, py: number): GhostState =>
      ghost(
        20,
        own.x + (px - sx(probe.v, own.x)) / probe.v.scale,
        own.y + (py - sy(probe.v, own.y)) / (probe.v.scale * probe.v.tilt),
      );
    const middle = (box.top + box.bottom) / 2;
    const f = frame([own, at(box.right + 20, middle), at(box.left - 20, middle)]);
    const mine = f.labels.find((p) => p.own);
    const b = mine ? labelBox(mine) : box;
    expect(b.left >= box.right || b.right <= box.left).toBe(true);
    expect(b.bottom > box.top && b.top < box.bottom).toBe(true);
    // With room on the other side it takes that, over no one (the capture: over another
    // carrier's bomb).
    const right = frame([own, at(box.right + 20, middle)]);
    const clear = right.labels.find((p) => p.own);
    expect(clear && labelBox(clear).right <= box.left).toBe(true);
  });
});

describe('the own arrow over a carried bomb', () => {
  it('stands above the bomb, its fuse and its spark, touching none of them', () => {
    const own = ghost(OWN, 1000, 1000, GHOST_BOMB);
    const f = frame([own, ghost(5, 1300, 1000)]);
    const body = ghostRadiusPx(f.v);
    // The arrow with its edge, the bomb, its shine and the spark: every circle above the body.
    const box = markerOf(f.v, own);
    const above = f.r.arcs.filter((a) => a.y < sy(f.v, 1000) - body);
    expect(above.length).toBeGreaterThanOrEqual(3);
    for (const a of above) expect(a.y - a.r).toBeGreaterThan(box.bottom);
  });
});

// 2026-11-20 capture: in King's zone at the top edge "YOU" went under the top bar.
describe('the own arrow at the top edge', () => {
  it('keeps "YOU" below the top bar, the arrow still pointing at the character', () => {
    const r = recorder();
    const v = fitField(r.ctx, 132);
    const y = (v.top + 4 - v.oy) / (v.scale * v.tilt); // the body just below the bar
    const own = ghost(OWN, 1000, y);
    drawGhosts(v, [own], { ownId: OWN, trails: new Trails(), nowMs: 0, fuse: 1 });
    const you = r.textsAt.find((t) => t.text === 'YOU');
    expect(you?.y).toBeGreaterThan(v.top + 10);
    expect(markerOf(v, own).top).toBeGreaterThanOrEqual(v.top);
    expect(you?.x).toBe(sx(v, 1000));
  });
});

describe('the own character off screen', () => {
  // Paths closed near the visible field's edges, inside it (32 px).
  const edgeArrows = (f: ReturnType<typeof frame>) =>
    f.r.closed.filter((c) => {
      const inside = c.x >= 0 && c.x <= 1280 && c.y >= f.v.top && c.y <= 800;
      const near = c.x < 32 || c.x > 1248 || c.y < f.v.top + 32 || c.y > 768;
      return inside && near;
    });

  it('points an arrow from the screen edge towards it, inside the visible field', () => {
    const f = frame([ghost(OWN, 9000, 1000), ghost(5, 1000, 1000)]);
    const arrows = edgeArrows(f);
    expect(arrows).toHaveLength(1);
    expect(arrows[0]?.x).toBeGreaterThan(1280 - 30); // at the right edge, where it is
  });

  it('draws no edge arrow while it is on screen', () => {
    expect(edgeArrows(frame([ghost(OWN, 1000, 1000)]))).toEqual([]);
  });
});
