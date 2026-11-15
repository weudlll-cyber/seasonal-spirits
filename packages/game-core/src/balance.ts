// Seasonal Spirits — balance by simulation: many headless 32-bot matches, summed up per
// strategy and per team. Teams rotate from match to match (match k shifts every slot's team
// by k), so a team's numbers measure its side of the field, not its players.

import type { GameConfig } from './config.js';
import { STRATEGIES, type Strategy } from './bots/strategies.js';
import { botRoster, simulate } from './simulation.js';
import { TEAMS, type MatchEvent, type Team } from './types.js';

export interface Spread {
  n: number; // how many values
  mean: number;
  median: number;
  p10: number;
  p90: number;
}

export interface BalanceReport {
  matches: number;
  firstSeed: number;
  // Share of matches whose best player (most secured) used this strategy; ties split.
  bestPlayerShare: Record<Strategy, number>;
  secured: Record<Strategy, Spread>; // per player and match
  teamWinShare: number[]; // index = team; ties split
  clearedPerMatch: Spread; // field coins that disappeared at the halvings
  swapsPerMatch: Spread; // swaps by all ghosts in a match: whether swapping happens at all
  stealsPerMatch: Spread; // steals by all ghosts in a match
  coinsPerSteal: Spread; // coins one steal took, over every steal of every match
  stealsByPair: StealMatrix; // steals per match (mean), thief strategy → victim strategy
}

export type StealMatrix = Record<Strategy, Record<Strategy, number>>;

interface MatchCount {
  swaps: number;
  steals: number;
}

interface Totals {
  stealCoins: number[]; // coins of every single steal, over all matches
  pairs: StealMatrix; // steals summed over all matches
}

// One tick's events into this match's counts and the totals over all matches.
function countEvents(
  events: readonly MatchEvent[],
  strategyOf: ReadonlyMap<number, Strategy>,
  match: MatchCount,
  totals: Totals,
): void {
  for (const e of events) {
    if (e.type === 'swap') match.swaps++;
    if (e.type !== 'steal') continue;
    match.steals++;
    totals.stealCoins.push(e.coins);
    const thief = strategyOf.get(e.thief);
    const victim = strategyOf.get(e.victim);
    if (thief && victim) totals.pairs[thief][victim]++;
  }
}

const perStrategy = <T>(make: (s: Strategy) => T): Record<Strategy, T> =>
  Object.fromEntries(STRATEGIES.map((s) => [s, make(s)])) as Record<Strategy, T>;

export function rotatedRoster(match: number): ReturnType<typeof botRoster> {
  return botRoster(32).map((r) => ({ ...r, team: ((r.team + match) % 4) as Team }));
}

export function runBalance(cfg: GameConfig, matches: number, firstSeed: number): BalanceReport {
  const best = perStrategy(() => 0);
  const values = perStrategy(() => [] as number[]);
  const teamWins = TEAMS.map(() => 0);
  const cleared: number[] = [];
  const swaps: number[] = [];
  const steals: number[] = [];
  const totals: Totals = { stealCoins: [], pairs: perStrategy(() => perStrategy(() => 0)) };
  for (let k = 0; k < matches; k++) {
    const roster = rotatedRoster(k);
    const strategyOf = new Map(roster.map((x) => [x.id, x.strategy]));
    const count: MatchCount = { swaps: 0, steals: 0 };
    const r = simulate(cfg, firstSeed + k, roster, (s) => {
      countEvents(s.events, strategyOf, count, totals);
    });
    swaps.push(count.swaps);
    steals.push(count.steals);
    const top = Math.max(...r.result.players.map((p) => p.secured));
    const winners = r.result.players.filter((p) => p.secured === top);
    for (const p of r.result.players) {
      const s = strategyOf.get(p.id) ?? 'patient';
      values[s].push(p.secured);
      if (p.secured === top) best[s] += 1 / winners.length;
    }
    const topTeam = Math.max(...r.result.teams);
    const winningTeams = TEAMS.filter((t) => r.result.teams[t] === topTeam);
    for (const t of winningTeams) teamWins[t] = (teamWins[t] ?? 0) + 1 / winningTeams.length;
    cleared.push(r.halvings.reduce((n, h) => n + h.event.fieldCoinsCleared, 0));
  }
  const share = (n: number): number => n / matches;
  return {
    matches,
    firstSeed,
    bestPlayerShare: perStrategy((s) => share(best[s])),
    secured: perStrategy((s) => spread(values[s])),
    teamWinShare: teamWins.map(share),
    clearedPerMatch: spread(cleared),
    swapsPerMatch: spread(swaps),
    stealsPerMatch: spread(steals),
    coinsPerSteal: spread(totals.stealCoins),
    stealsByPair: perStrategy((t) => perStrategy((v) => share(totals.pairs[t][v]))),
  };
}

// Nearest-rank percentiles; the median of an even count is the mean of the middle two.
export function spread(xs: readonly number[]): Spread {
  if (xs.length === 0) return { n: 0, mean: 0, median: 0, p10: 0, p90: 0 };
  const s = [...xs].sort((a, b) => a - b);
  const at = (q: number): number => s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)] ?? 0;
  const mid = s.length / 2;
  const median = s.length % 2 ? (s[Math.floor(mid)] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return { n: s.length, mean, median, p10: at(0.1), p90: at(0.9) };
}
