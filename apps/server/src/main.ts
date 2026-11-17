// Seasonal Spirits — server entry point. Reads environment, starts the match server.
// Development only until the website sign-in is wired in; refuses NODE_ENV=production.

import { DEFAULT_CONFIG, GAME_MODES, type GameConfig } from '@seasonal-spirits/game-core';
import { envChoice, envInt, refuseProduction } from './env.js';
import { GameServer, type ServerConfig } from './server.js';

const env = process.env;
refuseProduction(env, 'The Seasonal Spirits dev server');

// The game mode of every match, or "rotate": sumo → hill → bomb → sumo …, match by match
// (`pnpm dev` asks for the rotation; NIGHT 2026-11-17, piece 5).
const mode = envChoice(env, 'GAME_MODE', 'sumo', [...GAME_MODES, 'rotate'] as const);
const modes = mode === 'rotate' ? GAME_MODES : [mode];

// Shorter sumo matches for tests and trying things out (development only, like the whole
// server): four seasons of SEASON_SECONDS, then RESULT_SECONDS of result screen. Hill and bomb
// keep their own times (game-core modeConfig).
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
  modes,
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
  `Seasonal Spirits match server on ws://${cfg.host}:${server.port()} ` +
    `(tick ${cfg.tickHz} Hz, ${cfg.maxGhosts} slots, seed ${cfg.firstSeed}, ` +
    `modes ${modes.join(' → ')}, sumo seasons of ${seasonMs / 1000} s)`,
);

process.on('SIGINT', () => {
  void server.close().then(() => process.exit(0));
});
