// Seasonal Spirits — server entry point. Reads environment, starts the match server.
// Development only until the game's own sign-in is wired in; refuses NODE_ENV=production.

import { fileURLToPath } from 'node:url';
import { rotationOf } from '@seasonal-spirits/game-core';
import { envChoice, envInt, refuseProduction } from './env.js';
import { homeOrigins } from './home-network.js';
import { PresetStore } from './presets.js';
import { GameServer, type ServerConfig } from './server.js';
import { startSettings } from './start-settings.js';

const env = process.env;
refuseProduction(env, 'The Seasonal Spirits dev server');

// The admin settings endpoint for the admin panel (NIGHT 2026-11-18): only with DEV_TUNING=1,
// which `pnpm dev` sets; the panel's page — /admin/ on the client's address, CLIENT_PORT (one
// address, chain 2026-11-21) — is the one page allowed to call, from this machine; in the LAN mode
// (HOST=0.0.0.0, `pnpm dev --lan`) also from the home network, the page on this machine's
// home-network address (owner decision 2026-11-21: /admin from the phone; home-network.ts). Its
// presets live in the repository's git-ignored dev data folder.
const admin = envChoice(env, 'DEV_TUNING', '0', ['0', '1'] as const) === '1';
const clientPort = envInt(env, 'CLIENT_PORT', 5930, [1, 65535]);
// PRESET_DIR: elsewhere (the browser specs keep theirs under test-results/).
const presetDir =
  env.PRESET_DIR ?? fileURLToPath(new URL('../../../data/presets', import.meta.url));

// Loopback only, unless `pnpm dev --lan` asks for the local network (a phone in the Wi-Fi).
const host = envChoice(env, 'HOST', '127.0.0.1', ['127.0.0.1', '0.0.0.0']);
const homeNetwork = admin && host === '0.0.0.0';

// Every gameplay number, the rotation and the seats: the defaults, a preset, the environment
// (start-settings.ts).
const { settings, preset } = startSettings(env, admin ? new PresetStore(presetDir) : null);

const cfg: ServerConfig = {
  port: envInt(env, 'PORT', 3930, [1, 65535]),
  host,
  tickHz: envInt(env, 'TICK_HZ', 20, [1, 60]),
  settings,
  maxInputsPerSecond: envInt(env, 'MAX_INPUTS_PER_SECOND', 20, [1, 1000]),
  // Room for 32 bots and a few viewers on one machine in development.
  maxConnectionsPerAddress: envInt(env, 'MAX_CONNECTIONS_PER_ADDRESS', 40, [1, 1000]),
  helloTimeoutMs: 10_000,
  devCors: true,
  firstSeed: envInt(env, 'SEED', 1, [0, 999_999_999]),
  adminOrigins: admin
    ? [
        `http://localhost:${clientPort}`,
        `http://127.0.0.1:${clientPort}`,
        ...(homeNetwork ? homeOrigins(clientPort) : []),
      ]
    : null,
  adminHomeNetwork: homeNetwork,
  presetDir,
};

const server = new GameServer(cfg);

await server.listen();
const rotation = rotationOf(settings).map((r) =>
  r.mode === 'sumo' ? `sumo ${r.variant}` : r.mode,
);
console.log(
  `Seasonal Spirits match server on ws://${cfg.host}:${server.port()} ` +
    `(tick ${cfg.tickHz} Hz, ${4 * settings.teamSize} seats, seed ${cfg.firstSeed}, ` +
    `rotation ${rotation.join(' → ')}, sumo seasons of ${settings.sumoSeason} s` +
    `${preset ? `, preset "${preset}"` : ''}${admin ? ', admin settings for /admin' : ''})`,
);

process.on('SIGINT', () => {
  void server.close().then(() => process.exit(0));
});
