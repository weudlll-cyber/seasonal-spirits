// Seasonal Spirits — public surface of the game core.
// The server (Phase 1) and the tests use the match, its config, the bots and the types.

export * from './config.js';
export * from './seasons.js';
export * from './types.js';
export { Match, type Roster } from './match.js';
export { mulberry32 } from './rng.js';
export {
  atOwnShrine,
  canSteal,
  carriesShielded,
  shrineOffer,
  type ShrineOffer,
} from './actions.js';
export { ghostRadius, shrineOf, shrinePositions, touchesCoin } from './geometry.js';
export { NO_AWARDS, noteAwards, type Awards } from './recap.js';
export { createBot, STRATEGIES, type Strategy } from './bots/strategies.js';
export type { Bot } from './bots/common.js';
export {
  simulate,
  botRoster,
  SIM_TICK_MS,
  type HalvingRecord,
  type SimulationReport,
} from './simulation.js';
