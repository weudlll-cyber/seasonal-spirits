// Seasonal Sumo — lives and sumo's two variants: the time limit, the clock after the third halving,
// the teams knocked out, the match end and winner; the walled modes play "points", unaffected.

import type { GameConfig } from './config.js';
import { nextSeason, seasonClock, seasonsInMatch, type SeasonClock } from './seasons.js';
import { TEAMS, type Ghost, type MatchState, type Team } from './types.js';

const stillIn = (g: Readonly<Ghost>): boolean => g.lives > 0;

// Points and Last One Standing's "stop-time" end at the time limit; "keep-halving" and
// "stop-open" play until one ghost is left.
export function timed(cfg: GameConfig, s: Readonly<MatchState>): boolean {
  return s.variant === 'points' || cfg.sumo.afterLast === 'stop-time';
}

// The season clock now. Within the first seasons it is seasonClock; from the last one on the
// season never goes back (the owner's slider may change afterLast at any time): with a time
// limit it runs to the match end, "stop-open" has no deadline (timeLeftMs 0), "keep-halving"
// turns the season — a halving — every halvingEveryMs after the last halving.
export function clockOf(cfg: GameConfig, s: Readonly<MatchState>): SeasonClock {
  const last = seasonsInMatch(cfg) - 1;
  const e = s.elapsedMs;
  const regular = seasonClock(cfg, Math.min(e, cfg.matchDurationMs));
  if (regular.index < last) return regular;
  const at = s.clock.index >= last ? s.clock : regular;
  if (timed(cfg, s)) return { ...at, timeLeftMs: Math.max(0, cfg.matchDurationMs - e) };
  if (cfg.sumo.afterLast === 'stop-open') return { ...at, timeLeftMs: 0 };
  const due = Math.max(s.lastHalvingMs, last * cfg.seasonDurationMs) + cfg.sumo.halvingEveryMs;
  if (e < due) return { ...at, timeLeftMs: due - e };
  const current = at.next;
  const timeLeftMs = cfg.sumo.halvingEveryMs;
  return { current, next: nextSeason(current), index: at.index + 1, timeLeftMs };
}

// What the clock runs to: a halving, the match end, or nothing ("stop-open" after the third
// halving: the band shows the time played instead).
export function nextDeadline(cfg: GameConfig, s: Readonly<MatchState>): 'halving' | 'end' | null {
  if (s.clock.index < seasonsInMatch(cfg) - 1) return 'halving';
  if (timed(cfg, s)) return 'end';
  return cfg.sumo.afterLast === 'keep-halving' ? 'halving' : null;
}

// After the falls of a tick: a team whose every ghost has lost its last life is knocked out;
// two in the same tick in team order.
export function noteKnockedOut(s: MatchState): void {
  for (const team of TEAMS) {
    if (s.knockedOut.includes(team)) continue;
    const mates = s.ghosts.filter((g) => g.team === team);
    if (mates.length > 0 && !mates.some(stillIn)) s.knockedOut.push(team);
  }
}

// Over at the time limit (when there is one); earlier once somebody is out of lives and only
// one team (Points) or one ghost (Last One Standing) is left.
export function isOver(cfg: GameConfig, s: Readonly<MatchState>): boolean {
  if (timed(cfg, s) && s.elapsedMs >= cfg.matchDurationMs) return true;
  if (!s.ghosts.some((g) => !stillIn(g))) return false;
  const left = s.ghosts.filter(stillIn);
  if (s.variant === 'last-standing') return left.length <= 1;
  return new Set(left.map((g) => g.team)).size <= 1;
}

// Last One Standing's winner at the end (Points ranks by the scores: none). One ghost left: it
// and its team. None left (the last ones lost their last lives in the same tick): of those the
// lowest team order, then the lowest id. Several left at the time limit: the team with the most
// ghosts still in, then the most lives in total, then the lowest team order — and no single
// last one.
export function decide(s: Readonly<MatchState>): {
  winner: Team | null;
  lastStanding: number | null;
} {
  if (s.variant !== 'last-standing') return { winner: null, lastStanding: null };
  const left = s.ghosts.filter(stillIn);
  const one = left.length === 1 ? left[0] : left.length === 0 ? lastOut(s) : undefined;
  if (one) return { winner: one.team, lastStanding: one.id };
  const count = (team: Team, of: (g: Ghost) => number): number =>
    left.filter((g) => g.team === team).reduce((sum, g) => sum + of(g), 0);
  const ranked = TEAMS.map((team) => ({
    team,
    n: count(team, () => 1),
    lives: count(team, (g) => g.lives),
  }));
  ranked.sort((a, b) => b.n - a.n || b.lives - a.lives || a.team - b.team);
  return { winner: ranked[0]?.team ?? null, lastStanding: null };
}

function lastOut(s: Readonly<MatchState>): Ghost | undefined {
  const at = Math.max(...s.ghosts.map((g) => g.outAtMs ?? -Infinity));
  return s.ghosts.filter((g) => g.outAtMs === at).sort((a, b) => a.team - b.team || a.id - b.id)[0];
}

// Whom a ghost pushes: the other teams — in Last One Standing, once only its own team has
// ghosts left, its teammates too (the bots' brains ask this; the physics push everyone).
export function rivals(s: Readonly<MatchState>, a: Readonly<Ghost>, b: Readonly<Ghost>): boolean {
  if (a.team !== b.team) return true;
  return s.variant === 'last-standing' && s.ghosts.every((g) => g.team === a.team || !stillIn(g));
}
