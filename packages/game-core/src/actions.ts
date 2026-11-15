// Seasonal Spirits — the three actions: swap and secure at the own shrine, steal on the field.
// Each function checks every condition itself and does nothing when one fails, so a broken
// or cheating client cannot get more than a valid intent would give it.

import type { GameConfig } from './config.js';
import { distance, shrineOf } from './geometry.js';
import { SEASONS, isLastSeason, nextSeason, totalCount, valueNow } from './seasons.js';
import type { Ghost, MatchState } from './types.js';

export function atOwnShrine(cfg: GameConfig, s: MatchState, g: Ghost): boolean {
  return distance(g, shrineOf(s.shrines, g.team)) <= cfg.shrineRadius;
}

// The fewest coins of the current season a swap takes: swapIn (today) or, in the rule
// trial R1 (`swapMode` 'ratio'), swapMinIn. The patient bot reads it too.
export function swapMinimum(cfg: GameConfig): number {
  return cfg.swapMode === 'ratio' ? cfg.swapMinIn : cfg.swapIn;
}

// CONCEPT.md §2a, sentence 3: 10 coins of the current season become 15 of the next. All
// carried coins of the current season are swapped at that rate, rounded down
// (10 → 15 → 22 → 33 for a patient player); fewer than swapMinimum give nothing. In 'ratio'
// mode (6 → 9, 8 → 12) there is no swap in the last season, whose next season never comes.
function swapYield(cfg: GameConfig, s: Readonly<MatchState>, spent: number): number {
  if (spent < swapMinimum(cfg)) return 0;
  if (cfg.swapMode === 'ratio' && isLastSeason(cfg, s.clock)) return 0;
  return Math.floor((spent * cfg.swapOut) / cfg.swapIn);
}

// What the two shrine buttons offer right now (CONCEPT.md §3: the player reads, never
// calculates): the secure value, and the swap's coin count with its value now and later.
export interface ShrineOffer {
  secureValue: number;
  swapCoins: number;
  swapValueNow: number;
  swapValueLater: number;
}

export function shrineOffer(cfg: GameConfig, s: MatchState, g: Ghost): ShrineOffer {
  const swapCoins = swapYield(cfg, s, g.carried[s.clock.current]);
  return {
    secureValue: valueNow(cfg, g.carried, s.clock.current),
    swapCoins,
    swapValueNow: swapCoins * cfg.offSeasonValueFactor,
    swapValueLater: swapCoins,
  };
}

export function trySwap(cfg: GameConfig, s: MatchState, g: Ghost): void {
  const from = s.clock.current;
  const spent = g.carried[from];
  const got = swapYield(cfg, s, spent);
  if (!atOwnShrine(cfg, s, g) || got === 0) return;
  g.carried[from] = 0;
  g.carried[nextSeason(from)] += got;
  // Rule trial R2: what a swap gives no steal can take until the next halving (halving.ts).
  if (cfg.swappedStealProof) g.shielded[nextSeason(from)] += got;
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
  for (const season of SEASONS) {
    g.carried[season] = 0;
    g.shielded[season] = 0;
  }
  g.securingUntilMs = null;
  g.securingSeason = null;
  s.events.push({ type: 'secured', ghost: g.id, value });
}

// Whether a steal by `thief` would take something right now: the match runs, the thief is
// not securing (a securing ghost does nothing else), its cooldown is over, and an opponent
// carrier is in range. The server tells each player this (the lit Steal button); trySteal
// checks exactly the same.
export function canSteal(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  thief: Readonly<Ghost>,
): boolean {
  return (
    !s.ended &&
    thief.securingUntilMs === null &&
    s.elapsedMs - thief.lastStealMs >= cfg.stealCooldownMs &&
    nearestOpponentCarrier(cfg, s, thief) !== null
  );
}

// CONCEPT.md §2a, sentence 5, and §8: one action, no aiming. The target is the nearest
// opponent carrier in range — never a teammate, never the thief itself.
export function trySteal(cfg: GameConfig, s: MatchState, thief: Ghost): void {
  if (!canSteal(cfg, s, thief)) return;
  const victim = nearestOpponentCarrier(cfg, s, thief);
  if (!victim) return;
  let coins = 0;
  for (const season of SEASONS) {
    // Shielded coins (rule trial R2) stay with the victim; all zero while the rule is off.
    const n = Math.ceil((victim.carried[season] - victim.shielded[season]) * cfg.stealShare);
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

// Whether a steal could take anything from `g`: it carries coins that are not shielded (rule
// trial R2), and — rule trial R3, `escortRadius` > 0 — no teammate is within escortRadius.
// The one place every steal decision asks: canSteal, trySteal and the hunter bot.
export function isStealTarget(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  g: Readonly<Ghost>,
): boolean {
  if (totalCount(g.carried) - totalCount(g.shielded) <= 0) return false;
  if (cfg.escortRadius <= 0) return true;
  return !s.ghosts.some(
    (m) => m.id !== g.id && m.team === g.team && distance(m, g) <= cfg.escortRadius,
  );
}

// The ghost a steal by `thief` would rob right now; the hunter bot reads it too.
export function nearestOpponentCarrier(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  thief: Readonly<Ghost>,
): Ghost | null {
  let best: Ghost | null = null;
  let bestD = Infinity;
  for (const g of s.ghosts) {
    if (g.team === thief.team || !isStealTarget(cfg, s, g)) continue;
    const d = distance(g, thief);
    if (d <= cfg.stealRange && d < bestD) {
      best = g;
      bestD = d;
    }
  }
  return best;
}
