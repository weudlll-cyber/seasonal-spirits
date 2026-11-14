// Seasonal Spirits — probe entry point. Starts the server in-process, spawns GHOSTS bot
// clients and one headless spectator, runs for DURATION_S seconds, stops everything and
// writes a report under reports/phase0/.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GameServer, type ServerMetrics } from '@seasonal-spirits/server';
import { ProbeBot } from './bot.js';
import {
  evaluateCriteria,
  jumpsLabel,
  pf,
  renderReport,
  type ProbeConfig,
  type SpectatorSummary,
} from './report.js';
import { HeadlessSpectator } from './spectator.js';

const cfg: ProbeConfig = {
  port: Number(process.env.PORT ?? 3930),
  tickHz: Number(process.env.TICK_HZ ?? 20),
  world: Number(process.env.WORLD ?? 2000),
  speed: Number(process.env.SPEED ?? 300),
  maxGhosts: Number(process.env.GHOSTS ?? 32),
  maxInputsPerSecond: Number(process.env.MAX_INPUTS_PER_SECOND ?? 20),
  latencyMin: Number(process.env.LATENCY_MIN ?? 100),
  latencyMax: Number(process.env.LATENCY_MAX ?? 200),
  durationS: Number(process.env.DURATION_S ?? 120),
  bufferMs: Number(process.env.BUFFER_MS ?? 100),
  reportDir:
    process.env.REPORT_DIR ?? path.resolve(process.env.INIT_CWD ?? process.cwd(), 'reports/phase0'),
};

async function main(): Promise<void> {
  console.log(`[probe] starting server on port ${cfg.port}`);
  const server = new GameServer({
    port: cfg.port,
    tickHz: cfg.tickHz,
    world: cfg.world,
    speed: cfg.speed,
    maxGhosts: cfg.maxGhosts,
    maxInputsPerSecond: cfg.maxInputsPerSecond,
  });
  await server.listen();

  // A short warm-up before clients connect so the HTTP listener is fully ready.
  await sleep(50);

  console.log(`[probe] spawning ${cfg.maxGhosts} bots`);
  const url = `ws://localhost:${cfg.port}`;
  const bots = spawnBots(url);

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

function spawnBots(url: string): ProbeBot[] {
  const bots: ProbeBot[] = [];
  for (let i = 0; i < cfg.maxGhosts; i++) {
    bots.push(
      new ProbeBot({
        url,
        worldSize: cfg.world,
        latencyMinMs: cfg.latencyMin,
        latencyMaxMs: cfg.latencyMax,
        seed: i * 2654435761,
      }),
    );
  }
  return bots;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
