// Seasonal Sumo — the result screen's words (review 2026-11-20: "1 knockouts"): a count of one
// takes the singular, in the own place line and in every award.

import type { ServerRecap } from '@seasonal-spirits/protocol';
import { modeWords } from '@seasonal-spirits/render';
import { describe, expect, it } from 'vitest';
import { awardLines, counted } from './result.js';

describe('the result screen counts in words', () => {
  it('says "1 knockout" and "2 knockouts", "1 point" and "0 points"', () => {
    const sumo = modeWords(0).unit;
    expect(counted(1, sumo.one, sumo.many)).toBe('1 knockout');
    expect(counted(2, sumo.one, sumo.many)).toBe('2 knockouts');
    const hill = modeWords(1).unit;
    expect(counted(1, hill.one, hill.many)).toBe('1 point');
    expect(counted(0, hill.one, hill.many)).toBe('0 points');
  });

  it('writes an award of one in the singular', () => {
    const recap = {
      awards: [
        { kind: 'best-pusher', ghost: 4, value: 1 },
        { kind: 'hot-hands', ghost: 5, value: 1 },
      ],
    } as unknown as ServerRecap;
    expect(awardLines(recap, (g) => `Bot ${String(g)}`)).toEqual([
      ['Best pusher', 'Bot 4, 1 knockout'],
      ['Hot hands', 'Bot 5, 1 bomb passed'],
    ]);
  });
});
