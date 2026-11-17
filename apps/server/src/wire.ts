// Seasonal Sumo — the game core's match state as the wire state every client receives.
// One place turns the core's numbers into what clients show: the game mode, per ghost its
// position, speed, score, lives, the time to its next dash and jump, its phase, whether it is in
// the air and its bomb, the disc
// that halves (sumo's arena, the hill's zone) now and after the next halving, the score per
// team, sumo's variant and what the clock runs to (a halving, the end, or nothing).

import {
  GAME_MODES,
  SEASONS,
  areaOf,
  inAir,
  nextDeadline,
  scoreOf,
  type GameConfig,
  type Ghost,
  type MatchEvent,
  type MatchResult,
  type MatchState,
} from '@seasonal-spirits/game-core';
import {
  GHOST_AIRBORNE,
  GHOST_BOMB,
  GHOST_BOT,
  GHOST_DASHING,
  GHOST_FALLING,
  GHOST_OUT,
  GHOST_PROTECTED,
  STATE_HALVING_EVENT,
  STATE_LAST_STANDING,
  STATE_MATCH_END_EVENT,
  STATE_OPEN_END,
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
  const deadline = s.ended ? 'over' : nextDeadline(ctx.cfg, s);
  return {
    matchMs: s.elapsedMs,
    season: SEASONS.indexOf(s.clock.current),
    seasonNumber: s.clock.index,
    seasonLeftMs: s.clock.timeLeftMs,
    countdownMs: s.countdownMs,
    // The server says which deadline is next: the match end, a halving, or none at all.
    flags:
      (ctx.events.some((e) => e.type === 'halving') ? STATE_HALVING_EVENT : 0) |
      (s.ended ? STATE_RESULT : 0) |
      (deadline === 'end' ? STATE_TO_END : 0) |
      (deadline === null ? STATE_OPEN_END : 0) |
      (ctx.events.some((e) => e.type === 'match-end') ? STATE_MATCH_END_EVENT : 0) |
      (s.variant === 'last-standing' ? STATE_LAST_STANDING : 0),
    nextMatchMs: ctx.nextMatchMs,
    teamScore: [teams[0] ?? 0, teams[1] ?? 0, teams[2] ?? 0, teams[3] ?? 0],
    mode: GAME_MODES.indexOf(s.mode),
    livesAtStart: s.livesAtStart,
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
      (s.bombs.some((b) => b.carrier === g.id) ? GHOST_BOMB : 0) |
      (inAir(g, now) ? GHOST_AIRBORNE : 0),
    lives: g.lives,
    jumpLeftMs: Math.max(0, g.jumpReadyMs - now),
  };
}
