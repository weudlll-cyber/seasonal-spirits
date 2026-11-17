// Seasonal Sumo — the game core's match state as the wire state every client receives.
// One place turns the core's numbers into what clients show: the game mode, per ghost its
// position, speed, score, the time to its next dash, its phase and its bomb, the disc that
// halves (sumo's arena, the hill's zone) now and after the next halving, and the score per
// team.

import {
  GAME_MODES,
  SEASONS,
  areaOf,
  isLastSeason,
  scoreOf,
  type GameConfig,
  type Ghost,
  type MatchEvent,
  type MatchResult,
  type MatchState,
} from '@seasonal-spirits/game-core';
import {
  GHOST_BOMB,
  GHOST_BOT,
  GHOST_DASHING,
  GHOST_FALLING,
  GHOST_OUT,
  GHOST_PROTECTED,
  STATE_HALVING_EVENT,
  STATE_MATCH_END_EVENT,
  STATE_RESULT,
  STATE_TO_END,
  type GhostState,
  type ServerState,
} from '@seasonal-spirits/protocol';

export type WireState = Omit<ServerState, 'tick' | 'serverMs'>;

export interface WireContext {
  cfg: GameConfig;
  result: MatchResult;
  isBot: (ghost: number) => boolean;
  events: readonly MatchEvent[]; // of the tick just run; none during the result pause
  nextMatchMs: number; // 0 outside the result pause
}

export function toWire(s: Readonly<MatchState>, ctx: WireContext): WireState {
  const teams = ctx.result.teams;
  const area = areaOf(ctx.cfg, s);
  return {
    matchMs: s.elapsedMs,
    season: SEASONS.indexOf(s.clock.current),
    seasonNumber: s.clock.index,
    seasonLeftMs: s.clock.timeLeftMs,
    countdownMs: s.countdownMs,
    // The server says which deadline is next: the match end in the last season, else a halving.
    flags:
      (ctx.events.some((e) => e.type === 'halving') ? STATE_HALVING_EVENT : 0) |
      (s.ended ? STATE_RESULT : 0) |
      (!s.ended && isLastSeason(ctx.cfg, s.clock) ? STATE_TO_END : 0) |
      (ctx.events.some((e) => e.type === 'match-end') ? STATE_MATCH_END_EVENT : 0),
    nextMatchMs: ctx.nextMatchMs,
    teamScore: [teams[0] ?? 0, teams[1] ?? 0, teams[2] ?? 0, teams[3] ?? 0],
    mode: GAME_MODES.indexOf(s.mode),
    area: area.now,
    next: area.next,
    ghosts: s.ghosts.map((g) => ghostOnWire(ctx, s, g)),
  };
}

function ghostOnWire(ctx: WireContext, s: Readonly<MatchState>, g: Ghost): GhostState {
  const now = s.elapsedMs;
  return {
    id: g.id,
    x: g.x,
    y: g.y,
    vx: g.vx,
    vy: g.vy,
    team: g.team,
    score: scoreOf(s.mode, g),
    dashLeftMs: Math.max(0, g.dashReadyMs - now),
    flags:
      (ctx.isBot(g.id) ? GHOST_BOT : 0) |
      (now < g.dashUntilMs ? GHOST_DASHING : 0) |
      (g.phase === 'falling' ? GHOST_FALLING : 0) |
      (g.phase === 'out' ? GHOST_OUT : 0) |
      (g.phase === 'in' && now < g.protectedUntilMs ? GHOST_PROTECTED : 0) |
      (s.bombs.some((b) => b.carrier === g.id) ? GHOST_BOMB : 0),
  };
}
