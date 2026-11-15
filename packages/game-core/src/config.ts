// Seasonal Spirits — every number of the game in one place.
// Values from CONCEPT.md name their section; every other value is a placeholder the owner
// decides (listed in the session sheet under NEEDS OWNER). Nothing else holds a magic number.

import type { Season } from './seasons.js';

export interface BotConfig {
  cautiousSecureAt: number;
  hunterSecureAt: number;
  arriveRadius: number;
  deadlineMarginMs: number;
  waypointMs: number;
}

export interface GameConfig {
  matchDurationMs: number;
  seasonDurationMs: number;
  startSeason: Season;
  fieldSize: number;
  ghostSpeed: number;
  carrySpeedFactor: number;
  ghostRadius: number;
  ghostGrowthPerCoin: number;
  ghostGrowthMax: number;
  coinRadius: number;
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
  separationRadius: number;
  separationStrength: number;
  halvingCountdownMs: number;
  reconnectGraceMs: number;
  resultPauseMs: number;
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
  // The sizes the client draws and the server picks up with (geometry.ts ghostRadius): a coin
  // is picked up when the drawn ghost and the drawn coin touch (2026-11-15; before, a fixed
  // pickup radius of 30 against differently drawn sizes).
  ghostRadius: 14, // placeholder — owner decides (an empty ghost)
  ghostGrowthPerCoin: 0.5, // placeholder — owner decides (a carrier is larger, CONCEPT.md §2a)
  ghostGrowthMax: 16, // placeholder — owner decides
  coinRadius: 10, // placeholder — owner decides
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
  // Owner decision 2026-11-15: ghosts softly push each other apart. Two ghosts closer than the
  // radius (two bodies touching) drift apart by the strength share of the overlap per tick;
  // the radius must stay below stealRange so a thief beside a carrier can still steal.
  separationRadius: 28, // placeholder — owner decides
  separationStrength: 0.5, // placeholder — owner decides
  // CONCEPT.md §2b / §13: every season turn inside a match is a halving, counted down from
  // 10 s before.
  halvingCountdownMs: 10_000,
  // CONCEPT.md §8: a disconnected player stands 10–15 s, then a bot takes over.
  reconnectGraceMs: 12_000,
  resultPauseMs: 15_000, // placeholder — owner decides (result screen before the next match)
  bots: {
    cautiousSecureAt: 5, // placeholder — owner decides (coins a cautious bot banks at)
    hunterSecureAt: 8, // placeholder — owner decides (coins a hunter banks at)
    arriveRadius: 20, // placeholder — owner decides (how close a bot steers to a target)
    // Spare time a bot keeps when it walks home to swap or secure before a halving.
    deadlineMarginMs: 3000, // placeholder — owner decides
    // A collector with no coin of its own walks to a waypoint that moves on this often, so
    // collectors spread over the field instead of sharing one coin (2026-11-15).
    waypointMs: 4000, // placeholder — owner decides
  },
};
