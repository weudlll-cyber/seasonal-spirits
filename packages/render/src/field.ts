// Seasonal Spirits — the ground, the four shrines and the field coins.
// The ground takes the current season's cast; coins are discs in their season's colour (the
// real token logos replace them later, CONCEPT.md §8). Shrine geometry is the game core's.

import { DEFAULT_CONFIG, shrinePositions } from '@seasonal-spirits/game-core';
import type { ServerState } from '@seasonal-spirits/protocol';
import { LINE, ground, seasonColour, seasonName } from './palette.js';
import { FIELD, circle, sx, sy, type View } from './view.js';

const SHRINES = shrinePositions(DEFAULT_CONFIG);
const GRID = 250; // field units between the faint ground lines

export function drawField(v: View, s: ServerState | undefined): void {
  const { ctx } = v;
  const season = s?.season ?? 0;
  ctx.fillStyle = '#05080b';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = ground(season);
  ctx.fillRect(sx(v, 0), sy(v, 0), FIELD * v.scale, FIELD * v.scale);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let u = GRID; u < FIELD; u += GRID) {
    ctx.moveTo(sx(v, u), sy(v, 0));
    ctx.lineTo(sx(v, u), sy(v, FIELD));
    ctx.moveTo(sx(v, 0), sy(v, u));
    ctx.lineTo(sx(v, FIELD), sy(v, u));
  }
  ctx.stroke();
  ctx.strokeRect(sx(v, 0), sy(v, 0), FIELD * v.scale, FIELD * v.scale);
  drawShrines(v);
  if (s) drawCoins(v, s);
}

function drawShrines(v: View): void {
  const { ctx } = v;
  const r = DEFAULT_CONFIG.shrineRadius * v.scale;
  SHRINES.forEach((p, team) => {
    const colour = seasonColour(team);
    circle(v, p.x, p.y, r);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colour;
    ctx.font = `bold ${Math.max(10, Math.round(r / 3))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${seasonName(team)} shrine`, sx(v, p.x), sy(v, p.y) + r + 14);
  });
  ctx.textAlign = 'start';
}

// Every field coin is of the current season (CONCEPT.md §2a, sentence 1).
function drawCoins(v: View, s: ServerState): void {
  const { ctx } = v;
  const r = Math.max(3, 9 * v.scale);
  ctx.fillStyle = seasonColour(s.season);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  for (const c of s.coins) {
    circle(v, c.x, c.y, r);
    ctx.fill();
    ctx.stroke();
  }
}
