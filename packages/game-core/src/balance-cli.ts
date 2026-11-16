// Seasonal Spirits — `pnpm balance --matches <n> --seed <s> [--variant <name> ...]`.
// Runs n headless 32-bot matches (seeds s … s+n−1, teams rotating) for the current config and
// for each named variant (one change each), and prints per strategy and per team, every
// number with its N. Without --variant only the current config runs; --variant all runs all.

import { STRATEGIES } from './bots/strategies.js';
import { runBalance, type BalanceReport, type Spread } from './balance.js';
import { listArg, numberArg } from './cli-args.js';
import { DEFAULT_CONFIG, type GameConfig } from './config.js';

export const VARIANTS: Record<string, Partial<GameConfig>> = {
  current: {},
  'coinSpawnPerSecond=1': { coinSpawnPerSecond: 1 },
  'coinSpawnPerSecond=3': { coinSpawnPerSecond: 3 },
  'carrySpeedFactor=0.5': { carrySpeedFactor: 0.5 },
  'carrySpeedFactor=0.85': { carrySpeedFactor: 0.85 },
};

const TEAM_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];

function variants(argv: readonly string[]): string[] {
  const names = listArg(argv, '--variant');
  if (names.includes('all')) return Object.keys(VARIANTS);
  const unknown = names.filter((n) => !(n in VARIANTS));
  if (unknown.length > 0) {
    console.error(
      `unknown variant ${unknown.join(', ')}; known: ${Object.keys(VARIANTS).join(', ')}`,
    );
    process.exit(2);
  }
  return names.length > 0 ? names : ['current'];
}

const pct = (x: number): string => `${(x * 100).toFixed(1)} %`;
const num = (x: number): string => x.toFixed(1);
const spreadCells = (s: Spread): string =>
  `${num(s.mean)} | ${num(s.median)} | ${num(s.p10)} | ${num(s.p90)}`;

function print(name: string, r: BalanceReport): void {
  const n = r.matches;
  console.log(`\n### ${name} — N = ${n} matches, seeds ${r.firstSeed}–${r.firstSeed + n - 1}`);
  console.log('\n| Strategy | Best player of the match | Mean | Median | p10 | p90 | Players |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const s of STRATEGIES) {
    const v = r.secured[s];
    console.log(`| ${s} | ${pct(r.bestPlayerShare[s])} | ${spreadCells(v)} | ${v.n} |`);
  }
  console.log(`\n| Team | Matches won (N = ${n}) |\n| --- | --- |`);
  r.teamWinShare.forEach((w, t) => {
    console.log(`| ${TEAM_NAMES[t] ?? '?'} | ${pct(w)} |`);
  });
  const perMatch = (label: string, x: Spread): string =>
    `${label}, per match (N = ${n}): mean ${num(x.mean)}, median ${num(x.median)}, ` +
    `p10 ${num(x.p10)}, p90 ${num(x.p90)}`;
  console.log(`\n${perMatch('Field coins gone at the halvings', r.clearedPerMatch)}`);
}

const argv = process.argv.slice(2);
const matches = numberArg(argv, '--matches', 30, 10_000);
const seed = numberArg(argv, '--seed', 1, 999_999_999);
for (const name of variants(argv)) {
  const cfg: GameConfig = { ...DEFAULT_CONFIG, ...VARIANTS[name] };
  print(name, runBalance(cfg, matches, seed));
}
