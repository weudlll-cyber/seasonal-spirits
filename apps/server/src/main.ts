// Seasonal Spirits — server entry point. Reads environment, starts the match server.
// Development only until the website sign-in is wired in; refuses NODE_ENV=production.

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import { envInt, refuseProduction } from './env.js';
import { GameServer } from './server.js';

const env = process.env;
refuseProduction(env, 'The Seasonal Spirits dev server');

const cfg = {
  port: envInt(env, 'PORT', 3930, [1, 65535]),
  tickHz: envInt(env, 'TICK_HZ', 20, [1, 60]),
  game: DEFAULT_CONFIG,
  // Teams take slots in turn (slot i is team i mod 4); 32 is CONCEPT.md §4.
  maxGhosts: envInt(env, 'GHOSTS', 32, [4, 252]),
  maxInputsPerSecond: envInt(env, 'MAX_INPUTS_PER_SECOND', 20, [1, 1000]),
  // Room for 32 bots and a few viewers on one machine in development.
  maxConnectionsPerAddress: envInt(env, 'MAX_CONNECTIONS_PER_ADDRESS', 40, [1, 1000]),
  helloTimeoutMs: 10_000,
  devCors: true,
  firstSeed: envInt(env, 'SEED', 1, [0, 999_999_999]),
};

const server = new GameServer(cfg);

await server.listen();
console.log(
  `Seasonal Spirits match server on ws://localhost:${server.port()} ` +
    `(tick ${cfg.tickHz} Hz, ${cfg.maxGhosts} slots, seed ${cfg.firstSeed})`,
);

process.on('SIGINT', () => {
  void server.close().then(() => process.exit(0));
});
