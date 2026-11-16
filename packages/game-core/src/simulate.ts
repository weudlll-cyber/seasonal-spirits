// Seasonal Sumo — `pnpm simulate --seed <n>`: one full 32-bot match, printed.
// Season timeline with the halvings and the arena's radius, knockouts per team and player, and
// the sanity list. Exits 1 if a sanity check fails.

import { numberArg } from './cli-args.js';
import { DEFAULT_CONFIG } from './config.js';
import { simulate, type SimulationReport } from './simulation.js';

const TEAM_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];

function clock(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function print(r: SimulationReport): void {
  console.log(`Seasonal Sumo — simulated match, seed ${r.seed}, ${r.roster.length} bots`);
  console.log('\nSeason timeline');
  console.log(`  0:00  ${DEFAULT_CONFIG.startSeason}, arena radius ${DEFAULT_CONFIG.arenaRadius}`);
  for (const e of r.halvings) {
    console.log(`  ${clock(e.atMs)}  HALVING → ${e.season}, arena radius ${e.radius.toFixed(0)}`);
  }
  console.log(`  ${clock(DEFAULT_CONFIG.matchDurationMs)}  end`);
  console.log(`\nFalls: ${r.falls.credited} credited, ${r.falls.uncredited} without credit`);
  console.log('\nKnockouts per team');
  r.result.teams.forEach((v, t) => {
    console.log(`  ${(TEAM_NAMES[t] ?? '?').padEnd(7)} ${v}`);
  });
  console.log('\nPer player: knockouts, falls, longest on the arena');
  for (const p of r.result.players) {
    console.log(
      `  #${String(p.id).padStart(2)} ${(TEAM_NAMES[p.team] ?? '?').padEnd(7)} ` +
        `${String(p.knockouts).padStart(3)} ${String(p.falls).padStart(3)} ${clock(p.longestAliveMs)}`,
    );
  }
  console.log('\nSanity');
  for (const c of r.sanity) console.log(`  [${c.ok ? 'ok' : 'FAIL'}] ${c.name} — ${c.detail}`);
}

const report = simulate(DEFAULT_CONFIG, numberArg(process.argv.slice(2), '--seed', 1, 999_999_999));
print(report);
process.exit(report.sanity.every((c) => c.ok) ? 0 : 1);
