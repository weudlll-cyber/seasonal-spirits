// Seasonal Spirits — demo bots for `pnpm dev`: GHOSTS probe bots on the running server.
// They give the viewer live ghosts to show; same bots as the probe, without artificial delay.
// Runs until stopped (`pnpm dev:stop`).

import { envInt, refuseProduction } from '@seasonal-spirits/server';
import { spawnBots } from './bot.js';

const env = process.env;
refuseProduction(env, 'The demo bots');
const port = envInt(env, 'PORT', 3930, [1, 65535]);
const count = envInt(env, 'GHOSTS', 32, [1, 256]);

spawnBots(count, {
  url: `ws://localhost:${port}`,
  worldSize: envInt(env, 'WORLD', 2000, [100, 100_000]),
  latencyMinMs: 0,
  latencyMaxMs: 0,
});
console.log(`[demo-bots] ${count} bots connecting to ws://localhost:${port}`);
