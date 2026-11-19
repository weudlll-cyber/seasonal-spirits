// Seasonal Sumo — "King of the Season" (hill): walls, nobody falls. A glowing zone sits in the
// quarter of the season in season; every ghost inside earns hill.pointsPerSecond for itself and
// its team. At every halving the walls may close in (arena.ts closeWalls) and the zone jumps to
// the new season's quarter of the field as it will be and shrinks (hill.shrink) — never larger
// than its quarter (2026-11-19).
// Leaving the zone within hill.bounceMs of an opponent's dash into it is a bounce for that
// opponent — its own dash, not a plain push (NIGHT 2026-11-18).

import { closeWalls, quarterCentre, wallsAfter } from '../arena.js';
import type { GameConfig } from '../config.js';
import { distance } from '../geometry.js';
import { SEASONS, type Season } from '../seasons.js';
import type { Disc, Ghost, MatchState, Team, Vec } from '../types.js';
import type { ModeRules } from './rules.js';

// The zone of `season` in walls of half side `half` (the walls' target: where they are going):
// in its quarter, its radius at most half the quarter's side, so it fits.
function zoneFor(s: Readonly<MatchState>, season: Season, half: number, r: number): Disc {
  const p = quarterCentre(s.arena.centre, half, SEASONS.indexOf(season) as Team);
  return { x: p.x, y: p.y, r: Math.min(r, half / 2) };
}

// Where the zone jumps at the next halving: the dashed outline of the countdown.
export function nextZone(cfg: GameConfig, s: Readonly<MatchState>): Disc | null {
  const half = wallsAfter(cfg, s.arena.target);
  return s.zone && zoneFor(s, s.clock.next, half, s.zone.r * cfg.hill.shrink);
}

export function inZone(z: Readonly<Disc>, p: Vec): boolean {
  return distance(p, z) <= z.r;
}

export function hillRules(cfg: GameConfig): ModeRules {
  let inside = new Set<number>(); // who was in the zone after the last tick
  return {
    start: (s) => {
      s.zone = zoneFor(s, s.clock.current, s.arena.target, cfg.hill.zoneRadius);
    },
    turn: (s) => {
      closeWalls(cfg, s.arena, s.elapsedMs);
      const r = (s.zone?.r ?? cfg.hill.zoneRadius) * cfg.hill.shrink;
      s.zone = zoneFor(s, s.clock.current, s.arena.target, r);
      inside = new Set(); // the jump moves the zone away from everyone: no bounces for it
    },
    after: (s, dtMs) => {
      inside = score(cfg, s, dtMs, inside);
    },
  };
}

function score(cfg: GameConfig, s: MatchState, dtMs: number, before: Set<number>): Set<number> {
  const now = new Set<number>();
  const z = s.zone;
  if (!z) return now;
  for (const g of s.ghosts) {
    if (g.phase === 'in' && inZone(z, g)) {
      now.add(g.id);
      g.scoreMs += dtMs * cfg.hill.pointsPerSecond;
    } else if (before.has(g.id)) bounced(cfg, s, g);
  }
  return now;
}

function bounced(cfg: GameConfig, s: MatchState, g: Ghost): void {
  const t = g.lastTouch;
  if (!t || !t.dash || s.elapsedMs - t.atMs > cfg.hill.bounceMs) return;
  const by = s.ghosts.find((x) => x.id === t.by);
  if (by) by.bounces++;
}
