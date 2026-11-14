// Seasonal Spirits — the viewer's debug drawing: field, shrines, coins, ghosts, text.
// No art: coins are dots in the token colours, shrines squares. The layout numbers (field
// size, shrine positions) come from the game core's config.

import { DEFAULT_CONFIG, SEASONS, shrinePositions } from '@seasonal-spirits/game-core';
import {
  GHOST_BOT,
  GHOST_SECURING,
  STATE_RESULT,
  type GhostState,
  type ServerState,
} from '@seasonal-spirits/protocol';

// Token colours from the website's design tokens (CONCEPT.md §8), index = season = team.
const COLOURS = ['#AFB84E', '#E06E22', '#F9A825', '#04AAF7'];
const NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
const SHRINES = shrinePositions(DEFAULT_CONFIG);
const FIELD = DEFAULT_CONFIG.fieldSize;

export interface View {
  ctx: CanvasRenderingContext2D;
  scale: number;
  ox: number;
  oy: number;
}

export function layout(ctx: CanvasRenderingContext2D): View {
  const { width, height } = ctx.canvas;
  const scale = Math.min(width, height) / FIELD;
  return { ctx, scale, ox: (width - FIELD * scale) / 2, oy: (height - FIELD * scale) / 2 };
}

const colour = (i: number): string => COLOURS[i] ?? '#ffffff';

function dot(v: View, x: number, y: number, r: number): void {
  v.ctx.beginPath();
  v.ctx.arc(v.ox + x * v.scale, v.oy + y * v.scale, r, 0, Math.PI * 2);
}

export function drawField(v: View, s: ServerState | undefined): void {
  const { ctx } = v;
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.strokeStyle = '#22303c';
  ctx.strokeRect(v.ox, v.oy, FIELD * v.scale, FIELD * v.scale);
  SHRINES.forEach((p, team) => {
    const half = DEFAULT_CONFIG.shrineRadius * v.scale;
    ctx.strokeStyle = colour(team);
    ctx.strokeRect(v.ox + p.x * v.scale - half, v.oy + p.y * v.scale - half, 2 * half, 2 * half);
  });
  if (!s) return;
  ctx.fillStyle = colour(s.season); // every field coin is of the current season
  for (const c of s.coins) {
    dot(v, c.x, c.y, 2.5);
    ctx.fill();
  }
}

// A carrier is drawn larger the more it carries; a securing ghost gets a white ring; bots
// are a little transparent.
export function drawGhosts(v: View, ghosts: readonly GhostState[]): void {
  const { ctx } = v;
  for (const g of ghosts) {
    ctx.globalAlpha = g.flags & GHOST_BOT ? 0.75 : 1;
    ctx.fillStyle = colour(g.team);
    dot(v, g.x, g.y, 5 + Math.min(8, g.carried / 4));
    ctx.fill();
    if (g.flags & GHOST_SECURING) {
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

const clock = (ms: number): string => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

// The text lines of the match: season and clock, countdown or HALVING, team values.
export function matchLines(s: ServerState, halvingShown: boolean): string[] {
  const season = NAMES[s.season] ?? '?';
  const next = NAMES[(s.season + 1) % SEASONS.length] ?? '?';
  const lines = [
    `season:          ${season} (next ${next}, ${clock(s.seasonLeftMs)} left)`,
    `match:           ${clock(s.matchMs)} / ${clock(DEFAULT_CONFIG.matchDurationMs)}`,
  ];
  if (s.countdownMs !== null) lines.push(`halving in:      ${clock(s.countdownMs)}`);
  if (halvingShown) lines.push(`HALVING — ${season} is in season`);
  if (s.flags & STATE_RESULT) lines.push('RESULT — the next match starts soon');
  lines.push(
    `secured:         ${s.teamSecured.map((v, t) => `${NAMES[t] ?? '?'} ${v}`).join(' · ')}`,
  );
  return lines;
}
