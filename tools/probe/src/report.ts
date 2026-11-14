// Seasonal Spirits — probe criteria and the Markdown report under reports/phase0/.
// Pure functions, split from main.ts so the verdict can be tested without a probe run.

import os from 'node:os';
import type { ServerMetrics } from '@seasonal-spirits/server';
import type { HeadlessSpectator } from './spectator.js';

export interface ProbeConfig {
  port: number;
  tickHz: number;
  world: number;
  speed: number;
  maxGhosts: number;
  maxInputsPerSecond: number;
  latencyMin: number;
  latencyMax: number;
  durationS: number;
  bufferMs: number;
  reportDir: string;
}

export type SpectatorSummary = ReturnType<HeadlessSpectator['summary']>;

export interface Criteria {
  hzUnder30Cpu: boolean;
  bytesUnder1Kb: boolean;
  noVisibleJumps: boolean;
}

export interface ReportInput {
  cfg: ProbeConfig;
  metrics: ServerMetrics;
  summary: SpectatorSummary;
  criteria: Criteria;
  hostname: string;
}

export function evaluateCriteria(
  cfg: ProbeConfig,
  metrics: ServerMetrics,
  summary: SpectatorSummary,
): Criteria {
  return {
    hzUnder30Cpu: metrics.achievedHz >= cfg.tickHz * 0.95 && metrics.cpuPercentOfOneCore <= 30,
    bytesUnder1Kb: metrics.stateBytes < 1024,
    noVisibleJumps: summary.jumpsPer60s === 0,
  };
}

export function pf(v: boolean): string {
  return v ? 'PASS' : 'FAIL';
}

export function renderReport(r: ReportInput): string {
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
  lines.push(...renderCriteria(r.criteria));
  return lines.join('\n') + '\n';
}

function renderCriteria(c: Criteria): string[] {
  const allPass = c.hzUnder30Cpu && c.bytesUnder1Kb && c.noVisibleJumps;
  return [
    '## Criteria',
    `- 20 Hz with 32 bots under 30 % of one core: **${pf(c.hzUnder30Cpu)}**`,
    `- state message under 1 KB: **${pf(c.bytesUnder1Kb)}**`,
    `- no visible jumps at 150 ms (0 per 60 s): **${pf(c.noVisibleJumps)}**`,
    '',
    `## Verdict: ${allPass ? 'all three PASS' : 'at least one FAIL'}`,
  ];
}
