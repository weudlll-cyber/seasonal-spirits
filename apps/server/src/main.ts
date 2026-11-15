// Seasonal Spirits — server entry point. Reads environment, starts the match server.
// Development only until the website sign-in is wired in; refuses NODE_ENV=production.

import { DEFAULT_CONFIG, type GameConfig } from '@seasonal-spirits/game-core';
import { envChoice, envInt, refuseProduction } from './env.js';
import { SCENARIOS } from './scenario.js';
import { GameServer, type ServerConfig } from './server.js';

const env = process.env;
refuseProduction(env, 'The Seasonal Spirits dev server');

// Shorter matches for tests and trying things out (development only, like the whole server):
// four seasons of SEASON_SECONDS, then RESULT_SECONDS of result screen.
const seasonMs = envInt(env, 'SEASON_SECONDS', 75, [15, 75]) * 1000;
const game: GameConfig = {
  ...DEFAULT_CONFIG,
  seasonDurationMs: seasonMs,
  matchDurationMs: 4 * seasonMs,
  resultPauseMs: envInt(env, 'RESULT_SECONDS', 15, [3, 60]) * 1000,
};

const cfg: ServerConfig = {
  port: envInt(env, 'PORT', 3930, [1, 65535]),
  // Loopback only, unless `pnpm dev --lan` asks for the local network (a phone in the Wi-Fi).
  host: envChoice(env, 'HOST', '127.0.0.1', ['127.0.0.1', '0.0.0.0']),
  tickHz: envInt(env, 'TICK_HZ', 20, [1, 60]),
  game,
  // Teams take slots in turn (slot i is team i mod 4); 32 is CONCEPT.md §4.
  maxGhosts: envInt(env, 'GHOSTS', 32, [4, 252]),
  maxInputsPerSecond: envInt(env, 'MAX_INPUTS_PER_SECOND', 20, [1, 1000]),
  // Room for 32 bots and a few viewers on one machine in development.
  maxConnectionsPerAddress: envInt(env, 'MAX_CONNECTIONS_PER_ADDRESS', 40, [1, 1000]),
  helloTimeoutMs: 10_000,
  devCors: true,
  firstSeed: envInt(env, 'SEED', 1, [0, 999_999_999]),
  // A staged situation for the browser specs: "steal" puts every joining player beside a
  // hunter, "shield" beside a carrier of steal-proof coins (scenario.ts). Never set by
  // `pnpm dev`.
  scenario: envChoice(env, 'SCENARIO', 'none', SCENARIOS),
};

const server = new GameServer(cfg);

await server.listen();
console.log(
  `Seasonal Spirits match server on ws://${cfg.host}:${server.port()} ` +
    `(tick ${cfg.tickHz} Hz, ${cfg.maxGhosts} slots, seed ${cfg.firstSeed}, ` +
    `seasons of ${seasonMs / 1000} s)`,
);

process.on('SIGINT', () => {
  void server.close().then(() => process.exit(0));
});
