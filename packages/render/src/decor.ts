// Seasonal Sumo — what grows on the island's top (Sky Island look, 2026-11-18): grass tufts, a
// few flowers, two small trees at the back, two pebbles, and at night three small lanterns with a
// warm halo — at fixed places in the ground's own units, so they scale with the arena and shrink
// with it at a halving; the tufts and the tree crowns sway a little (NIGHT 2026-11-19; still with
// reduced motion). No tree, pebble or lantern stands in the ground's keep-out (King's zones and
// where they can jump, 2026-11-19); tufts, flowers and the lanterns' halos lie flat and grow
// anywhere (owner 2026-11-19: King's field had almost none left) and are drawn with the ground
// (drawGroundDecor); each tree, pebble and lantern stands in the depth order with the characters
// (standing.ts). Pure decoration: nothing here touches a ghost.

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
export const FLOWERS = [
  [-0.3, 0.2],
  [0.15, -0.35],
  [0.62, -0.3],
  [-0.6, -0.45],
  [0.35, 0.65],
  [-0.2, -0.75],
] as const;
export const PEBBLES = [
  [0.3, 0.45],
  [-0.38, 0.72],
] as const;
export const LANTERNS = [
  [-0.75, 0.3],
  [0.05, -0.8],
  [0.78, -0.05],
] as const;
export const TREES = [
  [-0.55, -0.55, 0],
  [0.6, -0.48, 1],
] as const;

// A place (u, w) on the top in pixels.
export function spotOn(o: OnScreen, p: readonly [number, number, ...unknown[]]): [number, number] {
  return [o.cx + p[0] * o.rx * 0.82, o.cy + p[1] * o.ry * 0.82];
}

// Whether a place (u, w) is clear of the ground's keep-out (OnScreen.keepOut).
function standsFree(o: OnScreen, p: readonly [number, number, ...unknown[]]): boolean {
  const [x, y] = spotOn(o, p);
  return (o.keepOut ?? []).every((e) => ((x - e.x) / e.rx) ** 2 + ((y - e.y) / e.ry) ** 2 > 1);
}

// The places of `list` clear of the keep-out, with their index in it.
export function freeOf<T extends readonly [number, number, ...unknown[]]>(
  o: OnScreen,
  list: readonly T[],
): { p: T; i: number }[] {
  return list.map((p, i) => ({ p, i })).filter(({ p }) => standsFree(o, p));
}

// A decoration's size: `k` of the ground's half width, between `min` and `max` px.
export function sizeOn(o: OnScreen, k: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, o.rx * k));
}

export const pebbleSize = (o: OnScreen): number => sizeOn(o, 0.03, 3, 9);
export const lanternSize = (o: OnScreen): number => sizeOn(o, 0.03, 3, 8);

// Tree `i`'s crown on screen: centre and radius, swaying a little (`t` seconds).
export function crownOf(o: OnScreen, i: number, t: number): { x: number; y: number; r: number } {
  const tree = TREES[i] ?? TREES[0];
  const r = sizeOn(o, 0.085, 6, 26);
  const [x, y] = spotOn(o, tree);
  return { x: x + Math.sin(t * 0.9 + tree[2] * 2) * r * 0.07, y: y - r * 1.55, r };
}

// What lies flat on the top, under everything that stands: the tufts, the flowers and, at night,
// the lanterns' halos.
export function drawGroundDecor(ctx: CanvasRenderingContext2D, o: OnScreen, nowMs: number): void {
  const l = look();
  const t = ambientMs(nowMs) / 1000;
  ctx.lineCap = 'round';
  ctx.strokeStyle = l.tuft;
  ctx.lineWidth = 2;
  const tuft = sizeOn(o, 0.035, 3, 10);
  ctx.beginPath();
  for (const p of TUFTS) {
    const [x, y] = spotOn(o, p);
    const sway = Math.sin(t * 1.7 + p[0] * 4) * tuft * 0.3;
    for (const lean of [-0.6, 0, 0.6]) {
      ctx.moveTo(x + lean * tuft * 0.4, y);
      ctx.lineTo(x + lean * tuft + sway, y - tuft);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = 1.5;
  const petal = sizeOn(o, 0.014, 2, 5);
  FLOWERS.forEach((p, i) => {
    const [x, y] = spotOn(o, p);
    ctx.fillStyle = l.flowers[i % l.flowers.length] ?? l.cloud;
    ctx.beginPath();
    ctx.arc(x, y, petal, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  if (!l.night) return;
  const r = lanternSize(o);
  for (const { p } of freeOf(o, LANTERNS)) {
    const [x, y] = spotOn(o, p);
    const lamp = { x, y: y - r * 3 };
    const halo = ctx.createRadialGradient(lamp.x, lamp.y, r * 0.5, lamp.x, lamp.y, r * 5);
    halo.addColorStop(0, 'rgba(255, 217, 138, 0.55)');
    halo.addColorStop(1, 'rgba(255, 217, 138, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, r * 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Pebble at `p`, ink-outlined.
export function drawPebble(
  ctx: CanvasRenderingContext2D,
  o: OnScreen,
  p: readonly [number, number],
): void {
  const l = look();
  const s = pebbleSize(o);
  const [x, y] = spotOn(o, p);
  ctx.fillStyle = l.pebble;
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// Tree `i`, its crown swaying a little (`t` seconds).
export function drawTree(ctx: CanvasRenderingContext2D, o: OnScreen, i: number, t: number): void {
  const l = look();
  const tree = TREES[i] ?? TREES[0];
  const [x, y] = spotOn(o, tree);
  const crown = crownOf(o, i, t);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = l.ink;
  ctx.fillStyle = l.roots;
  ctx.beginPath();
  ctx.rect(x - crown.r * 0.18, y - crown.r * 1.2, crown.r * 0.36, crown.r * 1.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = l.crowns[tree[2]];
  ctx.beginPath();
  ctx.arc(crown.x, crown.y, crown.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// A small lantern on its post standing at (x, y), `r` the lamp's radius (its halo lies with the
// ground, drawGroundDecor).
export function drawLantern(
  ctx: CanvasRenderingContext2D,
  [x, y]: [number, number],
  r: number,
): void {
  const l = look();
  const lampY = y - r * 3;
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = l.roots;
  ctx.fillRect(x - r * 0.2, lampY, r * 0.4, r * 3);
  ctx.fillStyle = LANTERN;
  ctx.beginPath();
  ctx.arc(x, lampY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
