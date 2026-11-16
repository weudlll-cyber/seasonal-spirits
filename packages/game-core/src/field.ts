// Seasonal Spirits — coins on the field: spawning and picking up.
// Coins of all four seasons fall (CONCEPT.md V5, sentence 1), each season by its weight
// relative to the season in season (prices.ts spawnSeason), at the same rate all match long;
// anyone can pick up any coin.

import type { GameConfig } from './config.js';
import { touchesCoin } from './geometry.js';
import { spawnSeason } from './prices.js';
import { totalCount } from './seasons.js';
import type { FieldCoin, MatchState } from './types.js';

export interface Spawner {
  rng: () => number;
  acc: number; // fractional coins owed from previous ticks
  nextId: number;
}

export function spawnCoins(cfg: GameConfig, s: MatchState, sp: Spawner, dtMs: number): void {
  sp.acc += (cfg.coinSpawnPerSecond * dtMs) / 1000;
  while (sp.acc >= 1) {
    sp.acc -= 1;
    if (s.coins.length >= cfg.maxFieldCoins) continue;
    s.coins.push({
      id: sp.nextId++,
      x: sp.rng() * cfg.fieldSize,
      y: sp.rng() * cfg.fieldSize,
      season: spawnSeason(cfg, s.clock.current, sp.rng()),
    });
    s.stats.spawned++;
  }
}

// Each idle ghost takes the field coins its drawn body touches (geometry.ts touchesCoin),
// lowest ghost id first.
export function pickUpCoins(cfg: GameConfig, s: MatchState): void {
  const kept: FieldCoin[] = [];
  for (const coin of s.coins) {
    const taker = s.ghosts.find(
      (g) => g.securingUntilMs === null && touchesCoin(cfg, g, totalCount(g.carried), coin),
    );
    if (taker) {
      taker.carried[coin.season]++;
      s.stats.pickedUp++;
      s.events.push({ type: 'pickup', ghost: taker.id, coin: coin.id });
    } else {
      kept.push(coin);
    }
  }
  s.coins = kept;
}
