// Seasonal Sumo — lives and sumo's two variants (LIVES 2026-11-17): a fall costs a life and the
// last one puts a ghost out for the rest of the match; Points ends at its time limit or when one
// team is left; Last One Standing ends with one ghost, or with "stop-time" at the time limit by
// ghosts left, then lives, then team order; "keep-halving" halves on at its interval until one
// is left, "stop-open" keeps the size with no time limit. The teams knocked out are kept in order.

import { describe, expect, it } from 'vitest';
import type { AfterLast, GameConfig, SumoVariant } from './config.js';
import { Match, type Roster } from './match.js';
import { nextDeadline } from './standing.js';
import { cfg, ghost, place, runTo } from './test-helpers.js';
import type { Team } from './types.js';

// Short seasons: halvings at 250, 500 and 750 ms, the time limit at 1000 ms.
function rules(lives: number, afterLast: AfterLast = 'stop-time'): GameConfig {
  const sumo = { ...cfg.sumo, lives, afterLast, halvingEveryMs: 200 };
  return { ...cfg, seasonDurationMs: 250, matchDurationMs: 1000, sumo };
}

const roster = (...teams: Team[]): Roster[] => teams.map((team, i) => ({ id: i + 1, team }));

function matchOf(c: GameConfig, r: Roster[], variant: SumoVariant): Match {
  return new Match(c, 1, r, variant);
}

// Waits for the ghost's respawn, then puts it past the edge: it falls in the next tick.
function drop(m: Match, id: number): void {
  while (ghost(m, id).phase !== 'in' && !m.state.ended) m.tick(50, new Map());
  if (m.state.ended) return;
  place(m, id, m.state.arena.radius + 40, 0);
  m.tick(50, new Map());
}

function knockOut(m: Match, id: number): void {
  while (ghost(m, id).lives > 0 && !m.state.ended) drop(m, id);
}

describe('lives', () => {
  it('a fall costs one; with lives left the ghost comes back, after the last it stays out', () => {
    const long = { ...cfg, sumo: { ...cfg.sumo, lives: 3 } };
    const m = matchOf(long, roster(0, 1, 2, 3), 'points');
    drop(m, 2);
    expect(ghost(m, 2).lives).toBe(2);
    drop(m, 2);
    drop(m, 2);
    expect(ghost(m, 2)).toMatchObject({ lives: 0, falls: 3 });
    runTo(m, m.state.elapsedMs + 10_000);
    // No respawn and no seat refilled: the same four ghosts, the fallen one out.
    expect(ghost(m, 2).phase).toBe('out');
    expect(m.state.ghosts.map((g) => g.id)).toEqual([1, 2, 3, 4]);
    expect(m.state.knockedOut).toEqual([1]);
    expect(m.state.ended).toBe(false);
  });
});

describe('Points', () => {
  it('ends at its time limit, with no winner named (the scores rank)', () => {
    const m = matchOf(rules(1), roster(0, 1), 'points');
    runTo(m, 2000);
    expect(m.state).toMatchObject({ ended: true, elapsedMs: 1000, winner: null });
  });

  it('ends earlier, once only one team has ghosts left', () => {
    const m = matchOf({ ...rules(1), matchDurationMs: 60_000 }, roster(0, 0, 1, 2), 'points');
    knockOut(m, 3);
    expect(m.state.ended).toBe(false);
    knockOut(m, 4);
    expect(m.state.ended).toBe(true);
    expect(m.state.elapsedMs).toBeLessThan(1000);
    expect(m.result().knockedOut).toEqual([1, 2]);
  });
});

describe('Last One Standing', () => {
  it('plays on when one team is left and ends with one ghost: it and its team win', () => {
    const m = matchOf(
      { ...rules(1), matchDurationMs: 60_000 },
      roster(0, 0, 1, 1),
      'last-standing',
    );
    knockOut(m, 3);
    knockOut(m, 4);
    expect(m.state.ended).toBe(false); // two of Spring still in
    knockOut(m, 1);
    expect(m.state).toMatchObject({ ended: true, winner: 0, lastStanding: 2 });
    expect(m.result().knockedOut).toEqual([1]);
  });

  // "stop-time": at the time limit the most ghosts still in, then the most lives, then the
  // lowest team order.
  it.each([
    ['most ghosts still in', [2, 2, 3, 0], 0],
    ['equal ghosts, most lives in total', [1, 1, 3, 3], 1],
    ['equal ghosts and lives, lowest team order', [2, 2, 2, 2], 0],
  ])('stop-time: at the time limit the winner is the team with the %s', (_, lives, winner) => {
    const m = matchOf(rules(3), roster(0, 0, 1, 1), 'last-standing');
    lives.forEach((n, i) => {
      const g = ghost(m, i + 1);
      Object.assign(g, { lives: n }, n === 0 ? { phase: 'out', outAtMs: 0 } : {});
    });
    runTo(m, 2000);
    expect(m.state).toMatchObject({ ended: true, elapsedMs: 1000, winner, lastStanding: null });
  });

  it('the last ones out in the same tick: the lowest team order of them wins', () => {
    const m = matchOf(rules(1, 'stop-open'), roster(1, 0, 2), 'last-standing');
    knockOut(m, 3);
    const out = m.state.arena.radius + 40;
    place(m, 1, out, 0);
    place(m, 2, -out, 0);
    m.tick(50, new Map());
    expect(m.state).toMatchObject({ ended: true, winner: 0, lastStanding: 2 });
  });
});

describe('Last One Standing after the last season', () => {
  it('keep-halving: no time limit, the arena halves every interval until one is left', () => {
    const m = matchOf(rules(3, 'keep-halving'), roster(0, 1), 'last-standing');
    const halvings: number[] = [];
    while (!m.state.ended && m.state.elapsedMs < 120_000) {
      m.tick(50, new Map());
      for (const e of m.state.events) if (e.type === 'halving') halvings.push(e.atMs);
    }
    expect(m.state.ended).toBe(true);
    expect(m.state.elapsedMs).toBeGreaterThan(1000); // past the time limit
    expect(halvings.slice(0, 4)).toEqual([250, 500, 750, 950]);
    const gaps = halvings.slice(3).map((t, i) => t - (halvings[i + 2] ?? 0));
    expect(gaps.every((g) => g === 200)).toBe(true);
    expect(m.state.ghosts.filter((g) => g.lives > 0).length).toBeLessThanOrEqual(1);
    expect(m.state.winner).not.toBeNull();
    expect(m.result().knockedOut.length).toBeGreaterThanOrEqual(1);
  });

  it('stop-open: the size stays after the third halving, no time limit, the last one wins', () => {
    const m = matchOf(rules(2, 'stop-open'), roster(0, 1, 2), 'last-standing');
    runTo(m, 60_000);
    const s = m.state;
    expect(s.ended).toBe(false);
    expect(s.clock.index).toBe(3); // three halvings, none after
    expect(nextDeadline(rules(2, 'stop-open'), s)).toBeNull();
    expect(s.countdownMs).toBeNull();
    knockOut(m, 2);
    knockOut(m, 3);
    expect(m.state).toMatchObject({ ended: true, winner: 0, lastStanding: 1 });
    expect(m.result().knockedOut).toEqual([1, 2]);
  });

  it('the setting after the last season applies at once: stop-time switched to keep-halving', () => {
    const c = rules(3);
    const m = matchOf(c, roster(0, 1), 'last-standing');
    runTo(m, 900);
    c.sumo.afterLast = 'keep-halving'; // the owner's slider, mid-match
    runTo(m, 1200);
    expect(m.state.ended).toBe(false);
    expect(m.state.elapsedMs).toBe(1200);
  });
});
