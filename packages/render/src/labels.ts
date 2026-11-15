// Seasonal Spirits — where the ghosts' name labels and the shrine labels go. Every ghost on
// screen carries a label or at least its short tag, never two on top of each other, never
// under the top bar or past the screen edge; a shrine label never under a HUD control (owner's
// play tests 2026-11-15). Pure: positions and widths in, placements out, tested without a
// canvas.

import { overlaps, type Rect } from './view.js';

export const LABEL_HEIGHT = 14; // pixels of one 12 px label line, with a little air
const GAP = 2; // pixels kept free between two labels, and between a label and the screen edge
// Distances (pixels from the ghost's centre) at which a tag that found no room beside its
// ghost is tried, in eight directions, joined to the ghost by a thin leader line.
const LEADER_RINGS = [30, 46, 64, 84, 106];

export interface LabelCandidate {
  id: number;
  x: number; // the ghost's centre, pixels
  y: number;
  r: number; // the ghost's drawn radius, pixels
  full: string; // the name (with the coin count for a carrier)
  fullWidth: number;
  tag: string; // the short tag: the bot's number, "P<n>" for a player, "You"
  tagWidth: number;
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
  leader: { x: number; y: number } | null; // the ghost's centre when the label stands apart
}

interface Spot {
  text: string;
  width: number;
  x: number;
  y: number; // baseline
  leader: boolean;
}

// The places to try, best first: the full text above and below the ghost, then the tag above,
// below, right and left of it, then the tag further out on a leader line (the own ghost keeps
// its full text everywhere).
function spotsFor(c: LabelCandidate): Spot[] {
  const full = { text: c.full, width: c.fullWidth };
  const short = c.own ? full : { text: c.tag, width: c.tagWidth };
  const middle = c.y + LABEL_HEIGHT / 2 - 2;
  const near = (t: typeof full): Spot[] => [
    { ...t, x: c.x, y: c.y - c.r - 6, leader: false },
    { ...t, x: c.x, y: c.y + c.r + 6 + LABEL_HEIGHT, leader: false },
  ];
  const spots = [...near(full), ...near(short)];
  spots.push({ ...short, x: c.x + c.r + 4 + short.width / 2, y: middle, leader: false });
  spots.push({ ...short, x: c.x - c.r - 4 - short.width / 2, y: middle, leader: false });
  for (const d of LEADER_RINGS) {
    for (let k = 0; k < 8; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 4;
      const x = c.x + Math.cos(a) * d;
      spots.push({ ...short, x, y: c.y + Math.sin(a) * d + LABEL_HEIGHT / 2, leader: true });
    }
  }
  return spots;
}

// The spot's box, moved inside the area's left and right edge; null if it reaches under the
// bar or below the screen.
function boxIn(area: Rect, s: Spot): Rect | null {
  const half = s.width / 2;
  const cx = Math.min(Math.max(s.x, area.left + half + GAP), area.right - half - GAP);
  const box = { left: cx - half, right: cx + half, top: s.y - LABEL_HEIGHT, bottom: s.y };
  return box.top < area.top || box.bottom > area.bottom ? null : box;
}

// The first free spot; when every spot is taken, the first one inside the area (a label may
// then overlap, but a ghost is never left without one).
function choose(c: LabelCandidate, area: Rect, taken: readonly Rect[]): PlacedLabel {
  let fallback: { s: Spot; box: Rect } | null = null;
  for (const s of spotsFor(c)) {
    const box = boxIn(area, s);
    if (!box) continue;
    fallback ??= { s, box };
    if (!taken.some((t) => overlaps(t, box, GAP))) return toPlaced(c, s, box);
  }
  if (fallback) return toPlaced(c, fallback.s, fallback.box);
  const y = Math.max(area.top + LABEL_HEIGHT, Math.min(area.bottom, c.y));
  const s: Spot = { text: c.tag, width: c.tagWidth, x: c.x, y, leader: false };
  return toPlaced(c, s, { left: c.x, right: c.x, top: y - LABEL_HEIGHT, bottom: y });
}

function toPlaced(c: LabelCandidate, s: Spot, box: Rect): PlacedLabel {
  return {
    id: c.id,
    text: s.text,
    x: (box.left + box.right) / 2,
    y: box.bottom,
    width: box.right - box.left,
    own: c.own,
    leader: s.leader ? { x: c.x, y: c.y } : null,
  };
}

// `area` is the visible field: below the bar, inside the screen. The own label is placed
// first, then the others, the one carrying more coins first. The result is in drawing order,
// the own label last so it sits on top.
export function placeLabels(candidates: readonly LabelCandidate[], area: Rect): PlacedLabel[] {
  const order = [...candidates].sort(
    (a, b) => Number(b.own) - Number(a.own) || b.carried - a.carried || a.id - b.id,
  );
  const taken: Rect[] = [];
  const placed = order.map((c) => {
    const p = choose(c, area, taken);
    taken.push({
      left: p.x - p.width / 2,
      right: p.x + p.width / 2,
      top: p.y - LABEL_HEIGHT,
      bottom: p.y,
    });
    return p;
  });
  return [...placed.filter((p) => !p.own), ...placed.filter((p) => p.own)];
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
