// Seasonal Sumo — falling off and coming back. A ghost whose centre leaves the arena falls: the
// fall counts +1 for the last opponent that touched it within creditMs (and its team), for
// nobody without one. It falls for fallMs (the animation), is out until outMs after the fall,
// then respawns on its team's quarter, protected for protectMs.

import { outside, respawnSpot } from './arena.js';
import type { GameConfig } from './config.js';
import type { Ghost, MatchState } from './types.js';

export function checkFalls(cfg: GameConfig, s: MatchState): void {
  const now = s.elapsedMs;
  for (const g of s.ghosts) {
    if (g.phase !== 'in' || !outside(s.arena, g)) continue;
    const t = g.lastTouch;
    const by = t && now - t.atMs <= cfg.creditMs ? t.by : null;
    if (by !== null) {
      const scorer = s.ghosts.find((x) => x.id === by);
      if (scorer) scorer.knockouts++;
    }
    g.falls++;
    g.longestAliveMs = Math.max(g.longestAliveMs, now - g.aliveSinceMs);
    g.phase = 'falling';
    g.phaseUntilMs = now + cfg.fallMs;
    g.dashUntilMs = 0;
    s.events.push({ type: 'fall', ghost: g.id, by, atMs: now });
  }
}

// Falling turns out after fallMs; out turns in at outMs after the fall, at a respawn spot.
export function advancePhases(cfg: GameConfig, s: MatchState, rng: () => number): void {
  const now = s.elapsedMs;
  for (const g of s.ghosts) {
    if (g.phase === 'in' || now < g.phaseUntilMs) continue;
    if (g.phase === 'falling') {
      g.phase = 'out';
      g.phaseUntilMs = now - cfg.fallMs + cfg.outMs;
      continue;
    }
    respawn(cfg, s, g, rng);
  }
}

function respawn(cfg: GameConfig, s: MatchState, g: Ghost, rng: () => number): void {
  const now = s.elapsedMs;
  const p = respawnSpot(cfg, s, g.team, rng);
  Object.assign(g, {
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    phase: 'in',
    phaseUntilMs: 0,
    protectedUntilMs: now + cfg.protectMs,
    lastTouch: null,
    aliveSinceMs: now,
  });
  s.events.push({ type: 'respawn', ghost: g.id });
}
