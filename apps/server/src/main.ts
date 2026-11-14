// Seasonal Spirits — server entry point. Reads environment, starts the tick loop + WebSocket.
// Development only until the website sign-in is wired in; refuses NODE_ENV=production.

import { envInt, refuseProduction } from './env.js';
import { GameServer } from './server.js';

const env = process.env;
refuseProduction(env, 'The Seasonal Spirits dev server');

const cfg = {
  port: envInt(env, 'PORT', 3930, [1, 65535]),
  tickHz: envInt(env, 'TICK_HZ', 20, [1, 60]),
  world: envInt(env, 'WORLD', 2000, [100, 100_000]),
  speed: envInt(env, 'SPEED', 300, [1, 10_000]),
  maxGhosts: envInt(env, 'GHOSTS', 32, [1, 256]),
  maxInputsPerSecond: envInt(env, 'MAX_INPUTS_PER_SECOND', 20, [1, 1000]),
  // Room for 32 bots and a few viewers on one machine in development.
  maxConnectionsPerAddress: envInt(env, 'MAX_CONNECTIONS_PER_ADDRESS', 40, [1, 1000]),
  devCors: true,
};

const server = new GameServer(cfg);

await server.listen();
console.log(
  `Seasonal Spirits server listening on ws://localhost:${server.port()} ` +
    `(tick ${cfg.tickHz} Hz, world ${cfg.world}, speed ${cfg.speed}, ghosts ${cfg.maxGhosts})`,
);

process.on('SIGINT', () => {
  void server.close().then(() => process.exit(0));
});
