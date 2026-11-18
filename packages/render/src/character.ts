// Seasonal Sumo — one character of the Sky Island look (owner's choice 2026-11-18), drawn round
// its body's centre: a bean body in the team's colour with an ink outline, two oval feet, short
// arms, a lighter belly, big eyes, pink cheeks, a small smile and its season's hat (spring a
// crown of flowers, summer a straw sun hat and sunglasses, autumn a rust beanie with a leaf,
// winter a wool hat with a pompom). Pure drawing on any context; sprites.ts caches it.

import { look, seasonColour } from './palette.js';

export type Pose = 'idle' | 'stepA' | 'stepB' | 'falling';

// How far the drawing reaches from the body's centre, in body radii: the hat's top, the feet's
// bottom, the arms' sides.
export const REACH = { top: 1.5, bottom: 1.2, side: 1.3 } as const;

const BELLY = 'rgba(255, 255, 255, 0.33)';
const CHEEK = 'rgba(255, 122, 168, 0.33)';
const HATS = {
  flower: ['#ff8fb1', '#ffffff', '#ff8fb1'],
  centre: '#ffd23f',
  straw: '#ffe08a',
  band: '#e8505b',
  beanie: '#b8461a',
  leaf: '#7fae3a',
  wool: '#ffffff',
} as const;

type Ctx = CanvasRenderingContext2D;

// An ellipse at (x, y) with radii (rx, ry), filled and outlined in the current ink.
function oval(
  ctx: Ctx,
  [x, y, rx, ry]: readonly [number, number, number, number],
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// The ink line's width for a body of radius `r` px: bold on a desktop, thin on a small phone.
export const inkWidth = (r: number): number => Math.min(3, Math.max(1.2, r * 0.16));

export function drawCharacter(ctx: Ctx, team: number, pose: Pose, r: number): void {
  const l = look();
  const colour = seasonColour(team);
  ctx.lineWidth = inkWidth(r);
  ctx.strokeStyle = l.ink;
  ctx.lineJoin = 'round';
  // Feet and arms behind the body.
  const lift = pose === 'stepA' ? -0.16 : pose === 'stepB' ? 0.16 : 0;
  for (const side of [-1, 1]) {
    const foot = [side * 0.45 * r, (0.95 + side * lift) * r, 0.34 * r, 0.21 * r] as const;
    oval(ctx, foot, l.feet[team & 3] ?? colour);
    const up = pose === 'falling' ? -0.75 : 0.1;
    oval(ctx, [side * 0.98 * r, up * r, 0.2 * r, 0.3 * r], colour);
  }
  oval(ctx, [0, 0, r, r * 1.04], colour);
  ctx.save();
  ctx.lineWidth = 0;
  ctx.fillStyle = BELLY;
  ctx.beginPath();
  ctx.ellipse(0, 0.38 * r, 0.56 * r, 0.44 * r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CHEEK;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 0.62 * r, 0.14 * r, 0.15 * r, 0.1 * r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  face(ctx, team, pose, r);
  hat(ctx, team, r);
}

function face(ctx: Ctx, team: number, pose: Pose, r: number): void {
  const ink = look().ink;
  ctx.lineWidth = Math.max(1, inkWidth(r) * 0.6);
  if ((team & 3) === 1) {
    // Summer: dark sunglasses instead of the eyes.
    ctx.fillStyle = ink;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 0.34 * r, -0.16 * r, 0.27 * r, 0.2 * r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-0.1 * r, -0.2 * r);
    ctx.lineTo(0.1 * r, -0.2 * r);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 0.34 * r - 0.1 * r, -0.22 * r, 0.05 * r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (const side of [-1, 1]) {
      oval(ctx, [side * 0.33 * r, -0.2 * r, 0.24 * r, 0.3 * r], '#ffffff');
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(side * 0.33 * r + 0.05 * r, -0.14 * r, 0.13 * r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(side * 0.33 * r + 0.1 * r, -0.2 * r, 0.05 * r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = ink;
  ctx.beginPath();
  if (pose === 'falling') {
    // An open "o".
    ctx.fillStyle = ink;
    ctx.ellipse(0, 0.3 * r, 0.12 * r, 0.15 * r, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.arc(0, 0.12 * r, 0.18 * r, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
}

// The dome of a beanie or a wool hat over the head's top.
function dome(ctx: Ctx, r: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-0.95 * r, -0.42 * r);
  ctx.bezierCurveTo(-0.95 * r, -1.35 * r, 0.95 * r, -1.35 * r, 0.95 * r, -0.42 * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function hat(ctx: Ctx, team: number, r: number): void {
  ctx.lineWidth = inkWidth(r) * 0.8;
  const season = team & 3;
  if (season === 0) {
    HATS.flower.forEach((petal, i) => {
      const x = (i - 1) * 0.36 * r;
      const y = (i === 1 ? -1.18 : -1.02) * r;
      oval(ctx, [x, y, 0.2 * r, 0.2 * r], petal);
      ctx.fillStyle = HATS.centre;
      ctx.beginPath();
      ctx.arc(x, y, 0.08 * r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (season === 1) {
    oval(ctx, [0, -0.82 * r, 1.12 * r, 0.24 * r], HATS.straw);
    ctx.fillStyle = HATS.straw;
    ctx.beginPath();
    ctx.ellipse(0, -0.86 * r, 0.56 * r, 0.5 * r, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = HATS.band;
    ctx.fillRect(-0.55 * r, -1.0 * r, 1.1 * r, 0.14 * r);
  } else if (season === 2) {
    dome(ctx, r, HATS.beanie);
    ctx.fillStyle = HATS.leaf;
    ctx.beginPath();
    ctx.ellipse(0.18 * r, -1.22 * r, 0.12 * r, 0.24 * r, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    dome(ctx, r, HATS.wool);
    ctx.fillStyle = HATS.band;
    ctx.fillRect(-0.9 * r, -0.66 * r, 1.8 * r, 0.16 * r);
    oval(ctx, [0, -1.2 * r, 0.2 * r, 0.2 * r], HATS.band);
  }
}
