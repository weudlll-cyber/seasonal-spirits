// Seasonal Sumo — falling off and coming back: a fall credits the last opponent within creditMs
// and costs a life; the ghost is out until outMs, then respawns protected, unless no life is left.

import { outside, respawnSpot } from './arena.js';
import type { GameConfig } from './config.js';
import { inAir } from './jump.js';
import type { Ghost, MatchState } from './types.js';

export function checkFalls(cfg: GameConfig, s: MatchState): void {
  const now = s.elapsedMs;
  for (const g of s.ghosts) {
    if (g.phase !== 'in' || inAir(g, now) || !outside(s.arena, g)) continue;
    const t = g.lastTouch;
    const by = t && now - t.atMs <= cfg.creditMs ? t.by : null;
    if (by !== null) {
      const scorer = s.ghosts.find((x) => x.id === by);
      if (scorer) scorer.knockouts++;
    }
    g.falls++;
    g.lives = Math.max(0, g.lives - 1);
    if (g.lives === 0) g.outAtMs = now;
    g.longestAliveMs = Math.max(g.longestAliveMs, now - g.aliveSinceMs);
    g.aliveMs += now - g.aliveSinceMs;
    g.phase = 'falling';
    g.phaseUntilMs = now + cfg.fallMs;
    g.dashUntilMs = 0;
    s.events.push({ type: 'fall', ghost: g.id, by, atMs: now });
  }
}

// Falling turns out after fallMs; out turns in at outMs after the fall, at a respawn spot —
// unless that was its last life.
export function advancePhases(cfg: GameConfig, s: MatchState, rng: () => number): void {
  const now = s.elapsedMs;
  for (const g of s.ghosts) {
    if (g.phase === 'in' || now < g.phaseUntilMs) continue;
    if (g.phase === 'falling') {
      g.phase = 'out';
      g.phaseUntilMs = now - cfg.fallMs + cfg.outMs;
      continue;
    }
    if (g.lives > 0) respawn(cfg, s, g, rng);
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
