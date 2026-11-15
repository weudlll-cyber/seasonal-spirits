// Seasonal Spirits — soft separation: ghosts closer than separationRadius drift apart.
// Owner decision 2026-11-15: ghosts softly push each other apart, no hard blocking, no physics.

import type { GameConfig } from './config.js';
import { clamp } from './geometry.js';
import type { Ghost, MatchState, Vec } from './types.js';

const GOLDEN_ANGLE = 2.399963229728653; // spreads ghosts that share one point evenly

// Every pair closer than the radius is pushed apart by `strength` of its overlap per tick,
// half each. The pushes are summed first and applied after, so the result does not depend on
// the order of the ghosts. Positions stay inside the field.
export function separateGhosts(cfg: GameConfig, s: MatchState): void {
  if (!(cfg.separationRadius > 0) || !(cfg.separationStrength > 0)) return;
  const push = new Map<Ghost, Vec>();
  const add = (g: Ghost, v: Vec): void => {
    const p = push.get(g) ?? { x: 0, y: 0 };
    push.set(g, { x: p.x + v.x, y: p.y + v.y });
  };
  const gs = s.ghosts;
  for (let i = 0; i < gs.length; i++) {
    for (let j = i + 1; j < gs.length; j++) {
      const a = gs[i];
      const b = gs[j];
      const pair = a && b ? pairPush(cfg, a, b) : null;
      if (!a || !b || !pair) continue;
      add(a, pair.a);
      add(b, pair.b);
    }
  }
  for (const [g, p] of push) {
    g.x = clamp(g.x + p.x, 0, cfg.fieldSize);
    g.y = clamp(g.y + p.y, 0, cfg.fieldSize);
  }
}

// The push on each of two ghosts, or null when they do not overlap. Ghosts on the very same
// point part along an angle from their ids. A securing ghost stands still (CONCEPT.md §2a)
// and is never moved: its neighbour takes the whole push.
function pairPush(cfg: GameConfig, a: Ghost, b: Ghost): { a: Vec; b: Vec } | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const aFixed = a.securingUntilMs !== null;
  const bFixed = b.securingUntilMs !== null;
  if (d >= cfg.separationRadius || (aFixed && bFixed)) return null;
  const angle = (a.id + b.id) * GOLDEN_ANGLE;
  const ux = d > 0 ? dx / d : Math.cos(angle);
  const uy = d > 0 ? dy / d : Math.sin(angle);
  const amount = (cfg.separationRadius - d) * cfg.separationStrength;
  const onA = aFixed ? 0 : bFixed ? amount : amount / 2;
  const onB = amount - onA;
  return { a: { x: -ux * onA, y: -uy * onA }, b: { x: ux * onB, y: uy * onB } };
}
