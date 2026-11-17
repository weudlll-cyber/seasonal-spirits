// Seasonal Sumo — the bots in the endgame (FIX 2026-11-17-5: the last two circled each other):
// they aim ahead of a moving target, grow bolder as ghosts are knocked out once no halving is
// coming, and attack after a wait without a dash.

import { describe, expect, it } from 'vitest';
import { configFrom, type GameConfig } from '../config.js';
import { Match } from '../match.js';
import { DEFAULT_SETTINGS } from '../settings.js';
import { cfg, ghost, place, runTo } from '../test-helpers.js';
import { botIntent } from './bot.js';
import { bolder, boldness } from './human.js';

// Four seasons of 2.5 s: the last one, with no halving to come, from 7.5 s.
const SHORT: GameConfig = { ...cfg, seasonDurationMs: 2500, matchDurationMs: 10_000 };
const eight = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, team: (i % 4) as 0 | 1 | 2 | 3 }));

function knockOut(m: Match, ids: number[]): void {
  for (const id of ids) Object.assign(ghost(m, id), { lives: 0, phase: 'out' });
}

describe('bots in the endgame', () => {
  it('aim at where a moving target will be, not where it is seen', () => {
    const lead = (leadMs: number): number => {
      const c = { ...cfg, bots: { ...cfg.bots, leadMs } };
      const m = new Match(c, 1, eight.slice(0, 2));
      place(m, 1, 0, 0);
      place(m, 2, 150, 0).vy = 200; // passing across, downwards
      return botIntent(c, m.state, ghost(m, 1)).dy;
    };
    expect(lead(0)).toBeCloseTo(0, 6);
    expect(lead(300)).toBeGreaterThan(0.3);
  });

  it('grow bolder as ghosts are knocked out, once no halving is coming', () => {
    const m = new Match(SHORT, 1, eight);
    knockOut(m, [3, 4, 5, 6, 7, 8]);
    expect(boldness(SHORT, m.state)).toBe(0); // halvings to come: the arena presses them
    const knocked = new Match(SHORT, 1, eight);
    runTo(knocked, 8000);
    const steps = [[], [8, 7], [6, 5], [4, 3]].map((ids) => {
      knockOut(knocked, ids);
      return boldness(SHORT, knocked.state);
    });
    expect(steps[0]).toBe(0); // all eight still in
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThan(steps[i - 1] ?? 1);
    expect(steps.at(-1)).toBe(1); // two left
    const { brain } = bolder(SHORT, knocked.state, 0);
    expect(brain.bots.dashAimCos).toBe(SHORT.bots.boldAimCos); // the wider dash angle
  });

  // NIGHT 2026-11-18: nobody is knocked out in hill, so the boldness never comes; the bots lead.
  it('aim ahead in King of the Season from the start, but not in a full sumo arena', () => {
    const hill = configFrom(DEFAULT_SETTINGS, 'hill');
    expect(bolder(hill, new Match(hill, 1, eight).state, 0).brain.bots.leadMs).toBe(
      hill.bots.leadMs,
    );
    expect(bolder(SHORT, new Match(SHORT, 1, eight).state, 0).brain.bots.leadMs).toBe(0);
  });

  it('attack after a wait without a dash, sooner the fewer are left', () => {
    const m = new Match(SHORT, 1, eight);
    runTo(m, 8000);
    knockOut(m, [5, 6, 7, 8]); // four left: bold in part
    const bold = boldness(SHORT, m.state);
    expect(bold).toBeGreaterThan(0);
    expect(bold).toBeLessThan(1);
    const wait = SHORT.bots.commitMs * (1 - 0.75 * bold);
    expect(bolder(SHORT, m.state, wait - 50).committed).toBe(false);
    expect(bolder(SHORT, m.state, wait).committed).toBe(true);
    expect(bolder(SHORT, m.state, wait).brain.bots.dashAimCos).toBe(-1); // any angle
    knockOut(m, [3, 4]); // two left: a quarter of the wait
    expect(bolder(SHORT, m.state, SHORT.bots.commitMs / 4).committed).toBe(true);
  });
});
