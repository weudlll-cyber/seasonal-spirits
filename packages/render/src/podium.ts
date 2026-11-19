// Seasonal Sumo — the start and result screens' scenes in the Sky Island look (NIGHT 2026-11-19,
// piece 4): a floating island — on the start screen, over the whole screen, the game's own sky
// (ambient.ts: sun or moon, drifting clouds, far islands, the sea band; 2026-11-19) with the four
// seasons' characters idling on the island, on the result screen, in a small canvas, a podium
// with the best three teams' characters on their steps and a confetti burst in the winner's
// colour. The same sky, island (island.ts) and cached characters (sprites.ts) as the game; no
// second drawing path.

import { drawSky } from './ambient.js';
import { drawGround } from './island.js';
import { ambientMs } from './motion.js';
import { look, seasonColour } from './palette.js';
import { drawSprite } from './sprites.js';
import { VIEW_TILT, type View } from './view.js';

const CONFETTI_MS = 1600;
const CONFETTI = 26;

// A view of a unit island in the canvas: the island's centre at (0, 0), radius 1, with room
// above for the characters and below for the rock (ISLAND_DEPTH).
function islandView(ctx: CanvasRenderingContext2D): View {
  const { width, height } = ctx.canvas;
  const scale = Math.min(width * 0.44, height * 0.5);
  return { ctx, scale, tilt: VIEW_TILT, ox: width / 2, oy: height * 0.4, top: 0 };
}

// The idle bob of character `i` at `t` seconds.
const bob = (i: number, t: number): number => Math.sin(t * 2.4 + i * 1.3) * 2;

// The start screen over the whole screen: the game's sky, and below the title the island with the
// four seasons' characters idling on it, at most a phone's width wide.
export function drawStartScene(ctx: CanvasRenderingContext2D, nowMs: number): void {
  const { width, height } = ctx.canvas;
  drawSky(ctx, nowMs);
  const scale = Math.min(width * 0.36, height * 0.22, 170);
  const v: View = { ctx, scale, tilt: VIEW_TILT, ox: width / 2, oy: height * 0.52, top: 0 };
  drawGround(v, { x: 0, y: 0, r: 1, square: false });
  const t = ambientMs(nowMs) / 1000;
  const r = v.scale * 0.15;
  [0, 1, 2, 3].forEach((team, i) => {
    const x = v.ox + (i - 1.5) * v.scale * 0.42;
    const y = v.oy + (i % 2 ? 0.08 : -0.06) * v.scale - bob(i, t);
    drawSprite(ctx, { x, y, r, base: r, left: i >= 2 }, team, 'idle');
  });
}

// The result screen: the island with a podium — the winner on the middle step, second on the
// left, third on the right — and a confetti burst in the winner's colour for a moment after
// `sinceMs` (the result's first frame).
export function drawPodium(
  ctx: CanvasRenderingContext2D,
  teams: readonly number[],
  { nowMs, sinceMs }: { nowMs: number; sinceMs: number },
): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const v = islandView(ctx);
  drawGround(v, { x: 0, y: 0, r: 1, square: false });
  const l = look();
  const t = ambientMs(nowMs) / 1000;
  const r = v.scale * 0.16;
  const steps: [number, number][] = [
    [0, 0.42],
    [-0.45, 0.28],
    [0.45, 0.18],
  ];
  steps.forEach(([dx, tall], place) => {
    const team = teams[place];
    if (team === undefined) return;
    const x = v.ox + dx * v.scale;
    const w = v.scale * 0.36;
    const top = v.oy + v.scale * 0.1 - tall * v.scale;
    ctx.fillStyle = l.panel;
    ctx.strokeStyle = l.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.rect(x - w / 2, top, w, tall * v.scale);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = l.panelText;
    ctx.font = `600 ${String(Math.round(v.scale * 0.12))}px Fredoka, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(place + 1), x, top + tall * v.scale * 0.6);
    ctx.textAlign = 'start';
    drawSprite(
      ctx,
      { x, y: top - r * 1.25 - bob(place, t), r, base: r, left: false },
      team,
      'idle',
    );
  });
  const k = (nowMs - sinceMs) / CONFETTI_MS;
  if (k >= 0 && k < 1 && teams[0] !== undefined) confetti(ctx, v, seasonColour(teams[0]), k);
}

// The burst: small pieces flying up and out from above the winner, then falling, fading.
function confetti(ctx: CanvasRenderingContext2D, v: View, colour: string, k: number): void {
  const n = ctx.canvas.width < 300 ? CONFETTI / 2 : CONFETTI;
  ctx.globalAlpha = 1 - k * k;
  ctx.strokeStyle = look().ink;
  ctx.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + ((i / n) * 2 - 1) * 1.2;
    const speed = v.scale * (0.6 + ((i * 0.618) % 1) * 0.6);
    const x = v.ox + Math.cos(a) * speed * k;
    const y = v.oy - v.scale * 0.55 + Math.sin(a) * speed * k + v.scale * 0.9 * k * k;
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : colour;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(k * 8 + i);
    ctx.fillRect(-3, -1.5, 6, 3);
    ctx.strokeRect(-3, -1.5, 6, 3);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
