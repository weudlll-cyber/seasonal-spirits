// Seasonal Sumo — what the season in play adds to the island's decoration (NIGHT 2026-11-19,
// piece 3): blossoms on the tree crowns in spring, a few fallen leaves on the grass in autumn,
// snow caps on the rim, the crowns and the pebbles in winter. Drawn over decor.ts at the same
// places — the caps and blossoms only where their tree or pebble stands (decor.ts freeOf); the
// fallen leaves lie flat and anywhere, like the flowers (owner 2026-11-19) —, faded in and out
// with the season (season.ts).

import { PEBBLES, TREES, crownOf, freeOf, pebbleSize, sizeOn, spotOn } from './decor.js';
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

// The season in play's decoration, the one before fading out while the new one fades in.
export function drawSeasonOn(
  ctx: CanvasRenderingContext2D,
  o: OnScreen,
  seasons: Seasons,
  nowMs: number,
): void {
  const fade = seasons.at(nowMs);
  if (fade.before !== fade.now) {
    drawSeasonDecor(ctx, o, { season: fade.before, alpha: 1 - fade.k, nowMs });
  }
  drawSeasonDecor(ctx, o, { season: fade.now, alpha: fade.k, nowMs });
}

function drawSeasonDecor(
  ctx: CanvasRenderingContext2D,
  o: OnScreen,
  { season, alpha, nowMs }: { season: number; alpha: number; nowMs: number },
): void {
  if (alpha <= 0) return;
  const t = ambientMs(nowMs) / 1000;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = look().ink;
  ctx.lineWidth = 1.2;
  if (season === 0) blossoms(ctx, o, t);
  if (season === 2) fallen(ctx, o);
  if (season === 3) snow(ctx, o, t);
  ctx.restore();
}

// Spring: pink and white blossoms on both crowns.
function blossoms(ctx: CanvasRenderingContext2D, o: OnScreen, t: number): void {
  for (const { i } of freeOf(o, TREES)) {
    const c = crownOf(o, i, t);
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

// Winter: a white band of snow inside the rim, caps on the crowns and the pebbles.
function snow(ctx: CanvasRenderingContext2D, o: OnScreen, t: number): void {
  ctx.save();
  outline(ctx, o, o.cy);
  ctx.clip();
  ctx.strokeStyle = SNOW;
  ctx.lineWidth = Math.max(6, o.ry * 0.12);
  outline(ctx, o, o.cy);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = SNOW;
  for (const { i } of freeOf(o, TREES)) {
    const c = crownOf(o, i, t);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - c.r * 0.45, c.r * 0.8, c.r * 0.5, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  const p = pebbleSize(o);
  for (const { p: spot } of freeOf(o, PEBBLES)) {
    const [x, y] = spotOn(o, spot);
    ctx.beginPath();
    ctx.ellipse(x, y - p * 0.2, p * 0.8, p * 0.4, 0, Math.PI, 0);
    ctx.fill();
  }
}
