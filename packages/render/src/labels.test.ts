// Seasonal Spirits — name labels: no two overlap, the own one always shows and sits on top, the
// richer carrier keeps its name, and no label reaches under the top bar.

import { describe, expect, it } from 'vitest';
import { LABEL_HEIGHT, placeLabels, type LabelCandidate } from './labels.js';

const TOP = 100;

// A ghost at (x, y): its label 20 px above, or 20 px below; 8 px per character.
function at(id: number, x: number, y: number, over: Partial<LabelCandidate> = {}): LabelCandidate {
  const full = over.full ?? `Bot ${id}`;
  const short = over.short === undefined ? null : over.short;
  return {
    id,
    x,
    above: y - 20,
    below: y + 20 + LABEL_HEIGHT,
    full,
    fullWidth: full.length * 8,
    short,
    shortWidth: (short ?? '').length * 8,
    own: false,
    carried: 0,
    ...over,
  };
}

describe('name labels', () => {
  it('draws every label where none collide', () => {
    const placed = placeLabels([at(1, 200, 300), at(2, 400, 300), at(3, 200, 500)], TOP);
    expect(placed.map((p) => p.id).sort()).toEqual([1, 2, 3]);
  });

  it('keeps the own label over a stacked crowd and draws it last', () => {
    const crowd = [1, 2, 3].map((id) => at(id, 300, 300, { carried: 5 }));
    const own = at(9, 302, 300, { full: 'You', own: true });
    const placed = placeLabels([...crowd, own], TOP);
    expect(placed.at(-1)).toMatchObject({ id: 9, text: 'You', own: true });
    expect(placed).toHaveLength(1);
  });

  it('names the ghost carrying more coins and hides the labels beneath it', () => {
    const poor = at(1, 300, 300, { full: 'Bot 1 · 2', short: '2', carried: 2 });
    const rich = at(2, 300, 300, { full: 'Bot 2 · 9', short: '9', carried: 9 });
    const empty = at(3, 300, 300);
    const placed = placeLabels([poor, empty, rich], TOP);
    expect(placed.map((p) => p.text)).toEqual(['Bot 2 · 9']);
  });

  it('uses the short text when only that one fits beside a neighbour', () => {
    const left = at(1, 300, 300, { full: 'Bot 1 · 9', carried: 9 });
    // 40 px to the right: "Bot 2 · 3" (72 px wide) collides, "3" (8 px) does not.
    const right = at(2, 344, 300, { full: 'Bot 2 · 3', short: '3', carried: 3 });
    const placed = placeLabels([left, right], TOP);
    expect(placed.find((p) => p.id === 2)?.text).toBe('3');
  });

  it('never puts a label under the top bar; the own one moves below its ghost', () => {
    const near = at(1, 300, TOP + 10, { carried: 9 });
    const own = at(2, 500, TOP + 10, { full: 'You', own: true });
    const placed = placeLabels([near, own], TOP);
    expect(placed.find((p) => p.id === 1)).toBeUndefined();
    const mine = placed.find((p) => p.id === 2);
    expect(mine?.y).toBe(own.below);
    for (const p of placed) expect(p.y - LABEL_HEIGHT).toBeGreaterThanOrEqual(TOP);
  });
});
