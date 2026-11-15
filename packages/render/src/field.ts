// Seasonal Spirits — the ground, the four shrines and the field coins.
// The ground takes the current season's cast; coins are small diamonds in their season's
// colour, so they never look like the round ghosts (the real token logos replace them later,
// CONCEPT.md §8). The own shrine glows and says so. Shrine geometry is the game core's.

import { DEFAULT_CONFIG, shrinePositions } from '@seasonal-spirits/game-core';
import type { ServerState } from '@seasonal-spirits/protocol';
import { LINE, TEXT, ground, seasonColour, seasonName } from './palette.js';
import { FIELD, circle, sx, sy, type View } from './view.js';

export const SHRINES = shrinePositions(DEFAULT_CONFIG);
const GRID = 250; // field units between the faint ground lines
const PULSE_MS = 1600; // one gentle breath of the own shrine's glow

export interface FieldStyle {
  ownTeam: number | null; // the player's team: its shrine glows; null for spectators
  nowMs: number; // drives the pulse
}

export function drawField(
  v: View,
  s: ServerState | undefined,
  style: FieldStyle = { ownTeam: null, nowMs: 0 },
): void {
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
  SHRINES.forEach((p, team) => {
    drawShrine(v, p, team, team === style.ownTeam ? style.nowMs : null);
  });
  if (s) drawCoins(v, s);
}

// `pulseAt` is set for the own shrine only: a breathing glow, a solid rim, "Your shrine".
function drawShrine(
  v: View,
  p: { x: number; y: number },
  team: number,
  pulseAt: number | null,
): void {
  const { ctx } = v;
  const r = DEFAULT_CONFIG.shrineRadius * v.scale;
  const colour = seasonColour(team);
  const breath = pulseAt === null ? 0 : (1 + Math.sin((pulseAt / PULSE_MS) * Math.PI * 2)) / 2;
  circle(v, p.x, p.y, r);
  ctx.globalAlpha = pulseAt === null ? 0.12 : 0.2 + 0.15 * breath;
  ctx.fillStyle = colour;
  ctx.shadowColor = colour;
  ctx.shadowBlur = pulseAt === null ? 0 : 18 + 22 * breath;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.setLineDash(pulseAt === null ? [6, 4] : []);
  ctx.strokeStyle = colour;
  ctx.lineWidth = pulseAt === null ? 2 : 4;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = pulseAt === null ? colour : TEXT;
  ctx.font = `bold ${Math.max(11, Math.round(r / 3))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  const label = pulseAt === null ? `${seasonName(team)} shrine` : 'Your shrine';
  ctx.fillText(label, sx(v, p.x), sy(v, p.y) + r + 16);
  ctx.textAlign = 'start';
}

// Every field coin is of the current season (CONCEPT.md §2a, sentence 1): a diamond (a
// square on its corner) in that season's colour.
function drawCoins(v: View, s: ServerState): void {
  const { ctx } = v;
  const r = Math.max(4, 10 * v.scale);
  ctx.fillStyle = seasonColour(s.season);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  for (const c of s.coins) {
    const x = sx(v, c.x);
    const y = sy(v, c.y);
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
