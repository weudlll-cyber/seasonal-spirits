// Seasonal Spirits — where the ghosts' name labels go: never two on top of each other, never
// under the top bar (owner's play test 2026-11-15). Pure: positions and widths in, placements
// out, so the rule is tested without a canvas.

export const LABEL_HEIGHT = 14; // pixels of one 12 px label line, with a little air
const GAP = 2; // pixels kept free between two labels

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
  x: number;
  y: number; // baseline
  own: boolean;
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function boxOf(x: number, y: number, width: number): Box {
  return { left: x - width / 2, right: x + width / 2, top: y - LABEL_HEIGHT, bottom: y };
}

function hits(a: Box, b: Box): boolean {
  return (
    a.left < b.right + GAP && b.left < a.right + GAP && a.top < b.bottom + GAP && b.top < a.bottom
  );
}

// The own label is always drawn: above its ghost, or below it when above would reach under
// the bar (`topPx`). Then the others, the one carrying more coins first: the full text where
// it is free, else the short one, else none; never one that would reach under the bar. The
// result is in drawing order, the own label last so it sits on top.
export function placeLabels(candidates: readonly LabelCandidate[], topPx: number): PlacedLabel[] {
  const order = [...candidates].sort(
    (a, b) => Number(b.own) - Number(a.own) || b.carried - a.carried || a.id - b.id,
  );
  const taken: Box[] = [];
  const others: PlacedLabel[] = [];
  let own: PlacedLabel | null = null;
  for (const c of order) {
    if (c.own) {
      const y = c.above - LABEL_HEIGHT < topPx ? c.below : c.above;
      taken.push(boxOf(c.x, y, c.fullWidth));
      own = { id: c.id, text: c.full, x: c.x, y, own: true };
      continue;
    }
    if (c.above - LABEL_HEIGHT < topPx) continue;
    const tries: [string, number][] = [[c.full, c.fullWidth]];
    if (c.short !== null) tries.push([c.short, c.shortWidth]);
    for (const [text, width] of tries) {
      const box = boxOf(c.x, c.above, width);
      if (taken.some((t) => hits(t, box))) continue;
      taken.push(box);
      others.push({ id: c.id, text, x: c.x, y: c.above, own: false });
      break;
    }
  }
  return own ? [...others, own] : others;
}
