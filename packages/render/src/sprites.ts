// Seasonal Sumo — the characters drawn once and then copied (Sky Island look, 2026-11-18): each
// team's character in each pose is painted into an offscreen canvas at the size the view needs
// (character.ts), and every frame only copies those, so 32 characters stay cheap. A new size —
// a resize, a halving's camera — or a new look paints the set again. The own character's
// set wears a soft white glow round its outline (owner 2026-11-20), painted in once, so it costs
// nothing per frame. Where there is no document (the unit tests) the character is drawn straight
// onto the canvas instead, without the glow.

import { REACH, drawCharacter, inkWidth, type Pose } from './character.js';
import { look } from './palette.js';

// The sprites are painted this much larger than the body on the ground, so a character at the
// top of its jump (1.5×) or a carrier's pulse stays sharp.
const DETAIL = 1.5;
const GLOW_PX = 3; // the own character's glow outside its outline, on screen

interface Sheet {
  key: string; // the size and the look painted
  sprites: Map<string, HTMLCanvasElement>;
}

let sheet: Sheet = { key: '', sprites: new Map() };

// The sprite's box round the body's centre, in pixels for a body of radius `r`, room for the glow
// when it wears one.
function box(
  r: number,
  glow: boolean,
): { left: number; top: number; width: number; height: number } {
  const pad = inkWidth(r) + 1 + (glow ? 2 * GLOW_PX * DETAIL : 0);
  return {
    left: r * REACH.side + pad,
    top: r * REACH.top + pad,
    width: 2 * (r * REACH.side + pad),
    height: r * (REACH.top + REACH.bottom) + 2 * pad,
  };
}

function sprite(team: number, pose: Pose, r: number, glow: boolean): HTMLCanvasElement {
  const key = `${String(Math.round(r * 2))}|${look().ink}|${look().feet.join()}`;
  if (sheet.key !== key) sheet = { key, sprites: new Map() }; // bounded: 4 teams × 5 poses × glow or not
  const name = `${String(team & 3)}|${pose}|${String(glow)}`;
  const found = sheet.sprites.get(name);
  if (found) return found;
  const big = r * DETAIL;
  const b = box(big, glow);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(b.width);
  canvas.height = Math.ceil(b.height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.translate(b.left, b.top);
    if (glow) {
      // Painted once with a white shadow, then clean over it: only the shadow outside stays.
      ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
      ctx.shadowBlur = GLOW_PX * DETAIL * 2;
      drawCharacter(ctx, team, pose, big);
      drawCharacter(ctx, team, pose, big);
      ctx.shadowColor = 'transparent';
    }
    drawCharacter(ctx, team, pose, big);
  }
  sheet.sprites.set(name, canvas);
  return canvas;
}

// The character of `team` in `pose` with its body's centre at (x, y) px and radius `r` px;
// `base` is the radius on the ground the sprites are painted for; mirrored when it faces left;
// `squash` widens it (above 1) or stretches it upright (below 1), its feet staying where they
// stand (moments.ts); `glow`: the own character's glow round it.
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  at: {
    x: number;
    y: number;
    r: number;
    base: number;
    left: boolean;
    squash?: number;
    glow?: boolean;
  },
  team: number,
  pose: Pose,
): void {
  const k = at.squash ?? 1;
  ctx.save();
  ctx.translate(at.x, at.y + at.r * REACH.bottom * (1 - 1 / k));
  ctx.scale(at.left ? -k : k, 1 / k);
  if (typeof document === 'undefined') {
    drawCharacter(ctx, team, pose, at.r);
  } else {
    const glow = at.glow ?? false;
    const img = sprite(team, pose, at.base, glow);
    const f = at.r / (at.base * DETAIL);
    const b = box(at.base * DETAIL, glow);
    ctx.drawImage(img, -b.left * f, -b.top * f, img.width * f, img.height * f);
  }
  ctx.restore();
}
