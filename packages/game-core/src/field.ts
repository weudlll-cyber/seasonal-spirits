// Seasonal Spirits — coins on the field and in the centre pool: spawning and picking up.
// Only coins of the current season lie on the field (CONCEPT.md §2a, sentence 1); the
// halving's pool holds coins of every season and is emptied one coin per interval.

import type { GameConfig } from './config.js';
import { distance } from './geometry.js';
import { SEASONS, totalCount, type Season, type SeasonCounts } from './seasons.js';
import type { FieldCoin, Ghost, MatchState } from './types.js';

export interface Spawner {
  rng: () => number;
  acc: number; // fractional coins owed from previous ticks
  nextId: number;
}

export function spawnCoins(cfg: GameConfig, s: MatchState, sp: Spawner, dtMs: number): void {
  const rate = cfg.coinSpawnPerSecond * (s.halvingDone ? cfg.halvingSpawnFactor : 1);
  sp.acc += (rate * dtMs) / 1000;
  while (sp.acc >= 1) {
    sp.acc -= 1;
    if (s.coins.length >= cfg.maxFieldCoins) continue;
    s.coins.push({
      id: sp.nextId++,
      x: sp.rng() * cfg.fieldSize,
      y: sp.rng() * cfg.fieldSize,
      season: s.clock.current,
    });
    s.stats.spawned++;
  }
}

// Each idle ghost takes the field coins within reach, lowest ghost id first.
export function pickUpCoins(cfg: GameConfig, s: MatchState): void {
  const kept: FieldCoin[] = [];
  for (const coin of s.coins) {
    const taker = s.ghosts.find(
      (g) => g.securingUntilMs === null && distance(g, coin) <= cfg.pickupRadius,
    );
    if (taker) taker.carried[coin.season]++;
    else kept.push(coin);
  }
  s.coins = kept;
}

export function takeFromPool(cfg: GameConfig, s: MatchState): void {
  for (const g of s.ghosts) {
    if (totalCount(s.pool) === 0) return;
    if (!canTakeFromPool(cfg, s, g)) continue;
    const season = fullestSeason(s.pool);
    s.pool[season]--;
    g.carried[season]++;
    g.lastPoolTakeMs = s.elapsedMs;
    s.stats.poolTaken++;
  }
}

function canTakeFromPool(cfg: GameConfig, s: MatchState, g: Ghost): boolean {
  return (
    g.securingUntilMs === null &&
    distance(g, s.poolCenter) <= cfg.poolRadius &&
    s.elapsedMs - g.lastPoolTakeMs >= cfg.poolTakeIntervalMs
  );
}

// The season with the most coins; ties go to the earlier season in the year.
function fullestSeason(c: SeasonCounts): Season {
  let best: Season = 'spring';
  for (const season of SEASONS) if (c[season] > c[best]) best = season;
  return best;
}
