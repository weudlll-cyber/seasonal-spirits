// Seasonal Spirits — where the ghosts' name labels and the shrine labels go: never two names on
// top of each other, never under the top bar, never past the screen edge, and a shrine label
// never under a HUD control (owner's play tests 2026-11-15). Pure: positions and widths in,
// placements out, so the rules are tested without a canvas.

import { overlaps, type Rect } from './view.js';

export const LABEL_HEIGHT = 14; // pixels of one 12 px label line, with a little air
const GAP = 2; // pixels kept free between two labels, and between a label and the screen edge

export interface LabelCandidate {
  id: number;
  x: number; // centre of the label, pixels
  above: number; // baseline when drawn above the ghost (the usual place)
  below: number; // baseline when drawn below the ghost (the own label, when the bar is above)
  full: string;
  fullWidth: number;
  short: string | null; // a shorter text to try when the full one collides; null: none
  shortWidth: number;
  own: boolean;
  carried: number;
}

export interface PlacedLabel {
  id: number;
  text: string;
  x: number; // centre, kept inside the visible area
  y: number; // baseline
  width: number;
  own: boolean;
}

// The label's box, its centre moved inside the area's left and right edge.
function boxIn(area: Rect, x: number, y: number, width: number): Rect {
  const half = width / 2;
  const cx = Math.min(Math.max(x, area.left + half + GAP), area.right - half - GAP);
  return { left: cx - half, right: cx + half, top: y - LABEL_HEIGHT, bottom: y };
}

const placed = (id: number, text: string, box: Rect, own: boolean): PlacedLabel => ({
  id,
  text,
  x: (box.left + box.right) / 2,
  y: box.bottom,
  width: box.right - box.left,
  own,
});

// `area` is the visible field: below the bar, inside the screen. The own label is always
// drawn: above its ghost, or below it when above would reach under the bar. Then the others,
// the one carrying more coins first: the full text where it is free, else the short one,
// else none; never one that would reach under the bar. Every label is moved inside the left
// and right edge. The result is in drawing order, the own label last so it sits on top.
export function placeLabels(candidates: readonly LabelCandidate[], area: Rect): PlacedLabel[] {
  const order = [...candidates].sort(
    (a, b) => Number(b.own) - Number(a.own) || b.carried - a.carried || a.id - b.id,
  );
  const taken: Rect[] = [];
  const others: PlacedLabel[] = [];
  let own: PlacedLabel | null = null;
  for (const c of order) {
    if (c.own) {
      const y = c.above - LABEL_HEIGHT < area.top ? c.below : c.above;
      const box = boxIn(area, c.x, y, c.fullWidth);
      taken.push(box);
      own = placed(c.id, c.full, box, true);
      continue;
    }
    if (c.above - LABEL_HEIGHT < area.top) continue;
    const tries: [string, number][] = [[c.full, c.fullWidth]];
    if (c.short !== null) tries.push([c.short, c.shortWidth]);
    for (const [text, width] of tries) {
      const box = boxIn(area, c.x, c.above, width);
      if (taken.some((t) => overlaps(t, box, GAP))) continue;
      taken.push(box);
      others.push(placed(c.id, text, box, false));
      break;
    }
  }
  return own ? [...others, own] : others;
}

// A shrine's label (shrine centre `x`, `y`, radius `r` in pixels): below the shrine, or the
// first of above, left and right that no HUD control covers; below when every spot is
// covered. Returns the label's centre x and baseline.
export function shrineLabelAt(
  at: { x: number; y: number; r: number },
  text: { width: number; height: number },
  blocked: readonly Rect[],
): { x: number; y: number } {
  const side = at.r + 8 + text.width / 2;
  const middle = at.y + text.height / 2;
  const spots = [
    { x: at.x, y: at.y + at.r + text.height + 4 },
    { x: at.x, y: at.y - at.r - 8 },
    { x: at.x - side, y: middle },
    { x: at.x + side, y: middle },
  ];
  const box = (p: { x: number; y: number }): Rect => ({
    left: p.x - text.width / 2,
    right: p.x + text.width / 2,
    top: p.y - text.height,
    bottom: p.y,
  });
  const clear = spots.find((p) => !blocked.some((b) => overlaps(b, box(p))));
  return clear ?? spots[0] ?? at;
}
