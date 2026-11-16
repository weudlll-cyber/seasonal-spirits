// Seasonal Sumo — the season clock at the top: the four seasons of the match in order, the
// current one highlighted, the next announced, the time left, and in the last 10 s before a
// deadline its countdown — a halving (the arena halves), or the match end ("LAST CHANCE").
// Which deadline is next the server says (STATE_TO_END). The team scores sit in the band below
// (the client's scores.ts).

import { STATE_RESULT, STATE_TO_END, type ServerState } from '@seasonal-spirits/protocol';
import { TEXT, seasonColour, seasonName } from './palette.js';

export const CLOCK_HEIGHT = 64;

export function mmss(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function drawClock(ctx: CanvasRenderingContext2D, s: ServerState | undefined): void {
  const width = ctx.canvas.width;
  ctx.fillStyle = 'rgba(5, 8, 11, 0.92)';
  ctx.fillRect(0, 0, width, CLOCK_HEIGHT);
  if (!s) return;
  const start = (s.season - s.seasonNumber + 4) % 4;
  const cell = Math.min(110, (width - 24) / 4);
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
  ctx.textBaseline = 'alphabetic';
}

export function statusLine(s: ServerState): string {
  const next = seasonName(s.season + 1);
  const toEnd = (s.flags & STATE_TO_END) !== 0;
  if (s.flags & STATE_RESULT) return 'Match over';
  if (s.countdownMs !== null) {
    return toEnd
      ? `LAST CHANCE — push them off · ${mmss(s.countdownMs)}`
      : `HALVING in ${mmss(s.countdownMs)} — the arena halves, then ${next} is in season`;
  }
  if (toEnd) return `${seasonName(s.season)} · ${mmss(s.seasonLeftMs)} to the end`;
  return `${seasonName(s.season)} · ${mmss(s.seasonLeftMs)} left · next: ${next}`;
}
