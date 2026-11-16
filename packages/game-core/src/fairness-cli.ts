// Seasonal Spirits — `pnpm fairness (--grid | --configs <file>) --matches <n>
// --seed <s> --jobs <j> --out <file>`: runs many configurations of the balance (balance.ts) in
// parallel child processes and writes every report with its distance from an even split (fairness.ts)
// to a JSON file, sorted, plus a Markdown summary on stdout. A child runs one slice
// (`--worker <file> --from <a> --to <b>`) and prints one JSON line per configuration.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBalance, type BalanceReport } from './balance.js';
import { numberArg, textArg } from './cli-args.js';
import { STRATEGIES } from './bots/strategies.js';
import { DEFAULT_CONFIG } from './config.js';
import {
  FAIR_MAX,
  FAIR_MIN,
  distanceFromEven,
  gridConfigs,
  meetsTarget,
  type Overrides,
} from './fairness.js';

interface Row {
  overrides: Overrides;
  report: BalanceReport;
  distance: number;
  meets: boolean;
}

function worker(argv: readonly string[]): void {
  const list = JSON.parse(fs.readFileSync(textArg(argv, '--worker') ?? '', 'utf8')) as Overrides[];
  const matches = numberArg(argv, '--matches', 30, 100_000);
  const seed = numberArg(argv, '--seed', 1, 999_999_999);
  const to = Math.min(list.length, numberArg(argv, '--to', list.length, 100_000));
  for (let k = numberArg(argv, '--from', 0, 100_000); k < to; k++) {
    const overrides = list[k] ?? {};
    const report = runBalance({ ...DEFAULT_CONFIG, ...overrides }, matches, seed);
    process.stdout.write(`${JSON.stringify({ overrides, report })}\n`);
  }
}

// One child per slice; resolves with the rows it printed.
function runSlice(
  listFile: string,
  from: number,
  to: number,
  argv: readonly string[],
): Promise<Row[]> {
  const self = fileURLToPath(import.meta.url);
  const pass = [
    '--matches',
    String(numberArg(argv, '--matches', 30, 100_000)),
    '--seed',
    String(numberArg(argv, '--seed', 1, 999_999_999)),
  ];
  const args = [
    ...process.execArgv,
    self,
    '--worker',
    listFile,
    '--from',
    String(from),
    '--to',
    String(to),
    ...pass,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (d: Buffer) => (out += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`slice ${from}–${to} exited with ${String(code)}`));
        return;
      }
      const rows = out
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Omit<Row, 'distance' | 'meets'>);
      resolve(
        rows.map((r) => ({
          ...r,
          distance: distanceFromEven(r.report),
          meets: meetsTarget(r.report),
        })),
      );
    });
  });
}

const pct = (v: number): string => `${(v * 100).toFixed(1)} %`;

function summary(rows: readonly Row[], top: number): string {
  const band = `${pct(FAIR_MIN)}–${pct(FAIR_MAX)}`;
  const lines = [
    `${rows.filter((r) => r.meets).length} of ${rows.length} configurations have every style within ${band}.`,
    '',
    `| prices | spawn weights | spawn/s | ${STRATEGIES.join(' | ')} | distance |`,
    `| --- | --- | --- | ${STRATEGIES.map(() => '---').join(' | ')} | --- |`,
  ];
  for (const r of rows.slice(0, top)) {
    const c = { ...DEFAULT_CONFIG, ...r.overrides };
    const shares = STRATEGIES.map((s) => pct(r.report.bestPlayerShare[s])).join(' | ');
    const board = (b: typeof c.prices): string => `${b.inSeason}/${b.next}/${b.other}`;
    lines.push(
      `| ${board(c.prices)} | ${board(c.spawnWeights)} | ${c.coinSpawnPerSecond} | ${shares} | ${r.distance.toFixed(1)} |`,
    );
  }
  return lines.join('\n');
}

async function main(argv: readonly string[]): Promise<void> {
  const configsFile = textArg(argv, '--configs');
  const fromFile = (f: string): Overrides[] =>
    JSON.parse(fs.readFileSync(f, 'utf8')) as Overrides[];
  const list = configsFile ? fromFile(configsFile) : gridConfigs();
  const jobs = Math.max(1, Math.min(list.length, numberArg(argv, '--jobs', 1, 64)));
  const listFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fairness-')), 'configs.json');
  fs.writeFileSync(listFile, JSON.stringify(list));
  const per = Math.ceil(list.length / jobs);
  const slices = Array.from({ length: jobs }, (_, j) =>
    runSlice(listFile, j * per, (j + 1) * per, argv),
  );
  const rows = (await Promise.all(slices)).flat().sort((a, b) => a.distance - b.distance);
  const out = textArg(argv, '--out');
  if (out) fs.writeFileSync(out, `${JSON.stringify(rows, null, 1)}\n`);
  console.log(summary(rows, numberArg(argv, '--top', 20, 10_000)));
}

const argv = process.argv.slice(2);
if (argv.includes('--worker')) worker(argv);
else await main(argv);
