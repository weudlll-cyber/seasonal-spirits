// Seasonal Sumo — public surface of the game core.
// The server, the clients and the tests use the match, its config, the bot and the types.

export * from './config.js';
export * from './seasons.js';
export * from './types.js';
export { Match, type Roster } from './match.js';
export { mulberry32 } from './rng.js';
export { clamp, dashVelocity, stepGhost, type Motion } from './geometry.js';
export { nextRadius } from './arena.js';
export { NO_AWARDS, noteAwards, survivorOf, type Awards } from './recap.js';
export { createBot, type Bot } from './bots/human.js';
export { simulate, botRoster, botSeed, SIM_TICK_MS, type SimulationReport } from './simulation.js';
