// Seasonal Spirits — the season clock at the top (CONCEPT.md §8): the four seasons of the match
// in order, the current one highlighted, the next announced, the time left, and in the last
// 10 s before a halving its countdown. Team values sit on the right.

import type { ServerState } from '@seasonal-spirits/protocol';
import { MUTED, TEXT, seasonColour, seasonName } from './palette.js';

export const CLOCK_HEIGHT = 64;

export function mmss(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

// The value as a player reads it: whole numbers plain, halves with one decimal.
export function value(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function drawClock(ctx: CanvasRenderingContext2D, s: ServerState | undefined): void {
  const width = ctx.canvas.width;
  ctx.fillStyle = 'rgba(5, 8, 11, 0.92)';
  ctx.fillRect(0, 0, width, CLOCK_HEIGHT);
  if (!s) return;
  const start = (s.season - s.seasonNumber + 4) % 4;
  const cell = Math.min(110, (width - 24) / 6);
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 4; i++) {
    const season = (start + i) % 4;
    const x = 12 + i * cell;
    const current = i === s.seasonNumber;
    ctx.globalAlpha = current ? 1 : i < s.seasonNumber ? 0.35 : 0.7;
    ctx.fillStyle = seasonColour(season);
    ctx.fillRect(x, 10, cell - 6, current ? 26 : 18);
    ctx.fillStyle = '#05080b';
    ctx.font = `${current ? 'bold ' : ''}12px system-ui, sans-serif`;
    ctx.fillText(seasonName(season), x + 6, current ? 23 : 19);
  }
  ctx.globalAlpha = 1;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = s.countdownMs === null ? TEXT : '#ff6b6b';
  ctx.fillText(statusLine(s), 12, 50);
  drawTeams(ctx, s, 12 + 4 * cell + 8);
  ctx.textBaseline = 'alphabetic';
}

function statusLine(s: ServerState): string {
  const next = seasonName(s.season + 1);
  if (s.countdownMs !== null)
    return `HALVING in ${mmss(s.countdownMs)} — then ${next} is in season`;
  if (s.seasonNumber >= 3) return `${seasonName(s.season)} · ${mmss(s.seasonLeftMs)} to the end`;
  return `${seasonName(s.season)} · ${mmss(s.seasonLeftMs)} left · next: ${next}`;
}

function drawTeams(ctx: CanvasRenderingContext2D, s: ServerState, x: number): void {
  const width = ctx.canvas.width;
  // On a narrow phone the four values do not fit; the result screen shows them.
  const step = (width - x - 12) / 4;
  if (step < 56) return;
  ctx.font = '12px system-ui, sans-serif';
  s.teamSecured.forEach((v, team) => {
    ctx.fillStyle = seasonColour(team);
    ctx.fillText(seasonName(team), x + team * step, 22);
    ctx.fillStyle = MUTED;
    ctx.fillText(value(v), x + team * step, 40);
  });
}
