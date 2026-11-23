// Seasonal Sumo — the season in play on the island: its colours and its drifting particles,
// cross-faded at a halving. Particles cost no memory (index and time), capped, below the band.

import { ambientMs, reducedMotion } from './motion.js';
import { look, tintLook, type SeasonTint } from './palette.js';
import { seaTop } from './sky.js';
import type { View } from './view.js';

const FADE_MS = 1000;
const PARTICLES = 28; // on a desktop; a phone-sized canvas half
const BUTTERFLIES = 3;

// The island's colours per season, Light then Dark: grass, tufts, the two tree crowns (the
// minimap's ink outlines are tested against each grass, palette.test.ts).
export const TINTS: readonly (readonly [SeasonTint, SeasonTint])[] = [
  [
    { grass: '#8ED36A', tuft: '#5ea845', crowns: ['#6cbf4b', '#7fcf5a'] },
    { grass: '#4f8f5a', tuft: '#3c7a4a', crowns: ['#3f7d55', '#4a8a5a'] },
  ],
  [
    { grass: '#A3D452', tuft: '#6fa834', crowns: ['#4fae3e', '#3f9c38'] },
    { grass: '#5a9145', tuft: '#46793a', crowns: ['#357a45', '#2f6e3e'] },
  ],
  [
    { grass: '#B5C95A', tuft: '#8f9a3a', crowns: ['#e8742c', '#d9442e'] },
    { grass: '#6d7a45', tuft: '#5b6638', crowns: ['#b5602a', '#a2402c'] },
  ],
  [
    { grass: '#D2E6CF', tuft: '#a5c3a6', crowns: ['#5f9a78', '#6aa184'] },
    { grass: '#7e958a', tuft: '#677d72', crowns: ['#3e6a58', '#46735f'] },
  ],
];

// The season shown and the one it fades from; `observe` once a frame.
export class Seasons {
  private shown = -1;
  private before = -1;
  private changedAt = -Infinity;

  observe(season: number, nowMs: number): void {
    const s = season & 3;
    if (s === this.shown) return;
    this.before = this.shown < 0 ? s : this.shown;
    this.shown = s;
    this.changedAt = this.shown === this.before ? -Infinity : nowMs;
  }

  // The fade: the season now, the one before, and how far (0 … 1) the new one has come in.
  at(nowMs: number): { now: number; before: number; k: number } {
    const ms = reducedMotion() ? FADE_MS / 2 : FADE_MS;
    const k = Math.min(1, Math.max(0, (nowMs - this.changedAt) / ms));
    return { now: Math.max(0, this.shown), before: Math.max(0, this.before), k };
  }
}

// A #rrggbb colour `k` of the way from `a` to `b`.
export function mix(a: string, b: string, k: number): string {
  const ch = (h: string, i: number): number => Number.parseInt(h.slice(i, i + 2), 16);
  const out = [1, 3, 5].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * k));
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

// Sets the island's colours for the season in play (the palette's tint, palette.ts).
export function tintSeason(seasons: Seasons, nowMs: number): void {
  const { now, before, k } = seasons.at(nowMs);
  const dark = look().night ? 1 : 0;
  const a = TINTS[before]?.[dark];
  const b = TINTS[now]?.[dark];
  if (!a || !b) return;
  tintLook({
    grass: mix(a.grass, b.grass, k),
    tuft: mix(a.tuft, b.tuft, k),
    crowns: [mix(a.crowns[0], b.crowns[0], k), mix(a.crowns[1], b.crowns[1], k)],
  });
}

// Once a frame: the season in play from the newest state (the first season before one), and the
// island's colours for it.
export function followSeason(
  seasons: Seasons,
  s: { season: number } | undefined,
  nowMs: number,
): void {
  seasons.observe(s?.season ?? 0, nowMs);
  tintSeason(seasons, nowMs);
}

// What drifts over the island for the season in play, the season before fading out.
export function drawSeasonAir(v: View, seasons: Seasons, nowMs: number): void {
  const { now, before, k } = seasons.at(nowMs);
  const t = ambientMs(nowMs) / 1000;
  if (k < 1 && before !== now) particles(v, before, t, 1 - k);
  particles(v, now, t, k);
}

// What drifts in each season, by season.
type DrawMote = (ctx: CanvasRenderingContext2D, m: Mote) => void;
const MOTES: readonly DrawMote[] = [petal, butterfly, leaf, flake];

// The particles of `season` at `alpha`, `t` seconds in.
function particles(v: View, season: number, t: number, alpha: number): void {
  const { ctx } = v;
  const w = ctx.canvas.width;
  const top = v.top;
  const h = seaTop(ctx.canvas.height) - top;
  const n = season === 1 ? BUTTERFLIES : w < 600 ? PARTICLES / 2 : PARTICLES;
  const u = Math.min(w, ctx.canvas.height) / 800;
  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = look().ink;
  for (let i = 0; i < n; i++) {
    // A fixed scatter (golden-ratio steps) moving with time; wrapping round the area.
    const fx = (i * 0.618034) % 1;
    const fy = (i * 0.754877) % 1;
    MOTES[season & 3]?.(ctx, { i, fx, fy, t, w, h, top, u, alpha });
  }
  ctx.restore();
}

interface Mote {
  i: number;
  fx: number;
  fy: number;
  t: number;
  w: number;
  h: number;
  top: number;
  u: number;
  alpha: number;
}

// Where a mote is when it drifts at (vx, vy) px/s: wrapped round the area.
function drift(m: Mote, vx: number, vy: number): [number, number] {
  const wrap = (a: number, span: number): number => ((a % span) + span) % span;
  return [wrap(m.fx * m.w + vx * m.t, m.w + 20) - 10, m.top + wrap(m.fy * m.h + vy * m.t, m.h)];
}

// Spring: a pink or white petal drifting across and down, turning.
function petal(ctx: CanvasRenderingContext2D, m: Mote): void {
  const [x, y] = drift(m, 22 + (m.i % 5) * 4, 14 + (m.i % 3) * 5);
  ctx.globalAlpha = 0.9 * m.alpha;
  ctx.fillStyle = m.i % 3 === 0 ? '#ffffff' : '#ffb3cc';
  ctx.beginPath();
  ctx.ellipse(
    x,
    y + Math.sin(m.t * 2 + m.i) * 6,
    4 * m.u + 1.5,
    2.2 * m.u + 1,
    m.t * 1.5 + m.i,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.stroke();
}

// Summer: a butterfly fluttering over the island on a looping path, its wings beating.
function butterfly(ctx: CanvasRenderingContext2D, m: Mote): void {
  const x = m.w * (0.25 + 0.5 * m.fx) + Math.sin(m.t * 0.5 + m.i * 2) * m.w * 0.18;
  const y = m.top + m.h * (0.25 + 0.4 * m.fy) + Math.sin(m.t * 0.9 + m.i) * m.h * 0.1;
  const flap = 0.35 + 0.65 * Math.abs(Math.sin(m.t * 9 + m.i));
  const s = 10 * m.u + 4;
  ctx.globalAlpha = m.alpha;
  ctx.fillStyle = ['#ffd23f', '#ff8fb1', '#9ad7ff'][m.i % 3] ?? '#ffd23f';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      x + side * s * 0.55 * flap,
      y,
      s * 0.6 * flap,
      s * 0.75,
      side * 0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }
}

// Autumn: a leaf falling and tumbling, swaying side to side.
function leaf(ctx: CanvasRenderingContext2D, m: Mote): void {
  const [x, y] = drift(m, 8, 30 + (m.i % 4) * 6);
  ctx.globalAlpha = 0.95 * m.alpha;
  ctx.fillStyle = ['#e8742c', '#d9442e', '#f2b33d'][m.i % 3] ?? '#e8742c';
  ctx.save();
  ctx.translate(x + Math.sin(m.t * 1.8 + m.i) * 14 * m.u, y);
  ctx.rotate(m.t * 2.5 + m.i);
  ctx.scale(1, Math.cos(m.t * 3 + m.i)); // tumbling
  ctx.beginPath();
  ctx.ellipse(0, 0, 5 * m.u + 2, 2.6 * m.u + 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Winter: a snowflake falling slowly, swaying.
function flake(ctx: CanvasRenderingContext2D, m: Mote): void {
  const [x, y] = drift(m, 4, 24 + (m.i % 4) * 5);
  ctx.globalAlpha = 0.95 * m.alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(
    x + Math.sin(m.t * 1.2 + m.i) * 8 * m.u,
    y,
    (m.i % 3 === 0 ? 3 : 2) * m.u + 1,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  if (m.i % 3 === 0) ctx.stroke();
}
