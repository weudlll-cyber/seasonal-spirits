// Seasonal Sumo — "Halving Bomb" (bomb): walls, nobody falls, everyone earns
// bomb.pointsPerSecond. One bomb per bomb.playersPerBomb players goes to random players; a
// carrier passes it on by touching an opponent that holds none — never a teammate, and not back
// to the one that just gave it before bomb.passBackMs. At every halving all bombs go off: each
// carrier loses bomb.blastShare of its points (half by default), new bombs go to random players,
// and the walls may close in (arena.ts closeWalls; 2026-11-19).

import { closeWalls } from '../arena.js';
import type { GameConfig } from '../config.js';
import { distance } from '../geometry.js';
import { inAir } from '../jump.js';
import type { Bomb, Ghost, MatchState } from '../types.js';
import type { ModeRules } from './rules.js';

// Collisions leave two touching ghosts exactly two radii apart: a little slack counts it.
const TOUCH_SLACK = 2;

export function bombCount(cfg: GameConfig, players: number): number {
  return Math.min(players, Math.max(1, Math.floor(players / cfg.bomb.playersPerBomb)));
}

export function bombRules(cfg: GameConfig): ModeRules {
  return {
    start: (s, rng) => {
      s.bombs = handOut(cfg, s, rng);
    },
    turn: (s, rng) => {
      for (const b of s.bombs) {
        const g = s.ghosts.find((x) => x.id === b.carrier);
        if (g) g.scoreMs = Math.round(g.scoreMs * (1 - cfg.bomb.blastShare));
      }
      s.bombs = handOut(cfg, s, rng);
      closeWalls(cfg, s.arena, s.elapsedMs);
    },
    after: (s, dtMs) => {
      for (const g of s.ghosts) g.scoreMs += dtMs * cfg.bomb.pointsPerSecond;
      for (const b of s.bombs) pass(cfg, s, b);
    },
  };
}

// Distinct random carriers from the match's seeded source.
function handOut(cfg: GameConfig, s: Readonly<MatchState>, rng: () => number): Bomb[] {
  const pool = s.ghosts.map((g) => g.id);
  const out: Bomb[] = [];
  for (let k = bombCount(cfg, pool.length); k > 0; k--) {
    const [id] = pool.splice(Math.floor(rng() * pool.length), 1);
    if (id !== undefined) out.push({ carrier: id, from: null, backAtMs: 0 });
  }
  return out;
}

// The bomb goes to the nearest opponent touching its carrier that may take it; nobody in the
// air passes or takes one (a jump touches nobody).
function pass(cfg: GameConfig, s: MatchState, b: Bomb): void {
  const c = s.ghosts.find((g) => g.id === b.carrier);
  const now = s.elapsedMs;
  if (!c || inAir(c, now)) return;
  const reach = 2 * cfg.ghostRadius + TOUCH_SLACK;
  const takes = (g: Ghost): boolean =>
    g.team !== c.team &&
    g.phase === 'in' &&
    !inAir(g, now) &&
    !(g.id === b.from && now < b.backAtMs) &&
    !s.bombs.some((x) => x.carrier === g.id);
  let to: Ghost | null = null;
  for (const g of s.ghosts) {
    if (distance(c, g) <= reach && takes(g) && (!to || distance(c, g) < distance(c, to))) to = g;
  }
  if (!to) return;
  c.passes++;
  Object.assign(b, { carrier: to.id, from: c.id, backAtMs: now + cfg.bomb.passBackMs });
  s.events.push({ type: 'pass', from: c.id, to: to.id });
}
