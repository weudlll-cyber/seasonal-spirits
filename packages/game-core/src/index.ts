// Seasonal Sumo — public surface of the game core.
// The server, the clients and the tests use the match, its config and modes, the bot and the
// types.

export * from './config.js';
export * from './rotation.js';
export * from './seasons.js';
export * from './types.js';
export { Match, type Roster } from './match.js';
export { QUARTER, quarterCentre, teamAngle } from './arena.js';
export * from './settings.js';
export { nextDeadline } from './standing.js';
export { airSteer, inAir } from './jump.js';
export { windAngle } from './windup.js';
export { mulberry32 } from './rng.js';
export { clamp, dashVelocity, fieldBounds, stepGhost, type Motion } from './geometry.js';
export { areaOf, scoreOf } from './modes/rules.js';
export { inZone } from './modes/hill.js';
export { AWARD_KINDS, awardsOf, ranked, type Award, type AwardKind } from './recap.js';
export { createBot, type Bot } from './bots/human.js';
export { simulate, botRoster, botSeed, SIM_TICK_MS, type SimulationReport } from './simulation.js';
