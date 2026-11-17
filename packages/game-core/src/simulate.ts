// Seasonal Sumo — `pnpm simulate --seed <n> [--mode sumo|hill|bomb]`: one full 32-bot match,
// printed: the season timeline with what each halving did, the scores per team and player, and
// the sanity list. Exits 1 if a sanity check fails.

import { modeArg, numberArg } from './cli-args.js';
import { DEFAULT_CONFIG, modeConfig } from './config.js';
import { simulate, type SimulationReport } from './simulation.js';

const TEAM_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];

function clock(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function print(r: SimulationReport, durationMs: number, mode: string): void {
  console.log(`Seasonal Sumo — simulated ${mode} match, seed ${r.seed}, ${r.roster.length} bots`);
  console.log('\nSeason timeline');
  for (const e of r.halvings) {
    const size = e.size === null ? 'the bombs go off' : `size ${e.size.toFixed(0)}`;
    console.log(`  ${clock(e.atMs)}  HALVING → ${e.season}, ${size}`);
  }
  console.log(`  ${clock(durationMs)}  end`);
  console.log(`\nFalls: ${r.falls.credited} credited, ${r.falls.uncredited} without credit`);
  console.log('\nScore per team');
  r.result.teams.forEach((v, t) => {
    console.log(`  ${(TEAM_NAMES[t] ?? '?').padEnd(7)} ${v}`);
  });
  console.log('\nPer player: score, knockouts, falls, bounces, passes, longest without a fall');
  for (const p of r.result.players) {
    const counts = [p.score, p.knockouts, p.falls, p.bounces, p.passes];
    console.log(
      `  #${String(p.id).padStart(2)} ${(TEAM_NAMES[p.team] ?? '?').padEnd(7)} ` +
        `${counts.map((n) => String(n).padStart(4)).join('')} ${clock(p.longestAliveMs)}`,
    );
  }
  console.log('\nSanity');
  for (const c of r.sanity) console.log(`  [${c.ok ? 'ok' : 'FAIL'}] ${c.name} — ${c.detail}`);
}

const argv = process.argv.slice(2);
const cfg = modeConfig(DEFAULT_CONFIG, modeArg(argv));
const report = simulate(cfg, numberArg(argv, '--seed', 1, 999_999_999));
print(report, cfg.matchDurationMs, cfg.mode);
process.exit(report.sanity.every((c) => c.ok) ? 0 : 1);
