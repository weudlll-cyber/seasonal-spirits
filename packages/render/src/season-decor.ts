// Seasonal Sumo — what the season in play adds to the island's decoration (NIGHT 2026-11-19,
// piece 3): blossoms on the tree crowns in spring, a few fallen leaves on the grass in autumn,
// snow caps on the rim, the crowns and the pebbles in winter, faded in and out with the season
// (season.ts). The fallen leaves and the rim's snow lie flat with the ground (drawSeasonGround;
// anywhere, like the flowers, owner 2026-11-19); the blossoms and caps go with their tree or
// pebble in the depth order (standing.ts).

import { crownOf, pebbleSize, sizeOn, spotOn } from './decor.js';
import { outline, type OnScreen } from './island.js';
import { ambientMs } from './motion.js';
import { look } from './palette.js';
import type { Seasons } from './season.js';

const FALLEN = [
  [-0.5, 0.25],
  [0.1, 0.55],
  [0.48, 0.1],
  [-0.15, -0.4],
  [0.7, 0.4],
  [-0.7, -0.05],
] as const;
const SNOW = '#ffffff';

// What the season in play adds to the ground, under everything that stands.
export function drawSeasonGround(
  ctx: CanvasRenderingContext2D,
  o: OnScreen,
  seasons: Seasons,
  nowMs: number,
): void {
  faded(ctx, seasons, nowMs, (season) => {
    if (season === 2) fallen(ctx, o);
    if (season === 3) snowRim(ctx, o);
  });
}

// Spring's blossoms or winter's cap on tree `i`'s crown.
export function drawSeasonOnTree(
  ctx: CanvasRenderingContext2D,
  o: OnScreen,
  { seasons, nowMs, i }: { seasons: Seasons; nowMs: number; i: number },
): void {
  const c = crownOf(o, i, ambientMs(nowMs) / 1000);
  faded(ctx, seasons, nowMs, (season) => {
    if (season === 0) blossoms(ctx, c, i);
    if (season !== 3) return;
    ctx.fillStyle = SNOW;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - c.r * 0.45, c.r * 0.8, c.r * 0.5, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
}

// Winter's cap on the pebble at `p`.
export function drawSeasonOnPebble(
  ctx: CanvasRenderingContext2D,
  o: OnScreen,
  { seasons, nowMs, p }: { seasons: Seasons; nowMs: number; p: readonly [number, number] },
): void {
  const s = pebbleSize(o);
  const [x, y] = spotOn(o, p);
  faded(ctx, seasons, nowMs, (season) => {
    if (season !== 3) return;
    ctx.fillStyle = SNOW;
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.2, s * 0.8, s * 0.4, 0, Math.PI, 0);
    ctx.fill();
  });
}

// `draw` for the season in play, and for the one before while it fades out.
function faded(
  ctx: CanvasRenderingContext2D,
  seasons: Seasons,
  nowMs: number,
  draw: (season: number) => void,
): void {
  const fade = seasons.at(nowMs);
  const layers: [number, number][] = [[fade.now, fade.k]];
  if (fade.before !== fade.now) layers.unshift([fade.before, 1 - fade.k]);
  for (const [season, alpha] of layers) {
    if (alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = look().ink;
    ctx.lineWidth = 1.2;
    draw(season);
    ctx.restore();
  }
}

// Spring: pink and white blossoms on a crown.
function blossoms(
  ctx: CanvasRenderingContext2D,
  c: { x: number; y: number; r: number },
  i: number,
): void {
  for (let k = 0; k < 6; k++) {
    const a = k * 2.4 + i;
    ctx.fillStyle = k % 2 ? '#ffffff' : '#ff9ec0';
    ctx.beginPath();
    ctx.arc(
      c.x + Math.cos(a) * c.r * 0.55,
      c.y + Math.sin(a) * c.r * 0.5,
      c.r * 0.16,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }
}

// Autumn: a few leaves lying on the grass.
function fallen(ctx: CanvasRenderingContext2D, o: OnScreen): void {
  const s = sizeOn(o, 0.02, 3, 7);
  FALLEN.forEach((p, i) => {
    const [x, y] = spotOn(o, p);
    ctx.fillStyle = ['#e8742c', '#d9442e', '#f2b33d'][i % 3] ?? '#e8742c';
    ctx.beginPath();
    ctx.ellipse(x, y, s, s * 0.55, i * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

// Winter: a white band of snow inside the rim.
function snowRim(ctx: CanvasRenderingContext2D, o: OnScreen): void {
  ctx.save();
  outline(ctx, o, o.cy);
  ctx.clip();
  ctx.strokeStyle = SNOW;
  ctx.lineWidth = Math.max(6, o.ry * 0.12);
  outline(ctx, o, o.cy);
  ctx.stroke();
  ctx.restore();
}
