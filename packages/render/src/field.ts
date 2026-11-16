// Seasonal Sumo — the field and the arena: a dark void around a disc in the middle, the disc
// in the season's ground colour with a glowing edge in the season's colour; during the
// countdown before a halving the edge after it shows as a dashed ring (the server sends both
// radii, protocol state.ts).

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import { STATE_TO_END, type ServerState } from '@seasonal-spirits/protocol';
import { LINE, ground, seasonColour } from './palette.js';
import { FIELD, circle, type View } from './view.js';

const CENTRE = DEFAULT_CONFIG.fieldSize / 2;
const GRID = 250; // field units between the faint ground lines on the arena
const VOID = '#020305';

export function drawField(v: View, s: ServerState | undefined): void {
  const { ctx } = v;
  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const season = s?.season ?? 0;
  const r = (s?.arenaRadius ?? DEFAULT_CONFIG.arenaRadius) * v.scale;
  // The disc, with the ground lines clipped to it.
  ctx.save();
  circle(v, CENTRE, CENTRE, r);
  ctx.fillStyle = ground(season);
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let u = GRID; u < FIELD; u += GRID) {
    ctx.moveTo(v.ox + u * v.scale, v.oy);
    ctx.lineTo(v.ox + u * v.scale, v.oy + FIELD * v.scale);
    ctx.moveTo(v.ox, v.oy + u * v.scale);
    ctx.lineTo(v.ox + FIELD * v.scale, v.oy + u * v.scale);
  }
  ctx.stroke();
  ctx.restore();
  // The glowing edge.
  const colour = seasonColour(season);
  circle(v, CENTRE, CENTRE, r);
  ctx.strokeStyle = colour;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // The coming edge, in the countdown before a halving (not before the match end).
  if (s && s.countdownMs !== null && !(s.flags & STATE_TO_END)) {
    circle(v, CENTRE, CENTRE, s.arenaNext * v.scale);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
