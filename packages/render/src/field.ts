// Seasonal Sumo — the field of each mode on a dark void: sumo's arena, a disc in the season's
// ground colour with a glowing edge; hill and bomb a walled square with glowing walls, and in
// hill the zone glowing in the season's colour. During the countdown before a halving the disc
// after it — the arena's next edge, the zone's next place — shows dashed (the server sends
// both discs, protocol state.ts).

import { DEFAULT_CONFIG, walled } from '@seasonal-spirits/game-core';
import { STATE_TO_END, type ServerState, type WireDisc } from '@seasonal-spirits/protocol';
import { clientConfig } from './modes.js';
import { LINE, ground, seasonColour } from './palette.js';
import { FIELD, circle, sx, sy, type Box, type View } from './view.js';

const CENTRE = DEFAULT_CONFIG.fieldSize / 2;
const GRID = 250; // field units between the faint ground lines
const VOID = '#020305';
// Before the first state: sumo's arena as it starts.
const START: WireDisc = { x: CENTRE, y: CENTRE, r: DEFAULT_CONFIG.arenaRadius };

// The playing area, the square the client's camera fits (owner 2026-11-17: the whole of it
// always on screen): the walled square, or sumo's arena as it is now — the server eases its edge
// in after a halving, so the camera follows it in.
export function playBox(s: ServerState | undefined): Box {
  const cfg = clientConfig(s?.mode ?? 0);
  if (walled(cfg)) return { x: CENTRE, y: CENTRE, half: cfg.wallHalf };
  const a = s?.area ?? START;
  return { x: a.x, y: a.y, half: a.r };
}

export function drawField(v: View, s: ServerState | undefined): void {
  const { ctx } = v;
  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const season = s?.season ?? 0;
  const colour = seasonColour(season);
  const cfg = clientConfig(s?.mode ?? 0);
  // The ground — the disc or the square — with the faint lines clipped to it.
  const box = playBox(s);
  const shape = (): void => {
    const h = box.half * v.scale;
    if (!walled(cfg)) {
      circle(v, box.x, box.y, h);
      return;
    }
    ctx.beginPath();
    ctx.rect(sx(v, box.x) - h, sy(v, box.y) - h, 2 * h, 2 * h);
  };
  ctx.save();
  shape();
  ctx.fillStyle = ground(season);
  ctx.fill();
  ctx.clip();
  drawGrid(v);
  ctx.restore();
  // The glowing edge or walls.
  shape();
  ctx.strokeStyle = colour;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 4;
  ctx.stroke();
  // The zone glows inside the walls.
  if (s?.area && walled(cfg)) {
    circle(v, s.area.x, s.area.y, s.area.r * v.scale);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // What comes, in the countdown before a halving (not before the match end).
  if (s?.next && s.countdownMs !== null && !(s.flags & STATE_TO_END)) {
    circle(v, s.next.x, s.next.y, s.next.r * v.scale);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = seasonColour(season + 1);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawGrid(v: View): void {
  const { ctx } = v;
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
}
