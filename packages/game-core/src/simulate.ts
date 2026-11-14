// Seasonal Spirits — `pnpm simulate --seed <n>`: one full 32-bot match, printed.
// Season timeline, halving moment and pool size, final values per team and player, and the
// sanity list. Exits 1 if a sanity check fails.

import { DEFAULT_CONFIG } from './config.js';
import { simulate, type SimulationReport } from './simulation.js';

const TEAM_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];

function parseSeed(argv: readonly string[]): number {
  const i = argv.indexOf('--seed');
  if (i === -1) return 1;
  const raw = argv[i + 1] ?? '';
  const n = Number(raw);
  if (!/^\d{1,9}$/.test(raw) || !Number.isSafeInteger(n)) {
    console.error(`--seed needs a whole number from 0 to 999999999, got "${raw}"`);
    process.exit(2);
  }
  return n;
}

function clock(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function print(r: SimulationReport): void {
  console.log(`Seasonal Spirits — simulated match, seed ${r.seed}, ${r.roster.length} bots`);
  console.log('\nSeason timeline');
  console.log(`  0:00  ${DEFAULT_CONFIG.startSeason}`);
  for (const e of r.seasons) console.log(`  ${clock(e.atMs)}  ${e.season}`);
  console.log('\nHalving');
  if (r.halving) {
    console.log(
      `  at ${clock(r.halving.atMs)}: ${r.halving.carriedBefore} carried coins → ` +
        `${r.halving.carriedAfter} kept, ${r.halving.pooled} into the centre pool`,
    );
  }
  console.log('\nSecured value per team');
  r.result.teams.forEach((v, t) => {
    console.log(`  ${(TEAM_NAMES[t] ?? '?').padEnd(7)} ${v.toFixed(1)}`);
  });
  console.log('\nSecured value per player');
  for (const p of r.result.players) {
    const strategy = r.roster.find((x) => x.id === p.id)?.strategy ?? '?';
    console.log(
      `  #${String(p.id).padStart(2)} ${(TEAM_NAMES[p.team] ?? '?').padEnd(7)} ` +
        `${strategy.padEnd(8)} ${p.secured.toFixed(1)}`,
    );
  }
  console.log('\nSanity');
  for (const c of r.sanity) console.log(`  [${c.ok ? 'ok' : 'FAIL'}] ${c.name} — ${c.detail}`);
}

const report = simulate(DEFAULT_CONFIG, parseSeed(process.argv.slice(2)));
print(report);
process.exit(report.sanity.every((c) => c.ok) ? 0 : 1);
