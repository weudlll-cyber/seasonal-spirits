// Seasonal Spirits — the human round (session 2026-11-16-HUMAN): seeded 32-seat matches with
// the stand-in (standin.ts) in seat 1, the rest bots, teams rotating as in the balance
// (balance.ts rotatedRoster). Per match: the stand-in's pickups, secured value and rank; the
// same per bot strategy; the bots' best-player share; the shrine groups.

import { rotatedRoster, spread, type Spread } from '../balance.js';
import { STRATEGIES, type Strategy } from '../bots/strategies.js';
import type { GameConfig } from '../config.js';
import { simulate, type Seat } from '../simulation.js';
import { CoinLives } from './coins.js';
import { ShrineGroups, type ShrineGroup } from './groups.js';
import type { Sight } from './perception.js';
import { createStandIn } from './standin.js';

export const STAND_IN_SEAT = 1;

export interface HumanVariant {
  name: string;
  sight: Sight | null; // the stand-in's view and reaction time; null = no stand-in, all bots
}

interface Tally {
  coins: Spread; // field coins picked up, per player and match
  secured: Spread;
}

export interface HumanReport {
  variant: string;
  matches: number;
  firstSeed: number;
  standIn: Tally & { rank: Spread }; // rank 1 = most secured of all seats
  bots: Record<Strategy, Tally>;
  bestBotShare: Record<Strategy, number>; // the best bot of each match, by strategy; ties split
  groups: ShrineGroup[];
  coins: { spawned: number; pickedAfterMs: Spread; nearestAtSpawn: Spread };
}

// Seat 1 is the stand-in (with a sight), the other 31 seats are bots.
function seats(cfg: GameConfig, v: HumanVariant, k: number): Seat[] {
  const all = rotatedRoster(k);
  const sight = v.sight;
  if (!sight) return all;
  return all.map((r) => (r.id === STAND_IN_SEAT ? { ...r, bot: createStandIn(cfg, sight) } : r));
}

type Who = Strategy | 'standIn';

interface Row {
  who: Who;
  coins: number;
  secured: number;
}

// One match: every seat's row, the stand-in's rank (null without one), the best bots' strategies.
function playOne(
  cfg: GameConfig,
  roster: Seat[],
  seed: number,
  watch: { groups: ShrineGroup[]; lives: CoinLives },
): { rows: Row[]; rank: number | null; winners: Strategy[] } {
  const whoOf = new Map<number, Who>(roster.map((r) => [r.id, r.bot ? 'standIn' : r.strategy]));
  const groups = new ShrineGroups(cfg, whoOf);
  const coins = new Map<number, number>();
  const r = simulate(cfg, seed, roster, (s) => {
    groups.observe(s);
    watch.lives.observe(s);
    for (const e of s.events) {
      if (e.type === 'pickup') coins.set(e.ghost, (coins.get(e.ghost) ?? 0) + 1);
    }
  });
  watch.groups.push(...groups.groups);
  const players = r.result.players;
  const rows = players.map((p) => ({
    who: whoOf.get(p.id) ?? 'standIn',
    coins: coins.get(p.id) ?? 0,
    secured: p.secured,
  }));
  const me = players.find((p) => whoOf.get(p.id) === 'standIn');
  const bots = players.filter((p) => p !== me);
  const top = Math.max(...bots.map((p) => p.secured));
  return {
    rows,
    rank: me ? 1 + players.filter((p) => p.secured > me.secured).length : null,
    winners: bots.filter((p) => p.secured === top).map((p) => whoOf.get(p.id) as Strategy),
  };
}

export function runHumanRound(
  cfg: GameConfig,
  v: HumanVariant,
  matches: number,
  firstSeed: number,
): HumanReport {
  const rows: Row[] = [];
  const ranks: number[] = [];
  const best = Object.fromEntries(STRATEGIES.map((s) => [s, 0])) as Record<Strategy, number>;
  const watch = { groups: [] as ShrineGroup[], lives: new CoinLives() };
  for (let k = 0; k < matches; k++) {
    const one = playOne(cfg, seats(cfg, v, k), firstSeed + k, watch);
    rows.push(...one.rows);
    if (one.rank !== null) ranks.push(one.rank);
    for (const w of one.winners) best[w] += 1 / one.winners.length;
  }
  const { groups, lives } = watch;
  const tally = (who: Who): Tally => {
    const mine = rows.filter((x) => x.who === who);
    return {
      coins: spread(mine.map((x) => x.coins)),
      secured: spread(mine.map((x) => x.secured)),
    };
  };
  return {
    variant: v.name,
    matches,
    firstSeed,
    standIn: { ...tally('standIn'), rank: spread(ranks) },
    bots: Object.fromEntries(STRATEGIES.map((s) => [s, tally(s)])) as Record<Strategy, Tally>,
    bestBotShare: Object.fromEntries(STRATEGIES.map((s) => [s, best[s] / matches])) as Record<
      Strategy,
      number
    >,
    groups,
    coins: {
      spawned: lives.spawned,
      pickedAfterMs: spread(lives.pickedAfterMs),
      nearestAtSpawn: spread(lives.nearestAtSpawn),
    },
  };
}
