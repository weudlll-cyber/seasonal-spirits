// Seasonal Spirits — probe verdict tests: two measured criteria, jumps left to the eye.
// Guards the report wording that docs/PHASE0.md relies on.

import { describe, expect, it } from 'vitest';
import type { ServerMetrics } from '@seasonal-spirits/server';
import {
  evaluateCriteria,
  renderCriteria,
  renderReport,
  type ProbeConfig,
  type SpectatorSummary,
} from './report.js';

const cfg = { tickHz: 20 } as ProbeConfig;

function metrics(over: Partial<ServerMetrics>): ServerMetrics {
  return {
    achievedHz: 20,
    maxTickMs: 1,
    cpuPercentOfOneCore: 19,
    clients: 33,
    players: 32,
    ghosts: 32,
    stateBytes: 400,
    maxStateBytes: 566,
    startedAtMs: 0,
    uptimeMs: 120_000,
    ...over,
  };
}

function summary(jumpsPer60s: number): SpectatorSummary {
  return {
    statesReceived: 2400,
    bytesMin: 201,
    bytesAvg: 201,
    bytesMax: 201,
    jumpsPer60s,
    underrunsPer60s: 0,
    framesRendered: 7200,
    statesPerSecondInWindow: 20,
  };
}

describe('probe verdict', () => {
  it('fails the Hz/CPU criterion above 30 % of one core', () => {
    const c = evaluateCriteria(cfg, metrics({ cpuPercentOfOneCore: 31 }), summary(0));
    expect(c.hzUnder30Cpu).toBe(false);
  });

  it('fails the Hz/CPU criterion below 95 % of the target tick rate', () => {
    const c = evaluateCriteria(cfg, metrics({ achievedHz: 18.9 }), summary(0));
    expect(c.hzUnder30Cpu).toBe(false);
  });

  it('fails the size criterion when the largest message reaches 1024 bytes', () => {
    const c = evaluateCriteria(cfg, metrics({ stateBytes: 400, maxStateBytes: 1024 }), summary(0));
    expect(c.bytesUnder1Kb).toBe(false);
  });

  it('prints jumps as a count for the eye check, never as PASS or FAIL', () => {
    const lines = renderCriteria(evaluateCriteria(cfg, metrics({}), summary(32)));
    const jumpLine = lines.find((l) => l.includes('jumps'));
    expect(jumpLine).toBe(
      '- no visible jumps at 150 ms: jumps: 32/60 s — visibility is checked by eye (see docs/PHASE0.md)',
    );
  });

  it('keeps PASS for the two measured criteria regardless of the jump count', () => {
    const lines = renderCriteria(evaluateCriteria(cfg, metrics({}), summary(5712)));
    expect(lines).toContain('- 20 Hz with 32 bots under 30 % of one core: **PASS**');
    expect(lines).toContain('- state message under 1 KB: **PASS**');
    expect(lines.at(-1)).toBe('## Verdict: both measured criteria PASS; jumps by eye');
  });

  it('reports FAIL in the verdict when a measured criterion fails', () => {
    const lines = renderCriteria(
      evaluateCriteria(cfg, metrics({ maxStateBytes: 2000 }), summary(0)),
    );
    expect(lines).toContain('- state message under 1 KB: **FAIL**');
    expect(lines.at(-1)).toBe('## Verdict: at least one measured criterion FAIL; jumps by eye');
  });

  it('never prints the report directory, a machine path that may name the user', () => {
    const machineCfg = { tickHz: 20, reportDir: 'C:/Users/someone/reports' } as ProbeConfig;
    const text = renderReport({
      cfg: machineCfg,
      metrics: metrics({}),
      summary: summary(0),
      criteria: evaluateCriteria(machineCfg, metrics({}), summary(0)),
      hostname: 'host',
    });
    expect(text).not.toContain('someone');
    expect(text).not.toContain('reportDir');
  });
});
