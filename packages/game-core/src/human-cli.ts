// Seasonal Spirits — `pnpm human --matches <n> --seed <s> [--variant <name> ...]
// [--reaction <ms> ...] [--out <file>]`: the human round of session 2026-11-16-HUMAN
// (human/round.ts) for the named variants (human/variants.ts) and for desktop stand-ins with
// the given delays; every variant without either. Prints a Markdown summary, every number with its
// N, and writes every report to --out as JSON.

import fs from 'node:fs';
import type { Spread } from './balance.js';
import { STRATEGIES } from './bots/strategies.js';
import { listArg, numberArg, textArg } from './cli-args.js';
import { DEFAULT_CONFIG } from './config.js';
import { runHumanRound, type HumanReport } from './human/round.js';
import { HUMAN_VARIANTS, desktopAt } from './human/variants.js';

const argv = process.argv.slice(2);
const matches = numberArg(argv, '--matches', 30, 10_000);
const seed = numberArg(argv, '--seed', 1, 999_999_999);
const names = listArg(argv, '--variant');
const unknown = names.filter((n) => !HUMAN_VARIANTS.some((v) => v.name === n));
if (unknown.length > 0) {
  console.error(
    `unknown variant ${unknown.join(', ')}; known: ${HUMAN_VARIANTS.map((v) => v.name).join(', ')}`,
  );
  process.exit(2);
}
// `--reaction <ms>` (may repeat): the stand-in as a desktop player with that delay.
const reactions = listArg(argv, '--reaction').map((raw) => {
  if (!/^\d{1,4}$/.test(raw) || Number(raw) > 5000) {
    console.error(`--reaction needs a whole number of ms from 0 to 5000, got "${raw}"`);
    process.exit(2);
  }
  return desktopAt(Number(raw));
});
const named = HUMAN_VARIANTS.filter((v) => names.includes(v.name));
const chosen = names.length + reactions.length > 0 ? [...named, ...reactions] : HUMAN_VARIANTS;

const n1 = (x: number): string => x.toFixed(1);
const cells = (s: Spread): string =>
  `${n1(s.mean)} (${n1(s.median)} / ${n1(s.p10)} / ${n1(s.p90)})`;
const pct = (x: number): string => `${(x * 100).toFixed(1)} %`;

function print(r: HumanReport, ms: number): void {
  console.log(
    `\n### ${r.variant} — N = ${r.matches}, seeds ${r.firstSeed}–${r.firstSeed + r.matches - 1} (${(ms / 1000).toFixed(1)} s)`,
  );
  console.log(
    '\n| who | coins picked up | secured | robbed | rank |\n| --- | --- | --- | --- | --- |',
  );
  if (r.standIn.coins.n > 0) {
    console.log(
      `| stand-in | ${cells(r.standIn.coins)} | ${cells(r.standIn.secured)} | ${cells(r.standIn.robbed)} | ${cells(r.standIn.rank)} |`,
    );
  }
  for (const s of STRATEGIES) {
    const b = r.bots[s];
    console.log(
      `| ${s} (${b.coins.n}) | ${cells(b.coins)} | ${cells(b.secured)} | ${cells(b.robbed)} | |`,
    );
  }
  console.log(`\nBest bot: ${STRATEGIES.map((s) => `${s} ${pct(r.bestBotShare[s])}`).join(', ')}`);
  const c = r.coins;
  console.log(
    `Coins: ${c.spawned} spawned, ${c.cleared} cleared untouched at halvings; spawn → pickup ms ${cells(c.pickedAfterMs)}; nearest ghost at spawn ${cells(c.nearestAtSpawn)}`,
  );
  console.log(`Shrine groups (> 4 ghosts within 2 × shrineRadius): ${r.groups.length}`);
}

const reports: HumanReport[] = [];
for (const v of chosen) {
  const started = Date.now();
  const r = runHumanRound(DEFAULT_CONFIG, v, matches, seed);
  print(r, Date.now() - started);
  reports.push(r);
}
const out = textArg(argv, '--out');
if (out) fs.writeFileSync(out, `${JSON.stringify(reports, null, 1)}\n`);
