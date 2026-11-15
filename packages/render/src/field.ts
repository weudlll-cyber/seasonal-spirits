// Seasonal Spirits — the ground, the four shrines and the field coins.
// The ground takes the current season's cast; coins are small diamonds in their season's
// colour, so they never look like the round ghosts (the real token logos replace them later,
// CONCEPT.md §8). The own shrine glows and says so. Shrine geometry is the game core's.

import { DEFAULT_CONFIG, shrinePositions } from '@seasonal-spirits/game-core';
import type { ServerState } from '@seasonal-spirits/protocol';
import { LINE, TEXT, ground, seasonColour, seasonName } from './palette.js';
import { shrineLabelAt } from './labels.js';
import { FIELD, circle, sx, sy, type Rect, type View } from './view.js';

export const SHRINES = shrinePositions(DEFAULT_CONFIG);
const GRID = 250; // field units between the faint ground lines
const PULSE_MS = 1600; // one gentle breath of the own shrine's glow

export interface FieldStyle {
  ownTeam: number | null; // the player's team: its shrine glows; null for spectators
  nowMs: number; // drives the pulse
  blocked: readonly Rect[]; // HUD controls on the field: shrine labels move away from them
}

// Returns the box of the own shrine's label, or null without an own team (browser specs).
export function drawField(
  v: View,
  s: ServerState | undefined,
  style: FieldStyle = { ownTeam: null, nowMs: 0, blocked: [] },
): Rect | null {
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
  let ownLabel: Rect | null = null;
  for (const [team, p] of SHRINES.entries()) {
    const own = team === style.ownTeam;
    drawShrine(v, p, team, own ? style.nowMs : null);
    const box = drawShrineLabel(v, { ...p, team, own }, style.blocked);
    if (own) ownLabel = box;
  }
  if (s) drawCoins(v, s);
  return ownLabel;
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
}

// "Your shrine" or "<Season> shrine", below the shrine unless a HUD control covers that spot
// (then above, left or right of it, shrineLabelAt in labels.ts). Returns the label's box.
function drawShrineLabel(
  v: View,
  shrine: { x: number; y: number; team: number; own: boolean },
  blocked: readonly Rect[],
): Rect {
  const { team, own } = shrine;
  const { ctx } = v;
  const r = DEFAULT_CONFIG.shrineRadius * v.scale;
  const size = Math.max(11, Math.round(r / 3));
  const label = own ? 'Your shrine' : `${seasonName(team)} shrine`;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  const text = { width: ctx.measureText(label).width, height: size + 2 };
  const at = { x: sx(v, shrine.x), y: sy(v, shrine.y), r };
  const p = shrineLabelAt(at, text, blocked);
  ctx.fillStyle = own ? TEXT : seasonColour(team);
  ctx.textAlign = 'center';
  ctx.fillText(label, p.x, p.y);
  ctx.textAlign = 'start';
  return {
    left: p.x - text.width / 2,
    right: p.x + text.width / 2,
    top: p.y - text.height,
    bottom: p.y,
  };
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
