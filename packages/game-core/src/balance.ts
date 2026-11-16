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
  for (let k = 0; k < matches; k++) {
    const roster = rotatedRoster(k);
    const strategyOf = new Map(roster.map((x) => [x.id, x.strategy]));
    const r = simulate(cfg, firstSeed + k, roster);
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
