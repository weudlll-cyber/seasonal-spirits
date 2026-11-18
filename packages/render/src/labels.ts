// Seasonal Sumo — where the characters' name labels go (from Seasonal Spirits, owner's play
// tests 2026-11-15 and 2026-11-16; NIGHT 2026-11-19: fewer, and near their character). A label
// sits near its character or not at all — the own one always shows; never two on top of each
// other, never on another character, never under the top bar or past the screen edge. Also the
// label's words: name and the mode's score. Pure: positions and widths in, placements out,
// tested without a canvas.

import { GHOST_BOT, ghostName, ghostTag, type GhostState } from '@seasonal-spirits/protocol';
import { overlaps, type Rect } from './view.js';

export const LABEL_HEIGHT = 14; // pixels of one 12 px label line, with a little air
const GAP = 2; // pixels kept free between two labels, and between a label and the screen edge
// Distances at which a tag that found no room beside its character is tried, in eight
// directions, joined to it by a thin leader line: in the character's drawn height, so no leader
// is much longer than the character is tall (NIGHT 2026-11-19: long leaders tangled on the phone).
const LEADER_RINGS = [0.9, 1.15];

export interface LabelCandidate {
  id: number;
  x: number; // the ghost's centre, pixels
  y: number;
  // Pixels from the centre to the outside of what is drawn for the ghost: its body and the own
  // ring or the protection ring around it. A label keeps clear of all of it (session
  // 2026-11-16-LOOK-B: "You · 6  (5 half)" pushed in from the screen edge onto the own ring,
  // the ring hid its last letter).
  r: number;
  // Pixels above the centre what is drawn reaches when that is more than `r` (a character's hat,
  // a bomb, the own triangle: Sky Island look); `r` when absent.
  up?: number;
  full: string; // the name (with the score once it has some)
  fullWidth: number;
  tag: string; // the short tag: the bot's number, "P<n>" for a player, "You"
  tagWidth: number;
  own: boolean;
  score: number; // a higher score, a better spot
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

// A character's label: the own one "You", the others their name, with the score once it has
// some ("Bot 3 · 2") unless `scored` is false (a mode that shows only some scores). The tag is
// the fallback in a crowd.
export function labelText(
  g: Pick<GhostState, 'id' | 'flags' | 'score'>,
  own: boolean,
  scored = true,
): { full: string; tag: string } {
  const bot = (g.flags & GHOST_BOT) !== 0;
  const tag = own ? 'You' : ghostTag(g.id, bot);
  const name = own ? 'You' : ghostName(g.id, bot);
  return { full: g.score > 0 && scored ? `${name} · ${g.score}` : name, tag };
}

// A label's centre x moved so its `half` width lies inside the area's left and right edge.
function insideX(area: Rect, x: number, half: number): number {
  return Math.min(Math.max(x, area.left + half + GAP), area.right - half - GAP);
}

// The places to try, best first: the full text above and below the character, then the tag
// above, below, right and left of it, then the tag a little further out on a short leader line
// (the own one keeps its full text everywhere).
function spotsFor(c: LabelCandidate): Spot[] {
  const full = { text: c.full, width: c.fullWidth };
  const short = c.own ? full : { text: c.tag, width: c.tagWidth };
  const middle = c.y + LABEL_HEIGHT / 2 - 2;
  const near = (t: typeof full): Spot[] => [
    { ...t, x: c.x, y: c.y - (c.up ?? c.r) - 6, leader: false },
    { ...t, x: c.x, y: c.y + c.r + 6 + LABEL_HEIGHT, leader: false },
  ];
  const spots = [...near(full), ...near(short)];
  spots.push({ ...short, x: c.x + c.r + 4 + short.width / 2, y: middle, leader: false });
  spots.push({ ...short, x: c.x - c.r - 4 - short.width / 2, y: middle, leader: false });
  const tall = (c.up ?? c.r) + c.r; // the character's drawn height
  for (const d of LEADER_RINGS.map((k) => k * tall)) {
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

// The first free spot; when every spot is taken, none — except for the own character: then the
// first one inside the area (it may overlap), and when no spot fits between the bar and the
// bottom, the tag at its height, still inside the left and right edge.
function choose(c: LabelCandidate, area: Rect, taken: readonly Rect[]): PlacedLabel | null {
  let fallback: { s: Spot; box: Rect } | null = null;
  for (const s of spotsFor(c)) {
    const box = boxIn(area, s);
    if (!box) continue;
    fallback ??= { s, box };
    if (!taken.some((t) => overlaps(t, box, GAP))) return toPlaced(c, s, box);
  }
  if (!c.own) return null;
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

// The box around a ghost's drawing (centre, radius and the reach above in pixels): what a label
// keeps clear of.
export function bodyBox(g: { x: number; y: number; r: number; up?: number }): Rect {
  return { left: g.x - g.r, right: g.x + g.r, top: g.y - (g.up ?? g.r), bottom: g.y + g.r };
}

// `area` is the visible field: below the bar, inside the screen; `avoid` are boxes already
// drawn there. Every character's body counts as taken too, so no name sits on a neighbouring
// one (session 2026-11-15-CD: names landed on the ghost next door). The own label is placed
// first, then the others, the higher score first; one that finds no free spot near its
// character is left out. The result is in drawing order, the own label last so it sits on top.
export function placeLabels(
  candidates: readonly LabelCandidate[],
  area: Rect,
  avoid: readonly Rect[] = [],
): PlacedLabel[] {
  const order = [...candidates].sort(
    (a, b) => Number(b.own) - Number(a.own) || b.score - a.score || a.id - b.id,
  );
  const taken: Rect[] = [...avoid, ...candidates.map(bodyBox)];
  const placed: PlacedLabel[] = [];
  for (const c of order) {
    const p = choose(c, area, taken);
    if (!p) continue;
    placed.push(p);
    taken.push({
      left: p.x - p.width / 2,
      right: p.x + p.width / 2,
      top: p.y - LABEL_HEIGHT,
      bottom: p.y,
    });
  }
  return [...placed.filter((p) => !p.own), ...placed.filter((p) => p.own)];
}
