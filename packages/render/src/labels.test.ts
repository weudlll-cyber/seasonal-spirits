// Seasonal Sumo — name labels: a label sits near its character or is left out (the own one
// always shows, its full text on top), no two overlap, no leader is much longer than the
// character is tall, the one with a higher score keeps its name, nothing reaches under the top
// bar or past the screen edge; and the label's words.

import { describe, expect, it } from 'vitest';
import { GHOST_BOT } from '@seasonal-spirits/protocol';
import {
  LABEL_HEIGHT,
  labelText,
  placeLabels,
  type LabelCandidate,
  type PlacedLabel,
} from './labels.js';
import { overlaps } from './view.js';

const TOP = 100;
const AREA = { left: 0, top: TOP, right: 800, bottom: 700 };

// A ghost at (x, y) with radius 10; 8 px per character.
function at(id: number, x: number, y: number, over: Partial<LabelCandidate> = {}): LabelCandidate {
  const full = over.full ?? `Bot ${id}`;
  const tag = over.tag ?? String(id);
  return {
    id,
    x,
    y,
    r: 10,
    full,
    fullWidth: full.length * 8,
    tag,
    tagWidth: tag.length * 8,
    own: false,
    score: 0,
    ...over,
  };
}

const box = (p: PlacedLabel) => ({
  left: p.x - p.width / 2,
  right: p.x + p.width / 2,
  top: p.y - LABEL_HEIGHT,
  bottom: p.y,
});

function noOverlaps(placed: readonly PlacedLabel[]): boolean {
  return placed.every((a, i) => placed.every((b, j) => i === j || !overlaps(box(a), box(b))));
}

describe('name labels', () => {
  it('gives every ghost its full name where nothing collides', () => {
    const placed = placeLabels([at(1, 200, 300), at(2, 400, 300), at(3, 200, 500)], AREA);
    expect(placed.map((p) => p.text).sort()).toEqual(['Bot 1', 'Bot 2', 'Bot 3']);
  });

  it('leaves out who finds no room near a stacked crowd of ten, without any overlap', () => {
    const crowd = Array.from({ length: 10 }, (_, i) =>
      at(i + 1, 400 + (i % 4) * 6, 400 + Math.floor(i / 4) * 6, {
        full: `Bot ${i + 1} · 1`,
        score: 1,
      }),
    );
    const placed = placeLabels(crowd, AREA);
    expect(placed.length).toBeGreaterThan(2);
    expect(placed.length).toBeLessThan(crowd.length);
    expect(noOverlaps(placed)).toBe(true);
  });

  it('keeps the own full label in a crowd and draws it last', () => {
    const crowd = [1, 2, 3].map((id) => at(id, 300, 300, { score: 5 }));
    const own = at(9, 302, 300, { full: 'You · 4', tag: 'You', own: true });
    const placed = placeLabels([...crowd, own], AREA);
    expect(placed.at(-1)).toMatchObject({ id: 9, text: 'You · 4', own: true, leader: null });
    expect(placed).toHaveLength(4);
  });

  it('gives the ghost with a higher score the best spot, above it, and still names the other', () => {
    const poor = at(1, 300, 300, { full: 'Bot 1 · 2', score: 2 });
    const rich = at(2, 300, 300, { full: 'Bot 2 · 9', score: 9 });
    const placed = placeLabels([poor, rich], AREA);
    const richLabel = placed.find((p) => p.id === 2);
    expect(richLabel?.text).toBe('Bot 2 · 9');
    expect(richLabel?.y).toBeLessThan(300);
    expect(placed.find((p) => p.id === 1)?.text).toBe('Bot 1 · 2');
    expect(noOverlaps(placed)).toBe(true);
  });

  it('never puts a label under the top bar; the own one moves below its ghost', () => {
    const near = at(1, 300, TOP + 10, { score: 9 });
    const own = at(2, 500, TOP + 10, { full: 'You', tag: 'You', own: true });
    const placed = placeLabels([near, own], AREA);
    expect(placed).toHaveLength(2);
    for (const p of placed) expect(p.y - LABEL_HEIGHT).toBeGreaterThanOrEqual(TOP);
    expect(placed.find((p) => p.id === 2)?.y).toBeGreaterThan(TOP + 10);
  });

  it('moves a name at the screen edge inside instead of cutting it off', () => {
    const left = at(1, 3, 300, { full: 'Bot 1 · 4', score: 4 });
    const right = at(2, 798, 500, { full: 'Bot 2 · 4', score: 4 });
    const own = at(3, 0, 600, { full: 'You · 2', tag: 'You', own: true });
    for (const p of placeLabels([left, right, own], AREA)) {
      expect(p.x - p.width / 2, p.text).toBeGreaterThanOrEqual(AREA.left);
      expect(p.x + p.width / 2, p.text).toBeLessThanOrEqual(AREA.right);
    }
  });
});

// NIGHT 2026-11-19: leaders up to 106 px tangled on the phone.
describe('leader lines', () => {
  it('keeps every leader line within about one character height', () => {
    const crowd = Array.from({ length: 10 }, (_, i) =>
      at(i + 1, 400 + (i % 4) * 6, 400 + Math.floor(i / 4) * 6, { up: 15 }),
    );
    const placed = placeLabels(crowd, AREA);
    const tall = 15 + 10; // up + r
    expect(placed.some((p) => p.leader !== null)).toBe(true);
    for (const p of placed.filter((q) => q.leader)) {
      const leader = p.leader as { x: number; y: number };
      const length = Math.hypot(p.x - leader.x, p.y - LABEL_HEIGHT / 2 - leader.y);
      expect(length, p.text).toBeLessThanOrEqual(1.25 * tall);
    }
  });
});

// Session 2026-11-16-LOOK-B: "You · 6  (5 half)" at the left screen edge was pushed inside
// onto the own ghost's ring, which hid its last letter.
describe('name labels at the screen edge', () => {
  it('moves a label inside the edge and off the rings around its ghost', () => {
    // r is what is drawn: body 10 px, the own ring out to 16 px. Neighbours take the spots
    // above, below and to the right; the spot to the left would be cut at the edge.
    const ring = { left: 134, right: 166, top: 284, bottom: 316 };
    const own = at(9, 150, 300, { r: 16, full: 'You · 16 coins', tag: 'You', own: true });
    const others = [at(1, 150, 262), at(2, 150, 338), at(3, 200, 300)];
    const placed = placeLabels([own, ...others], AREA);
    const label = placed.find((p) => p.id === 9) as PlacedLabel;
    expect(label.text).toBe('You · 16 coins');
    expect(box(label).left).toBeGreaterThanOrEqual(AREA.left);
    expect(overlaps(box(label), ring), 'the label on the own ring').toBe(false);
  });

  it('keeps even the own last-resort tag inside the edge when no spot fits in the height', () => {
    // A view as tall as one label: no spot above or below a ghost fits; another one is left out.
    const flat = { left: 0, top: 100, right: 800, bottom: 110 };
    const ghost = at(1, 1, 105, { tag: 'You · 12', own: true });
    const placed = placeLabels([ghost, at(2, 400, 105)], flat);
    expect(placed).toHaveLength(1);
    const p = placed[0] as PlacedLabel;
    expect(p.text).toBe('You · 12');
    // The text is drawn centred on p.x, as wide as measured.
    expect(p.x - ghost.tagWidth / 2).toBeGreaterThanOrEqual(flat.left);
    expect(p.x + ghost.tagWidth / 2).toBeLessThanOrEqual(flat.right);
  });
});

describe('label text', () => {
  const ghost = { id: 3, flags: GHOST_BOT, score: 0 };

  it('names a ghost with its score once it has some', () => {
    expect(labelText({ ...ghost, score: 9 }, false)).toEqual({
      full: 'Bot 3 · 9',
      tag: '3',
    });
  });

  it('calls the own ghost "You", with its score', () => {
    expect(labelText({ ...ghost, score: 6 }, true)).toEqual({
      full: 'You · 6',
      tag: 'You',
    });
  });

  it('names a ghost without a score, and leaves the score out where the mode hides it', () => {
    expect(labelText(ghost, false)).toEqual({ full: 'Bot 3', tag: '3' });
    expect(labelText({ ...ghost, score: 4 }, false, false).full).toBe('Bot 3');
  });
});

// Session 2026-11-15-CD: some names sat on the ghost next door.
describe('name labels keep clear of ghosts', () => {
  it('never puts a name on a neighbouring ghost', () => {
    // B stands right where A's name would go above A.
    const a = at(1, 300, 300, { full: 'Bot 1 · 5', score: 5 });
    const b = at(2, 300, 262);
    const placed = placeLabels([a, b], AREA);
    const bodyOf = (c: LabelCandidate) => ({
      left: c.x - c.r,
      right: c.x + c.r,
      top: c.y - c.r,
      bottom: c.y + c.r,
    });
    for (const p of placed) {
      const other = p.id === 1 ? b : a;
      expect(overlaps(box(p), bodyOf(other)), `${p.text} on the other ghost`).toBe(false);
    }
    expect(placed).toHaveLength(2);
  });
});
