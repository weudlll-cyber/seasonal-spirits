// Seasonal Spirits — every number of the game in one place.
// Values from CONCEPT.md name their section; every other value is a placeholder the owner
// decides (listed in the session sheet under NEEDS OWNER). Nothing else holds a magic number.

import type { Season } from './seasons.js';

export interface BotConfig {
  cautiousSecureAt: number;
  hunterSecureAt: number;
  arriveRadius: number;
}

export interface GameConfig {
  matchDurationMs: number;
  seasonDurationMs: number;
  startSeason: Season;
  fieldSize: number;
  ghostSpeed: number;
  carrySpeedFactor: number;
  pickupRadius: number;
  coinSpawnPerSecond: number;
  maxFieldCoins: number;
  offSeasonValueFactor: number;
  swapIn: number;
  swapOut: number;
  secureDurationMs: number;
  shrineRadius: number;
  shrineInset: number;
  startSpread: number;
  stealRange: number;
  stealShare: number;
  stealCooldownMs: number;
  halvingAtMs: number;
  halvingCountdownMs: number;
  halvingSpawnFactor: number;
  poolRadius: number;
  poolTakeIntervalMs: number;
  bots: BotConfig;
}

export const DEFAULT_CONFIG: GameConfig = {
  matchDurationMs: 300_000, // CONCEPT.md §4: 5 minutes
  seasonDurationMs: 75_000, // CONCEPT.md §2: four seasons of 75 s
  // The website's season clock will provide this (CONCEPT.md §2).
  startSeason: 'spring', // placeholder — owner decides
  fieldSize: 2000, // placeholder — owner decides (Phase 0 world)
  ghostSpeed: 300, // placeholder — owner decides (units/s, Phase 0 speed)
  // CONCEPT.md §8: "carrying slows a ghost down"; the factor is open.
  carrySpeedFactor: 0.7, // placeholder — owner decides
  pickupRadius: 30, // placeholder — owner decides
  coinSpawnPerSecond: 2, // placeholder — owner decides (CONCEPT.md leaves the rate open)
  maxFieldCoins: 60, // placeholder — owner decides
  offSeasonValueFactor: 0.5, // CONCEPT.md §2a / §10 decision 2: half outside its season
  swapIn: 10, // CONCEPT.md §2a / §10 decision 2: 10 coins of the current season ...
  swapOut: 15, // CONCEPT.md §2a / §10 decision 2: ... become 15 of the next
  secureDurationMs: 2500, // CONCEPT.md §2a: securing takes 2–3 s
  shrineRadius: 80, // placeholder — owner decides
  shrineInset: 150, // placeholder — owner decides (distance of a shrine from its corner)
  startSpread: 60, // placeholder — owner decides (start area around the own shrine)
  stealRange: 60, // placeholder — owner decides (CONCEPT.md leaves the range open)
  stealShare: 0.5, // placeholder — owner decides (CONCEPT.md leaves the share open)
  stealCooldownMs: 1000, // placeholder — owner decides
  halvingAtMs: 225_000, // CONCEPT.md §2b: the Autumn → Winter turn, 3:45 of 5:00
  halvingCountdownMs: 10_000, // CONCEPT.md §2b: countdown from 10 s before
  halvingSpawnFactor: 0.5, // CONCEPT.md §2b: half as many coins afterwards
  poolRadius: 100, // placeholder — owner decides
  poolTakeIntervalMs: 100, // placeholder — owner decides (one pool coin per interval)
  bots: {
    cautiousSecureAt: 5, // placeholder — owner decides (coins a cautious bot banks at)
    hunterSecureAt: 8, // placeholder — owner decides (coins a hunter banks at)
    arriveRadius: 20, // placeholder — owner decides (how close a bot steers to a target)
  },
};
