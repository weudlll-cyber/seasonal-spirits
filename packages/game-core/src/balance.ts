// Seasonal Spirits — balance by simulation: many headless 32-bot matches, summed up per
// strategy and per team. Teams rotate from match to match (match k shifts every slot's team
// by k), so a team's numbers measure its side of the field, not its players.

import type { GameConfig } from './config.js';
import { STRATEGIES, type Strategy } from './bots/strategies.js';
import { botRoster, simulate } from './simulation.js';
import { TEAMS, type Team } from './types.js';

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
}

export function rotatedRoster(match: number): ReturnType<typeof botRoster> {
  return botRoster(32).map((r) => ({ ...r, team: ((r.team + match) % 4) as Team }));
}

export function runBalance(cfg: GameConfig, matches: number, firstSeed: number): BalanceReport {
  const best = Object.fromEntries(STRATEGIES.map((s) => [s, 0])) as Record<Strategy, number>;
  const values = Object.fromEntries(STRATEGIES.map((s) => [s, [] as number[]])) as Record<
    Strategy,
    number[]
  >;
  const teamWins = TEAMS.map(() => 0);
  const cleared: number[] = [];
  const swaps: number[] = [];
  const steals: number[] = [];
  const stealCoins: number[] = []; // coins of every single steal, over all matches
  for (let k = 0; k < matches; k++) {
    const roster = rotatedRoster(k);
    let swapped = 0;
    let stole = 0;
    const r = simulate(cfg, firstSeed + k, roster, (s) => {
      for (const e of s.events) {
        if (e.type === 'swap') swapped++;
        if (e.type !== 'steal') continue;
        stole++;
        stealCoins.push(e.coins);
      }
    });
    swaps.push(swapped);
    steals.push(stole);
    const strategyOf = new Map(roster.map((x) => [x.id, x.strategy]));
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
    bestPlayerShare: Object.fromEntries(STRATEGIES.map((s) => [s, share(best[s])])) as Record<
      Strategy,
      number
    >,
    secured: Object.fromEntries(STRATEGIES.map((s) => [s, spread(values[s])])) as Record<
      Strategy,
      Spread
    >,
    teamWinShare: teamWins.map(share),
    clearedPerMatch: spread(cleared),
    swapsPerMatch: spread(swaps),
    stealsPerMatch: spread(steals),
    coinsPerSteal: spread(stealCoins),
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
