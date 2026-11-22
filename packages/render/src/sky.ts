// Seasonal Sumo — the sky around the island (Sky Island look, 2026-11-18): the sky, a sun top
// right (at night a crescent moon and stars), two or three small far islands, the sea band at
// the bottom, and two big clouds low in front. Drawn once per canvas size and look into offscreen
// canvases (the frame only copies them); what moves over it — the far clouds, the waves, the
// sun's ring, the moon's glow, twinkling stars — is ambient.ts (NIGHT 2026-11-19).

import { look, type Look } from './palette.js';

const OUTLINE = 3; // px of ink round every shape

// The sea band's top edge on a canvas `height` px tall: a fall off the island ends there.
export function seaTop(height: number): number {
  return height - Math.max(40, Math.round(height * 0.13));
}

type Ctx = CanvasRenderingContext2D;

// Shapes made of overlapping circles with one ink outline round all of them: every circle's ink
// first, then every fill over it, so only the outer edge stays inked.
function blobs(
  ctx: Ctx,
  circles: readonly (readonly [number, number, number])[],
  fill: string,
): void {
  const ink = look().ink;
  for (const pass of ['ink', 'fill'] as const) {
    ctx.fillStyle = pass === 'ink' ? ink : fill;
    for (const [x, y, r] of circles) {
      ctx.beginPath();
      ctx.arc(x, y, pass === 'ink' ? r + OUTLINE : r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// A soft cloud at (x, y), `s` px across its middle puff.
export function cloud(ctx: Ctx, [x, y, s]: readonly [number, number, number], fill: string): void {
  blobs(
    ctx,
    [
      [x - s * 0.55, y + s * 0.12, s * 0.38],
      [x, y - s * 0.08, s * 0.5],
      [x + s * 0.55, y + s * 0.15, s * 0.34],
    ],
    fill,
  );
}

// A small far island at (x, y), `s` px across.
function farIsland(ctx: Ctx, [x, y, s]: readonly [number, number, number], l: Look): void {
  ctx.lineWidth = OUTLINE - 1;
  ctx.strokeStyle = l.ink;
  ctx.fillStyle = l.farUnder;
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.lineTo(x - s * 0.2, y + s * 0.9);
  ctx.lineTo(x + s * 0.1, y + s * 0.55);
  ctx.lineTo(x + s * 0.35, y + s * 0.75);
  ctx.lineTo(x + s, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = l.farTop;
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// The `i`th star of the night sky on a `w` × `h` canvas: a fixed scatter (golden-ratio steps),
// the same on every size.
export function starAt(i: number, w: number, h: number): [number, number] {
  return [((i * 0.618034) % 1) * w, ((i * 0.381966 * 1.7) % 1) * seaTop(h) * 0.9];
}

// The sun's place and size (at night the moon's), top right below the bar and the band (on a
// phone it stood behind the band, NIGHT 2026-11-19).
export function sunOf(w: number, h: number): { x: number; y: number; r: number } {
  const u = Math.min(w, h) / 800;
  return { x: w - 90 * u - 20, y: Math.max(190 * u, 140), r: 38 * u };
}

// The night sky: small white stars at fixed places and a crescent moon where the sun stands.
function night(
  ctx: Ctx,
  { w, h, u }: { w: number; h: number; u: number },
  moon: { x: number; y: number; r: number },
  l: Look,
): void {
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 70; i++) {
    const [x, y] = starAt(i, w, h);
    ctx.globalAlpha = 0.45 + 0.5 * ((i * 0.7548) % 1);
    ctx.beginPath();
    ctx.arc(x, y, (i % 3 === 0 ? 1.8 : 1.1) * Math.max(1, u), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
  ctx.arc(moon.x + moon.r * 0.45, moon.y - moon.r * 0.2, moon.r * 0.82, 0, Math.PI * 2, true);
  ctx.fillStyle = l.sun;
  ctx.fill('evenodd');
}

function drawBack(ctx: Ctx, w: number, h: number, l: Look): void {
  const u = Math.min(w, h) / 800; // the backdrop's unit: 1 on an 800 px screen
  ctx.fillStyle = l.sky;
  ctx.fillRect(0, 0, w, h);
  // The sun (at night the moon and the stars); its turning ring is ambient.ts.
  const sun = sunOf(w, h);
  if (l.night) night(ctx, { w, h, u }, sun, l);
  else {
    ctx.fillStyle = l.sun;
    ctx.lineWidth = OUTLINE;
    ctx.strokeStyle = l.ink;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  farIsland(ctx, [0.08 * w, 0.48 * h, 34 * u], l);
  farIsland(ctx, [0.9 * w, 0.62 * h, 26 * u], l);
  farIsland(ctx, [0.62 * w, 0.18 * h + 40 * u, 18 * u], l);
  // The sea band (its waves: ambient.ts).
  const sea = seaTop(h);
  ctx.fillStyle = l.sea;
  ctx.fillRect(0, sea, w, h - sea);
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = OUTLINE;
  ctx.beginPath();
  ctx.moveTo(0, sea);
  ctx.lineTo(w, sea);
  ctx.stroke();
}

function drawFront(ctx: Ctx, w: number, h: number, l: Look): void {
  const u = Math.min(w, h) / 800;
  const sea = seaTop(h);
  cloud(ctx, [0.1 * w, sea + 30 * u, 120 * u], l.cloud);
  cloud(ctx, [0.88 * w, sea + 40 * u, 140 * u], l.cloud);
}

interface Layer {
  key: string;
  canvas: HTMLCanvasElement;
}

// One offscreen canvas per layer, redrawn when the size or the look changes.
function layer(
  cache: { current: Layer | null },
  w: number,
  h: number,
  paint: (ctx: Ctx, w: number, h: number, l: Look) => void,
): HTMLCanvasElement {
  const l = look();
  const key = `${String(w)}x${String(h)}|${l.sky}`;
  if (cache.current?.key === key) return cache.current.canvas;
  const canvas = cache.current?.canvas ?? document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx, w, h, l);
  cache.current = { key, canvas };
  return canvas;
}

const back = { current: null as Layer | null };
const front = { current: null as Layer | null };

// A canvas without a size (a window not laid out yet, an embed at 0 height) shows nothing, and
// the browser's drawImage throws on an empty layer — which ended the client's frame loop for
// good (day chain 2026-11-22 piece 2). So nothing is drawn until the canvas has a size.
function drawLayer(
  ctx: Ctx,
  cache: { current: Layer | null },
  paint: (ctx: Ctx, w: number, h: number, l: Look) => void,
): void {
  const { width, height } = ctx.canvas;
  if (width === 0 || height === 0) return;
  ctx.drawImage(layer(cache, width, height, paint), 0, 0);
}

// The whole canvas: the sky, the sun or the moon and the stars, the far islands, the sea.
export function drawBackdrop(ctx: Ctx): void {
  drawLayer(ctx, back, drawBack);
}

// The two big clouds low in front of the sea, over the island's rock.
export function drawFrontClouds(ctx: Ctx): void {
  drawLayer(ctx, front, drawFront);
}
