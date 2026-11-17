// Seasonal Spirits — probe entry point. Starts the server in-process, spawns GHOSTS bot
// clients and one headless spectator, runs for DURATION_S seconds, stops everything and
// writes a report under reports/phase0/.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_CONFIG, DEFAULT_SETTINGS } from '@seasonal-spirits/game-core';
import {
  GameServer,
  envInt,
  refuseProduction,
  teamSizeFromEnv,
  type ServerMetrics,
} from '@seasonal-spirits/server';
import { spawnBots } from './bot.js';
import {
  evaluateCriteria,
  jumpsLabel,
  pf,
  renderReport,
  type ProbeConfig,
  type SpectatorSummary,
} from './report.js';
import { HeadlessSpectator } from './spectator.js';

const env = process.env;
refuseProduction(env, 'The probe');
// GHOSTS seats (4–48, a multiple of 4), the server's own rule (start-settings.ts).
const teamSize = teamSizeFromEnv(env) ?? DEFAULT_SETTINGS.teamSize;

const cfg: ProbeConfig = {
  port: envInt(env, 'PORT', 3930, [1, 65535]),
  tickHz: envInt(env, 'TICK_HZ', 20, [1, 60]),
  // Field size and the fastest a ghost moves (a dash plus a knock) are the game's
  // (packages/game-core/src/config.ts).
  world: DEFAULT_CONFIG.fieldSize,
  speed: DEFAULT_CONFIG.dashSpeed + DEFAULT_CONFIG.knockSpeed,
  maxGhosts: 4 * teamSize,
  maxInputsPerSecond: envInt(env, 'MAX_INPUTS_PER_SECOND', 20, [1, 1000]),
  latencyMin: envInt(env, 'LATENCY_MIN', 100, [0, 10_000]),
  latencyMax: envInt(env, 'LATENCY_MAX', 200, [0, 10_000]),
  durationS: envInt(env, 'DURATION_S', 120, [1, 3600]),
  bufferMs: envInt(env, 'BUFFER_MS', 100, [0, 10_000]),
  reportDir: env.REPORT_DIR ?? path.resolve(env.INIT_CWD ?? process.cwd(), 'reports/phase0'),
};

async function main(): Promise<void> {
  console.log(`[probe] starting server on port ${cfg.port}`);
  const server = new GameServer({
    port: cfg.port,
    host: '127.0.0.1', // server and every client of the probe run on this machine
    tickHz: cfg.tickHz,
    settings: { ...DEFAULT_SETTINGS, teamSize },
    maxInputsPerSecond: cfg.maxInputsPerSecond,
    // All bots and the spectator connect from this machine.
    maxConnectionsPerAddress: cfg.maxGhosts + 1,
    helloTimeoutMs: 10_000,
    devCors: false,
    firstSeed: 1,
  });
  await server.listen();

  // A short warm-up before clients connect so the HTTP listener is fully ready.
  await sleep(50);

  console.log(`[probe] spawning ${cfg.maxGhosts} bots`);
  const url = `ws://127.0.0.1:${cfg.port}`;
  const bots = spawnBots(cfg.maxGhosts, {
    url,
    worldSize: cfg.world,
    latencyMinMs: cfg.latencyMin,
    latencyMaxMs: cfg.latencyMax,
  });

  // Give bots a moment to say hello, then reset the server's metrics window so the
  // reported numbers reflect the measurement period, not the ramp-up.
  await sleep(1500);
  server.resetMetricsWindow();

  console.log(`[probe] starting headless spectator`);
  const spectator = new HeadlessSpectator({
    url,
    latencyMinMs: cfg.latencyMin,
    latencyMaxMs: cfg.latencyMax,
    bufferMs: cfg.bufferMs,
    frameHz: 60,
    speedUnitsPerSecond: cfg.speed,
  });

  console.log(`[probe] running for ${cfg.durationS} s`);
  await sleep(cfg.durationS * 1000);

  const metrics = server.metrics();
  const summary = spectator.summary();

  console.log(`[probe] stopping clients and server`);
  spectator.close();
  for (const b of bots) b.close();
  await sleep(200);
  await server.close();

  await writeReport(metrics, summary);
  // Exit 0 either way: the report is the result (per task).
  process.exit(0);
}

async function writeReport(metrics: ServerMetrics, summary: SpectatorSummary): Promise<void> {
  const criteria = evaluateCriteria(cfg, metrics, summary);
  await fs.mkdir(cfg.reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const hostname = os.hostname();
  const reportPath = path.join(cfg.reportDir, `${stamp}-${hostname}.md`);
  await fs.writeFile(
    reportPath,
    renderReport({ cfg, metrics, summary, criteria, hostname }),
    'utf8',
  );
  console.log(`[probe] wrote ${reportPath}`);
  console.log(
    `[probe] criteria: hz-cpu=${pf(criteria.hzUnder30Cpu)} ` +
      `bytes=${pf(criteria.bytesUnder1Kb)} ${jumpsLabel(criteria.jumpsPer60s)}`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
