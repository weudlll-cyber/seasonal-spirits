// Seasonal Spirits — name labels: every ghost on screen gets its name or at least its tag, no
// two overlap, the own one always shows its full text on top, the richer carrier keeps its
// name, nothing reaches under the top bar or past the screen edge; and the shrine labels, off
// the HUD controls and the ghost bodies. The label's words: name, coin count, half-value count.

import { describe, expect, it } from 'vitest';
import { GHOST_BOT } from '@seasonal-spirits/protocol';
import {
  LABEL_HEIGHT,
  bodyBox,
  labelText,
  placeLabels,
  shrineLabelAt,
  type LabelCandidate,
  type PlacedLabel,
} from './labels.js';
import { overlaps, type Rect } from './view.js';

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
    carried: 0,
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

  it('labels every ghost of a stacked crowd of ten, without any overlap', () => {
    const crowd = Array.from({ length: 10 }, (_, i) =>
      at(i + 1, 400 + (i % 4) * 6, 400 + Math.floor(i / 4) * 6, {
        full: `Bot ${i + 1} · 1`,
        carried: 1,
      }),
    );
    const placed = placeLabels(crowd, AREA);
    expect(placed.map((p) => p.id).sort((a, b) => a - b)).toEqual(crowd.map((c) => c.id));
    expect(noOverlaps(placed)).toBe(true);
    // Who found no room beside the ghost stands apart, joined by a leader line.
    expect(placed.some((p) => p.leader !== null)).toBe(true);
  });

  it('keeps the own full label in a crowd and draws it last', () => {
    const crowd = [1, 2, 3].map((id) => at(id, 300, 300, { carried: 5 }));
    const own = at(9, 302, 300, { full: 'You · 4', tag: 'You', own: true });
    const placed = placeLabels([...crowd, own], AREA);
    expect(placed.at(-1)).toMatchObject({ id: 9, text: 'You · 4', own: true, leader: null });
    expect(placed).toHaveLength(4);
  });

  it('gives the richer carrier the best spot, above its ghost, and still names the poorer', () => {
    const poor = at(1, 300, 300, { full: 'Bot 1 · 2', carried: 2 });
    const rich = at(2, 300, 300, { full: 'Bot 2 · 9', carried: 9 });
    const placed = placeLabels([poor, rich], AREA);
    const richLabel = placed.find((p) => p.id === 2);
    expect(richLabel?.text).toBe('Bot 2 · 9');
    expect(richLabel?.y).toBeLessThan(300);
    expect(placed.find((p) => p.id === 1)).toBeDefined();
    expect(noOverlaps(placed)).toBe(true);
  });

  it('never puts a label under the top bar; the own one moves below its ghost', () => {
    const near = at(1, 300, TOP + 10, { carried: 9 });
    const own = at(2, 500, TOP + 10, { full: 'You', tag: 'You', own: true });
    const placed = placeLabels([near, own], AREA);
    expect(placed).toHaveLength(2);
    for (const p of placed) expect(p.y - LABEL_HEIGHT).toBeGreaterThanOrEqual(TOP);
    expect(placed.find((p) => p.id === 2)?.y).toBeGreaterThan(TOP + 10);
  });

  it('moves a name at the screen edge inside instead of cutting it off', () => {
    const left = at(1, 3, 300, { full: 'Bot 1 · 4', carried: 4 });
    const right = at(2, 798, 500, { full: 'Bot 2 · 4', carried: 4 });
    const own = at(3, 0, 600, { full: 'You · 2', tag: 'You', own: true });
    for (const p of placeLabels([left, right, own], AREA)) {
      expect(p.x - p.width / 2, p.text).toBeGreaterThanOrEqual(AREA.left);
      expect(p.x + p.width / 2, p.text).toBeLessThanOrEqual(AREA.right);
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

  it('keeps even the last-resort tag inside the edge when no spot fits in the height', () => {
    // A view as tall as one label: no spot above or below a ghost fits.
    const flat = { left: 0, top: 100, right: 800, bottom: 110 };
    const ghost = at(1, 1, 105, { tag: 'Bot 12' });
    const p = placeLabels([ghost], flat)[0] as PlacedLabel;
    expect(p.text).toBe('Bot 12');
    // The text is drawn centred on p.x, as wide as measured.
    expect(p.x - ghost.tagWidth / 2).toBeGreaterThanOrEqual(flat.left);
    expect(p.x + ghost.tagWidth / 2).toBeLessThanOrEqual(flat.right);
  });
});

describe('label text', () => {
  const ghost = { id: 3, flags: GHOST_BOT, carried: 0 };

  it('names a carrier with its coin count', () => {
    expect(labelText({ ...ghost, carried: 9 }, false, false)).toEqual({
      full: 'Bot 3 · 9',
      tag: '3',
    });
  });

  it('calls the own ghost "You", with its coins', () => {
    expect(labelText({ ...ghost, carried: 6 }, true, false)).toEqual({
      full: 'You · 6',
      tag: 'You',
    });
  });

  it('shows an empty ghost only by its tag to a player, by its name to a spectator', () => {
    expect(labelText(ghost, false, false).full).toBe('3');
    expect(labelText(ghost, false, true).full).toBe('Bot 3');
  });
});

// Session 2026-11-15-CD: some names sat on the ghost next door, and ghost and shrine labels
// did not avoid each other.
describe('name labels keep clear of ghosts and shrine labels', () => {
  it('never puts a name on a neighbouring ghost', () => {
    // B stands right where A's name would go above A.
    const a = at(1, 300, 300, { full: 'Bot 1 · 5', carried: 5 });
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

  it('keeps names clear of a shrine label', () => {
    const shrineLabel = { left: 260, right: 340, top: 260, bottom: 290 }; // above the ghost
    const placed = placeLabels([at(1, 300, 300, { carried: 3 })], AREA, [shrineLabel]);
    expect(placed).toHaveLength(1);
    expect(overlaps(box(placed[0] as PlacedLabel), shrineLabel)).toBe(false);
  });
});

const shrine = { x: 700, y: 600, r: 50 };
const text = { width: 80, height: 16 };
const keep = (controls: Rect[] = [], bodies: Rect[] = []) => ({ controls, bodies });
const boxOf = (p: { x: number; y: number }): Rect => ({
  left: p.x - text.width / 2,
  right: p.x + text.width / 2,
  top: p.y - text.height,
  bottom: p.y,
});
const inArea = (p: { x: number; y: number }): boolean => {
  const b = boxOf(p);
  return b.left >= AREA.left && b.right <= AREA.right && b.top >= TOP && b.bottom <= AREA.bottom;
};

describe('shrine label beside the controls and the ghosts', () => {
  it('sits below the shrine when nothing covers that spot', () => {
    expect(shrineLabelAt(shrine, text, keep(), AREA)).toEqual({
      x: 700,
      y: 600 + 50 + 16 + 4,
      onGhost: false,
    });
  });

  it('moves above the shrine when a HUD control covers the spot below', () => {
    const steal = { left: 660, top: 660, right: 760, bottom: 760 };
    const p = shrineLabelAt(shrine, text, keep([steal]), AREA);
    expect(p.x).toBe(700);
    expect(p.y).toBeLessThan(shrine.y - shrine.r);
  });

  it('moves beside the shrine when a control covers it from below to above', () => {
    // The Steal button over the whole shrine and the spots below and above it.
    const steal = { left: 650, top: 520, right: 760, bottom: 700 };
    const p = shrineLabelAt(shrine, text, keep([steal]), AREA);
    expect(p.x + text.width / 2).toBeLessThanOrEqual(steal.left);
  });

  it('moves off a ghost standing on the spot below, and stays off a control before a ghost', () => {
    const ghost = bodyBox({ x: 700, y: 660, r: 12 }); // on the label's spot below the shrine
    const p = shrineLabelAt(shrine, text, keep([], [ghost]), AREA);
    expect(overlaps(boxOf(p), ghost)).toBe(false);
    expect(p.y).toBeLessThan(shrine.y - shrine.r);
    expect(p.onGhost).toBe(false);
    // A control covers every spot but the one below, where a ghost stands: the ghost moves on,
    // the control stays, so the label takes the ghost's spot.
    const controls = [{ left: 560, top: 470, right: 840, bottom: 640 }];
    const q = shrineLabelAt(shrine, text, keep(controls, [ghost]), AREA);
    expect(overlaps(boxOf(q), controls[0] as Rect)).toBe(false);
    expect(q.onGhost).toBe(true);
  });
});

describe('shrine label at the edge of the view', () => {
  it('stays in view for a shrine at the bottom edge of the view', () => {
    const low = { x: 400, y: 680, r: 50 }; // the spot below lies under the screen
    const p = shrineLabelAt(low, text, keep(), AREA);
    expect(inArea(p)).toBe(true);
    expect(p.y).toBeLessThan(low.y);
  });

  it('moves inside when a shrine sits in the corner of the view', () => {
    const corner = { x: 790, y: 695, r: 50 }; // no spot fits: below, above cut, left, right out
    const p = shrineLabelAt(corner, { width: 120, height: 16 }, keep(), {
      ...AREA,
      top: 640,
    });
    expect(p.x + 60).toBeLessThanOrEqual(AREA.right);
    expect(p.y).toBeLessThanOrEqual(AREA.bottom);
  });

  it('moves a label wholly inside when its shrine is just past the edge and the label would show half', () => {
    const past = { x: 830, y: 400, r: 50 }; // the centre 30 units right of the view
    const p = shrineLabelAt(past, text, keep(), AREA);
    expect(inArea(p)).toBe(true);
  });

  it('keeps the label of a shrine out of view out of view', () => {
    const away = { x: 400, y: 900, r: 50 };
    expect(inArea(shrineLabelAt(away, text, keep(), AREA))).toBe(false);
  });
});
