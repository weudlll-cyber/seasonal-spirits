// Seasonal Sumo — the sky's slow motion over its cached backdrop (NIGHT 2026-11-19, piece 2): the
// far clouds drifting and wrapping round (each cloud painted once, then copied), the sea's wave
// strokes moving along, the sun's ring turning (Light), the moon's soft glow and a few stars
// twinkling (Dark). A handful of copies and strokes per frame; frozen with reduced motion.
// drawSky is the whole sky: the backdrop, then this.

import { ambientMs } from './motion.js';
import { look, type Look } from './palette.js';
import { cloud, drawBackdrop, seaTop, starAt, sunOf } from './sky.js';

type Ctx = CanvasRenderingContext2D;

// The far clouds: where they start (share of width and height), their size and speed (px/s).
const CLOUDS = [
  [0.1, 0.3, 70, 6],
  [0.42, 0.22, 52, 9],
  [0.72, 0.42, 60, 5],
  [0.2, 0.62, 44, 8],
] as const;
const TWINKLES = 12; // the stars that twinkle, of the cached ones
const WAVE_STEP = 46; // px between two wave strokes
const WAVE_SPEED = 12; // px per second

// Each cloud size painted once into its own canvas for the current look.
const sprites = new Map<string, HTMLCanvasElement>();

function cloudSprite(size: number, l: Look): HTMLCanvasElement {
  const key = `${String(Math.round(size))}|${l.cloud}`;
  const found = sprites.get(key);
  if (found) return found;
  if (sprites.size > 16) sprites.clear(); // bounded: a few sizes per look
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(size * 2.2 + 8);
  canvas.height = Math.ceil(size * 1.3 + 8);
  const ctx = canvas.getContext('2d');
  if (ctx) cloud(ctx, [canvas.width / 2, canvas.height * 0.55, size], l.cloud);
  sprites.set(key, canvas);
  return canvas;
}

export function drawSky(ctx: Ctx, nowMs: number): void {
  drawBackdrop(ctx);
  const { width: w, height: h } = ctx.canvas;
  const l = look();
  const t = ambientMs(nowMs) / 1000;
  const u = Math.min(w, h) / 800;
  if (l.night) nightGlow(ctx, { w, h, u }, t, l);
  else sunRing(ctx, { ...sunOf(w, h), u, t }, l);
  for (const [fx, fy, size, speed] of CLOUDS) {
    const img = cloudSprite(size * u, l);
    const span = w + img.width;
    const x = ((((fx * w + speed * t) % span) + span) % span) - img.width;
    ctx.drawImage(img, x, fy * h - img.height * 0.55);
  }
  waves(ctx, { w, h }, t, l);
}

// The sun's ring as dashes turning slowly round it (`u` the backdrop's unit, `t` seconds).
function sunRing(
  ctx: Ctx,
  { x, y, r, u, t }: { x: number; y: number; r: number; u: number; t: number },
  l: Look,
): void {
  ctx.lineWidth = 10 * u;
  ctx.strokeStyle = l.sunRing;
  ctx.setLineDash([16 * u, 9 * u]);
  ctx.lineDashOffset = -t * 10 * u;
  ctx.beginPath();
  ctx.arc(x, y, r + 14 * u, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

// The moon's soft glow breathing, and a few stars twinkling over the cached ones.
function nightGlow(
  ctx: Ctx,
  { w, h, u }: { w: number; h: number; u: number },
  t: number,
  l: Look,
): void {
  const moon = sunOf(w, h);
  const glow = ctx.createRadialGradient(moon.x, moon.y, moon.r * 0.9, moon.x, moon.y, moon.r * 2.4);
  const a = 0.16 + 0.06 * Math.sin(t * 1.3);
  glow.addColorStop(0, `rgba(255, 243, 196, ${a.toFixed(3)})`);
  glow.addColorStop(1, 'rgba(255, 243, 196, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = l.cloud;
  for (let i = 0; i < TWINKLES; i++) {
    const k = i * 5 + 2; // every fifth star
    const [x, y] = starAt(k, w, h);
    ctx.globalAlpha = Math.max(0, Math.sin(t * (1.1 + (i % 4) * 0.4) + i * 1.7));
    ctx.beginPath();
    ctx.arc(x, y, 2.2 * Math.max(1, u), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// The sea's wave strokes, three rows moving along at slightly different speeds.
function waves(ctx: Ctx, { w, h }: { w: number; h: number }, t: number, l: Look): void {
  const sea = seaTop(h);
  ctx.strokeStyle = l.wave;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let row = 0; row < 3; row++) {
    const y = sea + ((h - sea) * (row + 1)) / 4;
    const shift = (row % 2) * (WAVE_STEP / 2) + ((t * WAVE_SPEED * (1 + row * 0.3)) % WAVE_STEP);
    for (let x = shift - WAVE_STEP; x < w; x += WAVE_STEP) {
      ctx.moveTo(x + 9 + 9 * Math.cos(Math.PI * 1.15), y + 5 + 9 * Math.sin(Math.PI * 1.15));
      ctx.arc(x + 9, y + 5, 9, Math.PI * 1.15, Math.PI * 1.85);
    }
  }
  ctx.stroke();
}
