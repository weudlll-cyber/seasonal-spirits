// Seasonal Sumo — the walled modes' low wooden fence as standing pieces: each post and rail on its
// own ground y in the depth order with the characters (standing.ts); its height goes with them.

import { ghostRadiusPx } from './reach.js';
import { look } from './palette.js';
import type { Standing } from './standing.js';
import { sx, sy, type Box, type View } from './view.js';

// A post's height in a character's body radius: the top rail (RAILS) at about a third of a
// character's drawn height, so the near fence hides only the feet of one right behind it.
export const POST_RISE = 1;
const RAILS = [0.45, 0.85]; // the rails' heights, in the post's
const POSTS = 8; // per wall
const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const; // the walls run back, right, near, left between them

// The fence round `box` (the walls' square), piece by piece.
export function fencePieces(v: View, box: Box): Standing[] {
  const post = POST_RISE * ghostRadiusPx(v); // px tall
  const at = (wall: number, k: number): [number, number] => {
    const a = CORNERS[wall % 4] ?? CORNERS[0];
    const b = CORNERS[(wall + 1) % 4] ?? CORNERS[0];
    const t = k / POSTS;
    return [
      sx(v, box.x + box.half * (a[0] + (b[0] - a[0]) * t)),
      sy(v, box.y + box.half * (a[1] + (b[1] - a[1]) * t)),
    ];
  };
  const pieces: Standing[] = [];
  for (let wall = 0; wall < 4; wall++) {
    for (let k = 0; k < POSTS; k++) {
      const from = at(wall, k);
      const to = at(wall, k + 1);
      // A rail stands at its middle: on a side wall it is behind a character nearer the front.
      pieces.push({
        y: (from[1] + to[1]) / 2,
        draw: () => {
          rails(v.ctx, from, to, post);
        },
      });
    }
  }
  // The posts after the rails: on the back and near walls a post and its rails share one y, and
  // the sort keeps their order (view.ts byDepth), so each post stands over its rails' ends.
  for (let wall = 0; wall < 4; wall++) {
    for (let k = 0; k < POSTS; k++) {
      const [x, y] = at(wall, k);
      pieces.push({
        y,
        draw: () => {
          postAt(v.ctx, x, y, post);
        },
      });
    }
  }
  return pieces;
}

// The two rails between two posts' feet, `post` px tall.
function rails(
  ctx: CanvasRenderingContext2D,
  [x0, y0]: [number, number],
  [x1, y1]: [number, number],
  post: number,
): void {
  const l = look();
  ctx.lineCap = 'round';
  for (const height of RAILS) {
    for (const [colour, width] of [
      [l.ink, 6],
      [l.roots, 3],
    ] as const) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x0, y0 - post * height);
      ctx.lineTo(x1, y1 - post * height);
      ctx.stroke();
    }
  }
}

function postAt(ctx: CanvasRenderingContext2D, x: number, y: number, post: number): void {
  const l = look();
  ctx.fillStyle = l.roots;
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(x - 2.5, y - post, 5, post);
  ctx.fill();
  ctx.stroke();
}
