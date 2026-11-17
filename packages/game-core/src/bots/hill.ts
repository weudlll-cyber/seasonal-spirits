// Seasonal Sumo — the hill bot's brain ("King of the Season"): head for the zone; inside it,
// push the nearest opponent in the zone out, dashing when lined up close; with nobody to push,
// hold a spot in the zone (its own wander point, scaled into it, so the team does not stack).
// The human-like layer (human.ts) blurs it like every brain.

import type { GameConfig } from '../config.js';
import { inZone } from '../modes/hill.js';
import { IDLE, type Ghost, type Intent, type MatchState } from '../types.js';
import { nearest, strike, toward, wanderPoint } from './bot.js';

export function hillIntent(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Intent {
  const z = s.zone;
  if (me.phase !== 'in' || s.ended || !z) return IDLE;
  if (!inZone(z, me)) return toward(me, z);
  const rival = nearest(s, me, (g) => inZone(z, g));
  if (rival) return strike(cfg, s, me, rival);
  // The wander point lies at 0.4 of the arena's radius around its centre: moved into the zone.
  const w = wanderPoint(cfg, s, me.id);
  const k = (z.r * cfg.bots.holdShare) / (s.arena.radius * 0.4);
  return toward(me, {
    x: z.x + (w.x - s.arena.centre.x) * k,
    y: z.y + (w.y - s.arena.centre.y) * k,
  });
}
