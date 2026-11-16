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
  threatRange: number;
  // Trials of session 2026-11-16-HUMAN (BALANCE.md "Human round 1"); defaults = today's bots.
  viewRadius: ViewHalfSize | null; // T1: what a bot sees, as a player's "Near" view; null = all
  reactionMs: number; // T2: a bot acts on what it saw this long ago; 0 = now
  deadlineSpreadMs: number; // T4: extra spare time before a deadline, 0 to this by id; 0 = off
}

// Half the width and half the height of a view in field units: the rectangle around a ghost,
// kept inside the field like the client's camera (bots/perception.ts).
export interface ViewHalfSize {
  x: number;
  y: number;
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
  swapMinIn: number;
  secureDurationMs: number;
  shrineRadius: number;
  shrineInset: number;
  startSpread: number;
  stealRange: number;
  stealShareMin: number;
  stealShareMax: number;
  stealCooldownMs: number;
  separationRadius: number;
  separationStrength: number;
  deadlineCountdownMs: number;
  reconnectGraceMs: number;
  resultPauseMs: number;
  signalIntervalMs: number;
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
  // CONCEPT.md §2a / §10 decision 2: coins of the current season swap at 10 → 15 of the next,
  // rounded down; owner decision 2026-11-16 (BALANCE.md "Round 5" to "Round 7"): from swapMinIn
  // coins on (6 → 9, 8 → 12, 10 → 15), never in the last season.
  swapIn: 10,
  swapOut: 15,
  swapMinIn: 6, // placeholder — owner decides
  secureDurationMs: 2500, // CONCEPT.md §2a: securing takes 2–3 s
  shrineRadius: 80, // placeholder — owner decides
  shrineInset: 150, // placeholder — owner decides (distance of a shrine from its corner)
  startSpread: 60, // placeholder — owner decides (start area around the own shrine)
  stealRange: 60, // placeholder — owner decides (CONCEPT.md leaves the range open)
  // Owner decision 2026-11-16: each steal draws its share uniformly from [stealShareMin,
  // stealShareMax] (min = max is a fixed share), at least one coin (BALANCE.md "Round 6", "Round 7").
  stealShareMin: 0, // placeholder — owner decides
  stealShareMax: 0.5, // placeholder — owner decides
  stealCooldownMs: 1000, // placeholder — owner decides
  // Owner decision 2026-11-15: ghosts softly push each other apart. Two ghosts closer than the
  // radius (two bodies touching) drift apart by the strength share of the overlap per tick;
  // the radius must stay below stealRange so a thief beside a carrier can still steal.
  separationRadius: 28, // placeholder — owner decides
  separationStrength: 0.5, // placeholder — owner decides
  // CONCEPT.md §2b / §13: every season turn inside a match is a halving, counted down from
  // 10 s before; the match end the same way (owner decision 2026-11-16, "last chance").
  deadlineCountdownMs: 10_000,
  // CONCEPT.md §8: a disconnected player stands 10–15 s, then a bot takes over.
  reconnectGraceMs: 12_000,
  resultPauseMs: 15_000, // placeholder — owner decides (result screen before the next match)
  // Owner decision 2026-11-16: a player sends at most one team signal this often; the server
  // drops extra ones silently (apps/server match-host.ts).
  signalIntervalMs: 2000, // placeholder — owner decides
  bots: {
    cautiousSecureAt: 5, // placeholder — owner decides (coins a cautious bot banks at)
    hunterSecureAt: 8, // placeholder — owner decides (coins a hunter banks at)
    arriveRadius: 20, // placeholder — owner decides (how close a bot steers to a target)
    // Spare time a bot keeps when it walks home to swap or secure before a halving.
    deadlineMarginMs: 3000, // placeholder — owner decides
    // A collector with no coin of its own walks to a waypoint that moves on this often, so
    // collectors spread over the field instead of sharing one coin (2026-11-15).
    waypointMs: 4000, // placeholder — owner decides
    // A patient bot with at least swapIn coins goes home when an opponent comes this close
    // (2026-11-15: it used to carry a full load past hunters without reacting).
    threatRange: 150, // placeholder — owner decides
    viewRadius: null, // trial T1, off (trial value: a desktop "Near" view, { x: 1000, y: 550 })
    reactionMs: 0, // trial T2, off (trial value 300, placeholder)
    deadlineSpreadMs: 0, // trial T4, off (trial value 10 000, placeholder)
  },
};
