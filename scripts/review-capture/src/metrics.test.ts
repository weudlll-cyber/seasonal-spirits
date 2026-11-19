// Seasonal Sumo review capture — the measured checklist items: two texts overlapping are found, a
// text inside another is not; a text past the screen's edge is cut; the contrast is WCAG's.

import { describe, expect, it } from 'vitest';
import { contrast, judge } from './metrics.js';

const text = (name: string, l: number, r: number, inside: number[] = []) => ({
  name,
  font: 14,
  box: { l, t: 0, r, b: 20 } as { l: number; t: number; r: number; b: number } | null,
  color: 'rgb(0, 0, 0)',
  bg: 'rgb(255, 255, 255)',
  inside,
});
const raw = (texts: ReturnType<typeof text>[]) => ({
  texts,
  width: 390,
  height: 844,
  field: null,
  radii: [],
});

describe('what the review measures', () => {
  it('finds two texts that overlap, not a text inside another', () => {
    expect(judge(raw([text('a', 0, 50), text('b', 40, 90)])).overlaps).toEqual(['a × b']);
    expect(judge(raw([text('pill', 0, 90), text('dot', 10, 20, [0])])).overlaps).toEqual([]);
  });

  it('marks a text past the screen edge as cut, not one scrolled out of view', () => {
    expect(judge(raw([text('wide', 300, 400)])).cut).toEqual(['wide']);
    expect(judge(raw([{ ...text('away', 0, 50), box: null }])).fontMin).toBeNull();
  });

  it('measures contrast as WCAG does: black on white 21, a grey on white 4.48', () => {
    expect(contrast('rgb(0, 0, 0)', 'rgb(255, 255, 255)')).toBeCloseTo(21, 5);
    expect(contrast('rgb(119, 119, 119)', 'rgb(255, 255, 255)')).toBeCloseTo(4.48, 2);
  });
});
