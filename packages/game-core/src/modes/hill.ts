// Seasonal Sumo — "King of the Season" (hill): walls, nobody falls. A glowing zone sits in the
// quarter of the season in season; every ghost inside earns hill.pointsPerSecond for itself and
// its team. At every halving the zone jumps to the new season's quarter and shrinks (hill.shrink).
// Leaving the zone within hill.bounceMs of an opponent's dash into it is a bounce for that
// opponent — its own dash, not a plain push (NIGHT 2026-11-18).

import { quarterCentre } from '../arena.js';
import type { GameConfig } from '../config.js';
import { distance } from '../geometry.js';
import { SEASONS, type Season } from '../seasons.js';
import type { Disc, Ghost, MatchState, Team, Vec } from '../types.js';
import type { ModeRules } from './rules.js';

function zoneFor(cfg: GameConfig, s: Readonly<MatchState>, season: Season, r: number): Disc {
  const p = quarterCentre(cfg, s.arena, SEASONS.indexOf(season) as Team);
  return { x: p.x, y: p.y, r };
}

// Where the zone jumps at the next halving: the dashed outline of the countdown.
export function nextZone(cfg: GameConfig, s: Readonly<MatchState>): Disc | null {
  return s.zone && zoneFor(cfg, s, s.clock.next, s.zone.r * cfg.hill.shrink);
}

export function inZone(z: Readonly<Disc>, p: Vec): boolean {
  return distance(p, z) <= z.r;
}

export function hillRules(cfg: GameConfig): ModeRules {
  let inside = new Set<number>(); // who was in the zone after the last tick
  return {
    start: (s) => {
      s.zone = zoneFor(cfg, s, s.clock.current, cfg.hill.zoneRadius);
    },
    turn: (s) => {
      const r = (s.zone?.r ?? cfg.hill.zoneRadius) * cfg.hill.shrink;
      s.zone = zoneFor(cfg, s, s.clock.current, r);
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
