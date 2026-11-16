// Seasonal Spirits — where the ghosts' name labels and the shrine labels go. Every ghost on
// screen carries a label or at least its short tag, never two on top of each other, never on
// another ghost or a shrine label, never under the top bar or past the screen edge; a shrine
// label never under a HUD control, off a ghost where it can be, and never out of view (owner's
// play tests 2026-11-15 and 2026-11-16). Also the label's words: name and coin count. Pure: positions and widths in, placements out, tested without a canvas.

import { GHOST_BOT, ghostName, ghostTag, type GhostState } from '@seasonal-spirits/protocol';
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
  // Pixels from the centre to the outside of what is drawn for the ghost: its body and the own
  // ring or securing ring around it. A label keeps clear of all of it (session
  // 2026-11-16-LOOK-B: "You · 6  (5 half)" pushed in from the screen edge onto the own ring,
  // the ring hid its last letter).
  r: number;
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

// A ghost's label: the own one "You", a carrier its name and coin count ("Bot 3 · 9"), the
// others their name when `labelAll` (spectators, the viewer), else their tag. The tag is the
// fallback in a crowd. The grey half-value count of look B went with V5's price board.
export function labelText(
  g: Pick<GhostState, 'id' | 'flags' | 'carried'>,
  own: boolean,
  labelAll: boolean,
): { full: string; tag: string } {
  const bot = (g.flags & GHOST_BOT) !== 0;
  const tag = own ? 'You' : ghostTag(g.id, bot);
  const name = own ? 'You' : ghostName(g.id, bot);
  if (g.carried > 0) return { full: `${name} · ${g.carried}`, tag };
  return { full: own || labelAll ? name : tag, tag };
}

// A label's centre x moved so its `half` width lies inside the area's left and right edge.
function insideX(area: Rect, x: number, half: number): number {
  return Math.min(Math.max(x, area.left + half + GAP), area.right - half - GAP);
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
  const cx = insideX(area, s.x, half);
  const box = { left: cx - half, right: cx + half, top: s.y - LABEL_HEIGHT, bottom: s.y };
  return box.top < area.top || box.bottom > area.bottom ? null : box;
}

// The first free spot; when every spot is taken, the first one inside the area (a label may
// then overlap, but a ghost is never left without one); when no spot fits between the bar and
// the bottom, the tag at the ghost's height, still inside the left and right edge.
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
  const half = c.tagWidth / 2;
  const x = insideX(area, c.x, half);
  const s: Spot = { text: c.tag, width: c.tagWidth, x, y, leader: false };
  return toPlaced(c, s, { left: x - half, right: x + half, top: y - LABEL_HEIGHT, bottom: y });
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

// The square around a ghost's drawn body (centre and radius in pixels): what a label keeps
// clear of.
export function bodyBox(g: { x: number; y: number; r: number }): Rect {
  return { left: g.x - g.r, right: g.x + g.r, top: g.y - g.r, bottom: g.y + g.r };
}

// `area` is the visible field: below the bar, inside the screen; `avoid` are boxes already
// drawn there (the shrine labels). Every ghost's body counts as taken too, so no name sits on
// a neighbouring ghost (session 2026-11-15-CD: names landed on the ghost next door). The own
// label is placed first, then the others, the one carrying more coins first. The result is in
// drawing order, the own label last so it sits on top.
export function placeLabels(
  candidates: readonly LabelCandidate[],
  area: Rect,
  avoid: readonly Rect[] = [],
): PlacedLabel[] {
  const order = [...candidates].sort(
    (a, b) => Number(b.own) - Number(a.own) || b.carried - a.carried || a.id - b.id,
  );
  const taken: Rect[] = [...avoid, ...candidates.map(bodyBox)];
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

// What a shrine label keeps clear of: the HUD controls on the field, and the ghost bodies drawn
// this frame (bodyBox; a ghost drawn over the label hid it, owner's observation 2026-11-16).
export interface ShrineKeepClear {
  controls: readonly Rect[];
  bodies: readonly Rect[];
}

// A shrine's label (shrine centre `x`, `y`, radius `r` in pixels): below the shrine, or the
// first of above, left and right that lies inside `area` (the visible field) and that neither
// a HUD control nor a ghost covers; then the first such spot only a ghost covers (a control is
// worse: it hides the label for good). When none is clear of the controls, the first spot
// inside the area; when none is inside but the shrine's centre is, or the spot below would
// show at least partly (a shrine at the very edge of the view), the spot below moved inside;
// a shrine out of view keeps its label out of view. A shrine at the bottom edge of the view
// used to put its label below the screen (session 2026-11-15-CD), and a shrine just past the
// edge a label half on screen (session 2026-11-16-V5: x 396–474 on a 412 px phone). Returns the label's centre x and baseline, and whether it had to
// sit on a ghost (no spot was free of them).
export function shrineLabelAt(
  at: { x: number; y: number; r: number },
  text: { width: number; height: number },
  keep: ShrineKeepClear,
  area: Rect,
): { x: number; y: number; onGhost: boolean } {
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
  const free = (p: { x: number; y: number }, rects: readonly Rect[]): boolean =>
    !rects.some((b) => overlaps(b, box(p)));
  const inside = spots.filter((p) => within(area, box(p)));
  const noControl = inside.filter((p) => free(p, keep.controls));
  const clear = noControl.find((p) => free(p, keep.bodies)) ?? noControl[0];
  const below = spots[0] ?? at;
  const centreInView = within(area, { left: at.x, right: at.x, top: at.y, bottom: at.y });
  const shows = centreInView || overlaps(area, box(below));
  const p = clear ?? inside[0] ?? (shows ? moveInside(area, below, text) : below);
  return { x: p.x, y: p.y, onGhost: !free(p, keep.bodies) };
}

function within(area: Rect, r: Rect): boolean {
  return (
    r.left >= area.left && r.right <= area.right && r.top >= area.top && r.bottom <= area.bottom
  );
}

function moveInside(
  area: Rect,
  p: { x: number; y: number },
  text: { width: number; height: number },
): { x: number; y: number } {
  const half = text.width / 2;
  return {
    x: Math.min(Math.max(p.x, area.left + half), area.right - half),
    y: Math.min(Math.max(p.y, area.top + text.height), area.bottom),
  };
}
