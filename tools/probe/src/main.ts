// Seasonal Spirits — probe entry point. Starts the server in-process, spawns GHOSTS bot
// clients and one headless spectator, runs for DURATION_S seconds, stops everything and
// writes a report under reports/phase0/.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GameServer } from '@seasonal-spirits/server';
import { ProbeBot } from './bot.js';
import { HeadlessSpectator } from './spectator.js';

const cfg = {
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
  const bots: ProbeBot[] = [];
  const url = `ws://localhost:${cfg.port}`;
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

  const stateBytes = metrics.stateBytes;
  const criteria = {
    hzUnder30Cpu: metrics.achievedHz >= cfg.tickHz * 0.95 && metrics.cpuPercentOfOneCore <= 30,
    bytesUnder1Kb: stateBytes < 1024,
    noVisibleJumps: summary.jumpsPer60s === 0,
  };

  await fs.mkdir(cfg.reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const hostname = os.hostname();
  const reportPath = path.join(cfg.reportDir, `${stamp}-${hostname}.md`);

  const md = renderReport({ cfg, metrics, summary, criteria, hostname });
  await fs.writeFile(reportPath, md, 'utf8');
  console.log(`[probe] wrote ${reportPath}`);
  const allPass = criteria.hzUnder30Cpu && criteria.bytesUnder1Kb && criteria.noVisibleJumps;
  console.log(
    `[probe] criteria: hz-cpu=${pf(criteria.hzUnder30Cpu)} ` +
      `bytes=${pf(criteria.bytesUnder1Kb)} no-jumps=${pf(criteria.noVisibleJumps)} ` +
      `→ ${allPass ? 'PASS' : 'FAIL'}`,
  );
  // Exit 0 either way: the report is the result (per task).
  process.exit(0);
}

function pf(v: boolean): string {
  return v ? 'PASS' : 'FAIL';
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface ReportInput {
  cfg: typeof cfg;
  metrics: {
    achievedHz: number;
    maxTickMs: number;
    cpuPercentOfOneCore: number;
    clients: number;
    ghosts: number;
    stateBytes: number;
    uptimeMs: number;
  };
  summary: ReturnType<HeadlessSpectator['summary']>;
  criteria: { hzUnder30Cpu: boolean; bytesUnder1Kb: boolean; noVisibleJumps: boolean };
  hostname: string;
}

function renderReport(r: ReportInput): string {
  const lines: string[] = [];
  lines.push(`# Phase 0 probe — ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`Host: \`${r.hostname}\``);
  lines.push(
    `OS: ${os.platform()} ${os.release()} · CPU: ${os.cpus()[0]?.model ?? 'unknown'} · ` +
      `cores: ${os.cpus().length} · Node: ${process.version}`,
  );
  lines.push('');
  lines.push('## Configuration');
  lines.push('```');
  lines.push(JSON.stringify(r.cfg, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Server numbers');
  lines.push(`- achieved Hz: **${r.metrics.achievedHz.toFixed(2)}** (target ${r.cfg.tickHz})`);
  lines.push(`- server CPU: **${r.metrics.cpuPercentOfOneCore.toFixed(2)} %** of one core`);
  lines.push(`- max tick duration: **${r.metrics.maxTickMs} ms**`);
  lines.push(`- clients connected: ${r.metrics.clients}`);
  lines.push(`- ghosts on map: ${r.metrics.ghosts}`);
  lines.push(`- bytes per state message: **${r.metrics.stateBytes}** (header 9 + 6 per ghost)`);
  lines.push('');
  lines.push('## Spectator numbers');
  lines.push(`- states received: ${r.summary.statesReceived}`);
  lines.push(`- states/s in the window: ${r.summary.statesPerSecondInWindow.toFixed(2)}`);
  lines.push(
    `- bytes per message: min ${r.summary.bytesMin} · avg ${r.summary.bytesAvg} · max ${r.summary.bytesMax}`,
  );
  lines.push(`- frames rendered: ${r.summary.framesRendered}`);
  lines.push(`- jumps per 60 s: **${r.summary.jumpsPer60s}**`);
  lines.push(`- underruns per 60 s: ${r.summary.underrunsPer60s}`);
  lines.push('');
  lines.push('## Criteria');
  lines.push(
    `- 20 Hz with 32 bots under 30 % of one core: **${r.criteria.hzUnder30Cpu ? 'PASS' : 'FAIL'}**`,
  );
  lines.push(`- state message under 1 KB: **${r.criteria.bytesUnder1Kb ? 'PASS' : 'FAIL'}**`);
  lines.push(
    `- no visible jumps at 150 ms (0 per 60 s): **${r.criteria.noVisibleJumps ? 'PASS' : 'FAIL'}**`,
  );
  lines.push('');
  const allPass = r.criteria.hzUnder30Cpu && r.criteria.bytesUnder1Kb && r.criteria.noVisibleJumps;
  lines.push(`## Verdict: ${allPass ? 'all three PASS' : 'at least one FAIL'}`);
  return lines.join('\n') + '\n';
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
