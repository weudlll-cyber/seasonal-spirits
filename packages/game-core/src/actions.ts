// Seasonal Spirits — the one action: securing at the own shrine. Each function checks every
// condition itself and does nothing when one fails, so a broken or cheating client cannot get
// more than a valid intent would give it. Stealing and the swap were removed with V5 (owner
// decision 2026-11-16).

import type { GameConfig } from './config.js';
import { distance, shrineOf } from './geometry.js';
import { SEASONS, seasonClock, totalCount, valueNow } from './seasons.js';
import type { Ghost, MatchState } from './types.js';

export function atOwnShrine(cfg: GameConfig, s: MatchState, g: Ghost): boolean {
  return distance(g, shrineOf(s.shrines, g.team)) <= cfg.shrineRadius;
}

// What the shrine's button offers right now (CONCEPT.md §3: the player reads, never
// calculates): the value a secure would bank.
export interface ShrineOffer {
  secureValue: number;
}

export function shrineOffer(cfg: GameConfig, s: MatchState, g: Ghost): ShrineOffer {
  return { secureValue: valueNow(cfg, g.carried, s.clock.current) };
}

// CONCEPT.md §2a, sentence 4: securing takes secureDurationMs and banks at the value of the
// moment the player chose it; the ghost stands still meanwhile.
export function trySecureStart(cfg: GameConfig, s: MatchState, g: Ghost): void {
  if (!atOwnShrine(cfg, s, g) || totalCount(g.carried) === 0) return;
  g.securingUntilMs = s.elapsedMs + cfg.secureDurationMs;
  g.securingSeason = s.clock.current;
  s.events.push({ type: 'secure-start', ghost: g.id });
}

export function completeSecure(cfg: GameConfig, s: MatchState, g: Ghost): void {
  if (g.securingUntilMs === null || s.elapsedMs < g.securingUntilMs) return;
  const value = valueNow(cfg, g.carried, g.securingSeason ?? s.clock.current);
  // How close to its season's deadline the secure was started (the moment that fixed its
  // value): the match recap's "Closest save" (recap.ts).
  const leftMs = seasonClock(cfg, g.securingUntilMs - cfg.secureDurationMs).timeLeftMs;
  g.securedValue += value;
  for (const season of SEASONS) g.carried[season] = 0;
  g.securingUntilMs = null;
  g.securingSeason = null;
  s.events.push({ type: 'secured', ghost: g.id, value, leftMs });
}
