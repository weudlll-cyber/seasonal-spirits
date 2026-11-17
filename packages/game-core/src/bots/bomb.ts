// Seasonal Sumo — the bomb bot's brain ("Halving Bomb"): a carrier chases the nearest opponent
// that may take its bomb and dashes into it; everyone else flees from the nearest opposing
// carrier in sight, bending towards the middle so it does not pin itself to a wall, and walks
// to its own wander point when no carrier is close. The human-like layer blurs it.

import type { GameConfig } from '../config.js';
import { distance } from '../geometry.js';
import { IDLE, type Ghost, type Intent, type MatchState } from '../types.js';
import { nearest, strike, toward, wanderPoint } from './bot.js';

const FLEE_RANGES = 2; // a carrier closer than this many dash ranges is a threat
const MIDDLE_PULL = 0.6; // how much a fleeing bot bends towards the middle

export function bombIntent(cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>): Intent {
  if (me.phase !== 'in' || s.ended) return IDLE;
  const now = s.elapsedMs;
  const carrying = (g: Ghost): boolean => s.bombs.some((b) => b.carrier === g.id);
  const mine = s.bombs.find((b) => b.carrier === me.id);
  if (mine) {
    const back = (g: Ghost): boolean => g.id === mine.from && now < mine.backAtMs;
    const target = nearest(s, me, (g) => !carrying(g) && !back(g));
    return target ? strike(cfg, s, me, target) : IDLE;
  }
  const threat = nearest(s, me, carrying);
  if (!threat || distance(me, threat) > cfg.bots.dashRange * FLEE_RANGES) {
    return toward(me, wanderPoint(cfg, s, me.id));
  }
  const away = toward(threat, me);
  const middle = toward(me, s.arena.centre);
  return toward(
    { x: 0, y: 0 },
    { x: away.dx + middle.dx * MIDDLE_PULL, y: away.dy + middle.dy * MIDDLE_PULL },
  );
}
