// Seasonal Sumo — what grows on the island's top (Sky Island look, 2026-11-18): grass tufts, a
// few flowers, two small trees at the back, two pebbles, and at night three small lanterns with a
// warm halo — at fixed places in the ground's own units, so they scale with the arena and shrink
// with it at a halving; the tufts and the tree crowns sway a little (NIGHT 2026-11-19; still with
// reduced motion). Pure decoration: nothing here touches a ghost.

import type { OnScreen } from './island.js';
import { ambientMs } from './motion.js';
import { LANTERN, look } from './palette.js';

// Places on the top: (u, w) from -1 to 1 across and from back to front.
const TUFTS = [
  [-0.62, 0.1],
  [-0.4, -0.3],
  [-0.15, 0.45],
  [0.05, -0.55],
  [0.22, 0.2],
  [0.45, -0.1],
  [0.55, 0.5],
  [-0.48, 0.6],
  [0.75, 0.15],
  [-0.78, -0.2],
  [0.3, -0.7],
  [-0.05, 0.05],
] as const;
const FLOWERS = [
  [-0.3, 0.2],
  [0.15, -0.35],
  [0.62, -0.3],
  [-0.6, -0.45],
  [0.35, 0.65],
  [-0.2, -0.75],
] as const;
const PEBBLES = [
  [0.3, 0.45],
  [-0.38, 0.72],
] as const;
const LANTERNS = [
  [-0.75, 0.3],
  [0.05, -0.8],
  [0.78, -0.05],
] as const;
const TREES = [
  [-0.55, -0.55, 0],
  [0.6, -0.48, 1],
] as const;

export function drawDecor(ctx: CanvasRenderingContext2D, o: OnScreen, nowMs: number): void {
  const l = look();
  const t = ambientMs(nowMs) / 1000;
  const u = o.rx; // the decoration's unit
  const at = (p: readonly [number, number, ...unknown[]]): [number, number] => [
    o.cx + p[0] * o.rx * 0.82,
    o.cy + p[1] * o.ry * 0.82,
  ];
  const size = (k: number, min: number, max: number): number => Math.min(max, Math.max(min, u * k));
  ctx.lineCap = 'round';
  ctx.strokeStyle = l.tuft;
  ctx.lineWidth = 2;
  const tuft = size(0.035, 3, 10);
  ctx.beginPath();
  for (const p of TUFTS) {
    const [x, y] = at(p);
    const sway = Math.sin(t * 1.7 + p[0] * 4) * tuft * 0.3;
    for (const lean of [-0.6, 0, 0.6]) {
      ctx.moveTo(x + lean * tuft * 0.4, y);
      ctx.lineTo(x + lean * tuft + sway, y - tuft);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = 1.5;
  const petal = size(0.014, 2, 5);
  FLOWERS.forEach((p, i) => {
    const [x, y] = at(p);
    ctx.fillStyle = l.flowers[i % l.flowers.length] ?? l.cloud;
    ctx.beginPath();
    ctx.arc(x, y, petal, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.fillStyle = l.pebble;
  const pebble = size(0.03, 3, 9);
  for (const p of PEBBLES) {
    const [x, y] = at(p);
    ctx.beginPath();
    ctx.ellipse(x, y, pebble, pebble * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  trees(
    ctx,
    TREES.map((p) => [...at(p), p[2]]),
    size(0.085, 6, 26),
    t,
  );
  if (l.night) lanterns(ctx, LANTERNS.map(at), size(0.03, 3, 8));
}

// The two trees at (x, y) px with their crown colour's index, the crowns swaying a little (`t`
// seconds).
function trees(
  ctx: CanvasRenderingContext2D,
  places: readonly (readonly [number, number, 0 | 1])[],
  crown: number,
  t: number,
): void {
  const l = look();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = l.ink;
  for (const [x, y, k] of places) {
    ctx.fillStyle = l.roots;
    ctx.beginPath();
    ctx.rect(x - crown * 0.18, y - crown * 1.2, crown * 0.36, crown * 1.2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = l.crowns[k];
    ctx.beginPath();
    ctx.arc(x + Math.sin(t * 0.9 + k * 2) * crown * 0.07, y - crown * 1.55, crown, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

// Small lanterns on posts, each in a warm halo.
function lanterns(ctx: CanvasRenderingContext2D, places: [number, number][], r: number): void {
  const l = look();
  for (const [x, y] of places) {
    const lamp = { x, y: y - r * 3 };
    const halo = ctx.createRadialGradient(lamp.x, lamp.y, r * 0.5, lamp.x, lamp.y, r * 5);
    halo.addColorStop(0, 'rgba(255, 217, 138, 0.55)');
    halo.addColorStop(1, 'rgba(255, 217, 138, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, r * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = l.ink;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = l.roots;
    ctx.fillRect(x - r * 0.2, lamp.y, r * 0.4, r * 3);
    ctx.fillStyle = LANTERN;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
