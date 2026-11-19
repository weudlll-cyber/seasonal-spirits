// Seasonal Sumo — the layers of the island (owner 2026-11-19: the crack lay over the trees, the
// fence over the characters): what lies flat is under every tree and character, a character and
// what stands on the island are in one depth order — a tree or a fence post in front of a
// character covers it, one behind it does not —, the crown floats over the crowd, the season's
// particles fly under the labels; two "Dodged!" bubbles never stand over each other.

import type { GhostState, ServerState } from '@seasonal-spirits/protocol';
import { describe, expect, it, vi } from 'vitest';
import { recorder, type Recorded } from './canvas-recorder.js';
import { TREES, crownOf, spotOn } from './decor.js';
import { BreakOff } from './breakoff.js';
import { drawField, playBox } from './field.js';
import { drawGhosts } from './ghosts.js';
import { onScreen } from './island.js';
import { DODGED_BOX, clearBubble } from './jump.js';
import { Seasons } from './season.js';
import { fieldStanding } from './standing.js';
import { Trails } from './trails.js';
import { fitBox, sx, sy, type Box } from './view.js';

const CROWN_GOLD = '#FFC23C';

// What was drawn, in order: bodies, circles, rectangles (by their foot's middle and width),
// dashed strokes, and fills in the crown's gold.
interface Mark {
  kind: 'body' | 'arc' | 'rect' | 'dash' | 'gold';
  x: number;
  y: number;
  w: number;
}

function marking(r: Recorded): { ctx: CanvasRenderingContext2D; marks: Mark[] } {
  const marks: Mark[] = [];
  const base = r.ctx as unknown as Record<string, (...a: number[]) => void>;
  const wrap: Record<string, (...a: number[]) => void> = {
    ellipse: (...a) => {
      base.ellipse?.(...a);
      const e = r.ellipses.at(-1);
      if (e && Math.abs(e.ry / e.rx - 1.04) < 0.001) marks.push({ kind: 'body', ...e, w: e.rx });
    },
    arc: (...a) => {
      base.arc?.(...a);
      const c = r.arcs.at(-1);
      if (c) marks.push({ kind: 'arc', x: c.x, y: c.y, w: c.r });
    },
    rect: (x = 0, y = 0, w = 0, h = 0) => marks.push({ kind: 'rect', x: x + w / 2, y: y + h, w }),
    fill: () => {
      if (r.ctx.fillStyle === CROWN_GOLD) marks.push({ kind: 'gold', x: 0, y: 0, w: 0 });
    },
  };
  const ctx = new Proxy(r.ctx, {
    get: (o, k) => {
      if (k === 'setLineDash')
        return (d: number[]) => d.length > 0 && marks.push({ kind: 'dash', x: 0, y: 0, w: 0 });
      return typeof k === 'string' && k in wrap ? wrap[k] : (Reflect.get(o, k) as unknown);
    },
    set: (o, k, v) => Reflect.set(o, k, v),
  });
  return { ctx, marks };
}

const state = (s: Partial<ServerState>): ServerState =>
  ({ season: 1, flags: 0, countdownMs: null, next: null, ...s }) as unknown as ServerState;
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

// One frame of `s` with `ghosts` (the client's order: the ground, then the depth order), its marks.
function frame(s: ServerState, ghosts: GhostState[], box: Box): Mark[] {
  const { ctx, marks } = marking(recorder());
  const v = fitBox(ctx, 100, box);
  const seasons = new Seasons();
  // The front clouds' layer (sky.ts) is a canvas of its own: here one that paints nothing; the
  // characters without a document are drawn straight onto the canvas (sprites.ts).
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => null }) });
  const ground = drawField(v, s, 0, { breaks: new BreakOff(), seasons });
  vi.unstubAllGlobals();
  drawGhosts(v, ghosts, {
    ownId: null,
    trails: new Trails(),
    nowMs: 0,
    fuse: 1,
    field: fieldStanding(v, s, ground, { nowMs: 0, seasons }),
  });
  return marks;
}

const index = (marks: Mark[], test: (m: Mark) => boolean): number => marks.findIndex(test);

describe('the ground under everything that stands', () => {
  it("draws Sumo's halving crack before a tree standing on it", () => {
    const area = { x: 1000, y: 1000, r: 400 };
    const box = { x: 1000, y: 1000, half: 416 };
    const s = state({ mode: 0, wall: 0, area, next: { ...area, r: 260 } });
    const v = fitBox(recorder().ctx, 100, box);
    const crown = crownOf(onScreen(v, { ...area, square: false }), 0, 0);
    const marks = frame(s, [], box);
    const crack = index(marks, (m) => m.kind === 'dash');
    const tree = index(
      marks,
      (m) => m.kind === 'arc' && Math.abs(m.x - crown.x) < 3 && Math.abs(m.y - crown.y) < 3,
    );
    expect(crack).toBeGreaterThanOrEqual(0);
    expect(tree).toBeGreaterThan(crack);
  });
});

describe('one depth order for the characters and what stands on the island', () => {
  const area = { x: 1000, y: 1000, r: 400 };
  const box = { x: 1000, y: 1000, half: 416 };
  const s = state({ mode: 0, wall: 0, area });
  const v = fitBox(recorder().ctx, 100, box);
  const ground = onScreen(v, { ...area, square: false });
  const [tx, ty] = spotOn(ground, TREES[0]);
  const crown = crownOf(ground, 0, 0);
  const field = (x: number, y: number): [number, number] => [
    (x - v.ox) / v.scale,
    (y - v.oy) / (v.scale * v.tilt),
  ];
  const crownAfterBody = (screenY: number): boolean => {
    const [x, y] = field(tx, screenY);
    const marks = frame(s, [ghost(1, x, y)], box);
    const body = index(marks, (m) => m.kind === 'body');
    const tree = index(
      marks,
      (m) => m.kind === 'arc' && Math.abs(m.x - crown.x) < 3 && Math.abs(m.y - crown.y) < 3,
    );
    expect(body).toBeGreaterThanOrEqual(0);
    return tree > body;
  };

  it('draws a tree over a character standing behind it', () => {
    expect(crownAfterBody(ty - 6)).toBe(true);
  });

  it('leaves a character standing in front of a tree over it', () => {
    expect(crownAfterBody(ty + 12)).toBe(false);
  });
});

describe('the depth order inside the walls', () => {
  it('puts a character beside the side fence in front of the post behind it, behind the one in front', () => {
    const walls = state({ mode: 2, wall: 260, area: null });
    const wb = playBox(walls);
    const g = ghost(1, wb.x + wb.half - 16, wb.y + 30);
    const marks = frame(walls, [g], wb);
    const wv = fitBox(recorder().ctx, 100, wb);
    const post = (fy: number): number =>
      index(
        marks,
        (m) =>
          m.kind === 'rect' &&
          m.w === 5 &&
          Math.abs(m.x - sx(wv, wb.x + wb.half)) < 1 &&
          Math.abs(m.y - sy(wv, fy)) < 1,
      );
    const body = index(marks, (m) => m.kind === 'body');
    const step = (2 * wb.half) / 8; // the posts along a wall
    expect(post(wb.y)).toBeGreaterThanOrEqual(0);
    expect(post(wb.y)).toBeLessThan(body);
    expect(post(wb.y + step)).toBeGreaterThan(body);
  });

  it("floats King's crown over a crowd standing in the zone", () => {
    const zone = { x: 870, y: 1130, r: 130 };
    const hill = state({ mode: 1, wall: 260, area: zone });
    const hb = playBox(hill);
    const crowd = Array.from({ length: 12 }, (_, i) =>
      ghost(i + 1, zone.x - 40 + (i % 4) * 25, zone.y - 30 + Math.floor(i / 4) * 30),
    );
    const marks = frame(hill, crowd, hb);
    const kinds = marks.map((m) => m.kind);
    expect(kinds.lastIndexOf('gold')).toBeGreaterThan(kinds.lastIndexOf('body')); // the crown
  });
});

describe('what flies over the island', () => {
  it("draws the season's particles before the labels, so no name is hidden (review 2026-11-20)", () => {
    const r = recorder();
    const v = fitBox(r.ctx, 100, { x: 1000, y: 1000, half: 416 });
    let textsBefore = -1;
    drawGhosts(v, [ghost(1, 1000, 1000)], {
      ownId: 1,
      trails: new Trails(),
      nowMs: 0,
      fuse: 1,
      air: () => {
        textsBefore = r.texts.length;
      },
    });
    expect(textsBefore).toBe(0);
    expect(r.texts.length).toBeGreaterThan(0); // "You", after them
  });
});

describe('"Dodged!" bubbles', () => {
  it('moves a bubble up out of another one, and leaves it out when there is no room', () => {
    const first = { x: 100, y: 200 };
    expect(clearBubble(first, [])).toEqual(first);
    const second = clearBubble({ x: 120, y: 205 }, [first]);
    expect(second && Math.abs(second.y - first.y)).toBeGreaterThanOrEqual(DODGED_BOX.height);
    const stack = [0, 1, 2, 3].map((k) => ({ x: 100, y: 200 - k * DODGED_BOX.height }));
    expect(clearBubble({ x: 100, y: 200 }, stack)).toBeNull();
  });
});
