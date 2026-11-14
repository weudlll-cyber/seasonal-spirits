// Seasonal Spirits — server entry point. Reads environment, starts the tick loop + WebSocket.

import { GameServer } from './server.js';

const cfg = {
  port: Number(process.env.PORT ?? 3930),
  tickHz: Number(process.env.TICK_HZ ?? 20),
  world: Number(process.env.WORLD ?? 2000),
  speed: Number(process.env.SPEED ?? 300),
  maxGhosts: Number(process.env.GHOSTS ?? 32),
  maxInputsPerSecond: Number(process.env.MAX_INPUTS_PER_SECOND ?? 20),
};

const server = new GameServer(cfg);

server.listen().then(() => {
  console.log(
    `Seasonal Spirits server listening on ws://localhost:${cfg.port} ` +
      `(tick ${cfg.tickHz} Hz, world ${cfg.world}, speed ${cfg.speed}, ghosts ${cfg.maxGhosts})`,
  );
});

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});
