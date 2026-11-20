// Seasonal Sumo — a character falling off the island (Sky Island look, 2026-11-18): it tips over
// the edge, turns head-down with an open "o" mouth, drops towards the sea below with three white
// speed streaks and a short "Aaah!" bubble, and lands in a splash on the sea band — a white crown
// with a ring widening round it — all within the match's fall time (fallMs; `t` 0 … 1 from
// trails.ts). It keeps the size of a standing character (planner 2026-11-20). Which characters
// are off the island, and which of those at its back — drawn behind the island's body, hidden by
// it — offIsland and offBack say (ghosts.ts, field.ts).

import { GHOST_FALLING, type GhostState, type WireDisc } from '@seasonal-spirits/protocol';
import { inkWidth } from './character.js';
import { look } from './palette.js';
import { seaTop } from './sky.js';
import { drawSprite } from './sprites.js';
import { pill } from './pill.js';

const TIP = 0.2; // the share of the fall spent tipping over the edge
const SPLASH = 0.85; // from here on the splash shows

// Off Sumo's island (`island` its top, null in the walled modes): falling, or beyond its edge —
// in the air there after a jump, over nothing (review 2026-11-20: such a one was drawn large with
// its shadow in the sky).
export function offIsland(g: GhostState, island: WireDisc | null): boolean {
  if (!island) return false;
  return (g.flags & GHOST_FALLING) !== 0 || Math.hypot(g.x - island.x, g.y - island.y) > island.r;
}

// Off the island at its back: further behind its middle than to either side, so the island's
// body hides it (planner 2026-11-20); off the sides or the front it stays in front.
export function offBack(g: GhostState, island: WireDisc | null): boolean {
  if (!island || !offIsland(g, island)) return false;
  return island.y - g.y > Math.abs(g.x - island.x);
}

// The falling character at its place on screen (x, y px, body radius r px).
export function drawFall(
  ctx: CanvasRenderingContext2D,
  at: { x: number; y: number; r: number; team: number; left: boolean },
  t: number,
): void {
  const sea = seaTop(ctx.canvas.height);
  const drop = t <= TIP ? 0 : ((t - TIP) / (1 - TIP)) ** 2;
  const y = at.y + (sea - at.y) * drop;
  const r = at.r;
  const turn = Math.min(1, t / TIP) * Math.PI; // head-down after the tip
  const l = look();
  if (t < SPLASH) {
    ctx.save();
    ctx.translate(at.x, y);
    ctx.rotate(at.left ? -turn : turn);
    drawSprite(ctx, { x: 0, y: 0, r, base: at.r, left: at.left }, at.team, 'falling');
    ctx.restore();
    if (drop > 0) streaks(ctx, at.x, y - r * 1.6, r);
    if (t > 0.08 && t < 0.6)
      pill(ctx, {
        x: at.x + r * 1.6,
        y: y - r * 1.4,
        text: 'Aaah!',
        font: 'bold 12px Fredoka, system-ui, sans-serif',
      });
  }
  if (t >= SPLASH) splash(ctx, { x: at.x, sea, r: at.r }, (t - SPLASH) / (1 - SPLASH));
  ctx.globalAlpha = 1;
  ctx.strokeStyle = l.ink;
}

// Three white streaks above a falling character.
function streaks(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const l = look();
  ctx.lineCap = 'round';
  for (const [colour, width] of [
    [l.ink, 5],
    [l.puff, 2.5],
  ] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const dx of [-0.6, 0, 0.6]) {
      ctx.moveTo(x + dx * r, y - Math.abs(dx) * r * 0.4);
      ctx.lineTo(x + dx * r, y - r * 1.4 - Math.abs(dx) * r * 0.4);
    }
    ctx.stroke();
  }
}

// The splash on the sea band, `t` 0 … 1 into it (NIGHT 2026-11-19): a white crown of water rising
// and sinking back, and a ring widening on the sea round it.
function splash(
  ctx: CanvasRenderingContext2D,
  { x, sea, r }: { x: number; sea: number; r: number },
  t: number,
): void {
  const l = look();
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = inkWidth(r) * 0.7;
  // The ring on the sea, lying flat.
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = l.puff;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(x, sea + 8, r * (0.9 + 2.2 * t), r * (0.3 + 0.6 * t), 0, 0, Math.PI * 2);
  ctx.stroke();
  // The crown: five spikes up from a base, highest in the middle of the splash.
  const rise = Math.sin(Math.PI * Math.min(1, t * 1.3)) * r * 1.6;
  const half = r * (0.7 + 0.4 * t);
  ctx.fillStyle = l.puff;
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = inkWidth(r) * 0.7;
  ctx.beginPath();
  ctx.moveTo(x - half, sea + 6);
  for (let i = 0; i <= 4; i++) {
    const px = x - half + (i / 4) * 2 * half;
    const tip = rise * (i === 2 ? 1 : i % 2 ? 0.75 : 0.55);
    ctx.lineTo(px - half * 0.12, sea + 2 - tip * 0.35);
    ctx.lineTo(px, sea + 2 - tip);
    ctx.lineTo(px + half * 0.12, sea + 2 - tip * 0.35);
  }
  ctx.lineTo(x + half, sea + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
}
