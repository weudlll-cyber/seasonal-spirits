// Seasonal Spirits — the three actions: swap and secure at the own shrine, steal on the field.
// Each function checks every condition itself and does nothing when one fails, so a broken
// or cheating client cannot get more than a valid intent would give it.

import type { GameConfig } from './config.js';
import { distance, shrineOf } from './geometry.js';
import { SEASONS, nextSeason, totalCount, valueNow } from './seasons.js';
import type { Ghost, MatchState } from './types.js';

export function atOwnShrine(cfg: GameConfig, s: MatchState, g: Ghost): boolean {
  return distance(g, shrineOf(s.shrines, g.team)) <= cfg.shrineRadius;
}

// CONCEPT.md §2a, sentence 3: 10 coins of the current season become 15 of the next. All
// carried coins of the current season are swapped at that rate, rounded down
// (10 → 15 → 22 → 33 for a patient player).
export function trySwap(cfg: GameConfig, s: MatchState, g: Ghost): void {
  const from = s.clock.current;
  const spent = g.carried[from];
  if (!atOwnShrine(cfg, s, g) || spent < cfg.swapIn) return;
  const got = Math.floor((spent * cfg.swapOut) / cfg.swapIn);
  g.carried[from] = 0;
  g.carried[nextSeason(from)] += got;
  s.events.push({ type: 'swap', ghost: g.id, from, spent, got });
}

// CONCEPT.md §2a, sentence 4: securing takes secureDurationMs and banks at the value of the
// moment the player chose it; the ghost stands still and can be robbed meanwhile.
export function trySecureStart(cfg: GameConfig, s: MatchState, g: Ghost): void {
  if (!atOwnShrine(cfg, s, g) || totalCount(g.carried) === 0) return;
  g.securingUntilMs = s.elapsedMs + cfg.secureDurationMs;
  g.securingSeason = s.clock.current;
  s.events.push({ type: 'secure-start', ghost: g.id });
}

export function completeSecure(cfg: GameConfig, s: MatchState, g: Ghost): void {
  if (g.securingUntilMs === null || s.elapsedMs < g.securingUntilMs) return;
  const value = valueNow(cfg, g.carried, g.securingSeason ?? s.clock.current);
  g.securedValue += value;
  for (const season of SEASONS) g.carried[season] = 0;
  g.securingUntilMs = null;
  g.securingSeason = null;
  s.events.push({ type: 'secured', ghost: g.id, value });
}

// CONCEPT.md §2a, sentence 5, and §8: one action, no aiming. The target is the nearest
// opponent carrier in range — never a teammate, never the thief itself.
export function trySteal(cfg: GameConfig, s: MatchState, thief: Ghost): void {
  if (s.elapsedMs - thief.lastStealMs < cfg.stealCooldownMs) return;
  const victim = nearestOpponentCarrier(cfg, s, thief);
  if (!victim) return;
  let coins = 0;
  for (const season of SEASONS) {
    const n = Math.ceil(victim.carried[season] * cfg.stealShare);
    victim.carried[season] -= n;
    thief.carried[season] += n;
    coins += n;
  }
  thief.lastStealMs = s.elapsedMs;
  s.events.push({ type: 'steal', thief: thief.id, victim: victim.id, coins });
  if (victim.securingUntilMs !== null) {
    victim.securingUntilMs = null;
    victim.securingSeason = null;
    s.events.push({ type: 'secure-interrupted', ghost: victim.id });
  }
}

function nearestOpponentCarrier(cfg: GameConfig, s: MatchState, thief: Ghost): Ghost | null {
  let best: Ghost | null = null;
  let bestD = Infinity;
  for (const g of s.ghosts) {
    if (g.team === thief.team || totalCount(g.carried) === 0) continue;
    const d = distance(g, thief);
    if (d <= cfg.stealRange && d < bestD) {
      best = g;
      bestD = d;
    }
  }
  return best;
}
