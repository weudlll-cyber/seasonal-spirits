// Seasonal Sumo — the characters' name labels drawn (moved out of ghosts.ts for the Sky Island
// look, 2026-11-18): the own character, the real players and the top three by score named in a
// white pill with an ink outline, bots otherwise not (NIGHT 2026-11-19: a label on almost every
// character), the tag as the fallback in a crowd, placed by labels.ts; inside King of the
// Season's zone only the tags, in Halving Bomb a score only for the top scorers and the own one.

import { GHOST_BOT, type GhostState } from '@seasonal-spirits/protocol';
import type { GhostStyle } from './ghosts.js';
import {
  LABEL_HEIGHT,
  labelText,
  placeLabels,
  type LabelCandidate,
  type PlacedLabel,
} from './labels.js';
import { look } from './palette.js';
import { PILL_PAD, pillBox } from './pill.js';
import { ghostRadiusPx, ghostReach, ghostSide } from './reach.js';
import { sx, sy, visibleArea, type View } from './view.js';

const labelFont = (own: boolean): string =>
  `${own ? '600' : '500'} 10px Fredoka, system-ui, sans-serif`;
const NAMED_TOP = 3; // the top scorers are named even when they are bots

// A named character's label, its tag as the fallback in a crowd (labelText, placeLabels:
// labels.ts). Widths include the pill.
function candidateOf(
  v: View,
  g: GhostState,
  style: GhostStyle,
  scored: ReadonlySet<number> | null,
): LabelCandidate {
  const { ctx } = v;
  const own = g.id === style.ownId;
  const text = labelText(g, own, !scored || own || scored.has(g.id));
  const z = style.zone;
  const crowded = !own && z && Math.hypot(g.x - z.x, g.y - z.y) <= z.r;
  const { tag } = text;
  const full = crowded ? tag : text.full;
  ctx.font = labelFont(own);
  return {
    id: g.id,
    x: sx(v, g.x),
    y: sy(v, g.y),
    r: ghostSide(ghostRadiusPx(v), g),
    up: ghostReach(ghostRadiusPx(v), g, style.ownId),
    full,
    fullWidth: ctx.measureText(full).width + 2 * PILL_PAD,
    tag,
    tagWidth: ctx.measureText(tag).width + 2 * PILL_PAD,
    own,
    score: g.score,
  };
}

// The ids of the `n` highest scores above 0; a tie goes to the lower id, so the set holds still.
function topScorers(ghosts: readonly GhostState[], n: number): Set<number> {
  const ranked = ghosts.filter((g) => g.score > 0).sort((a, b) => b.score - a.score || a.id - b.id);
  return new Set(ranked.slice(0, n).map((g) => g.id));
}

export function drawLabels(
  v: View,
  ghosts: readonly GhostState[],
  style: GhostStyle,
): PlacedLabel[] {
  const { ctx } = v;
  const l = look();
  const area = visibleArea(v);
  const shown = (c: LabelCandidate): boolean =>
    c.x >= area.left && c.x <= area.right && c.y >= area.top && c.y <= area.bottom;
  const scored = style.scoreTop ? topScorers(ghosts, style.scoreTop) : null;
  const top = topScorers(ghosts, NAMED_TOP);
  const named = (g: GhostState): boolean =>
    g.id === style.ownId || !(g.flags & GHOST_BOT) || top.has(g.id);
  const candidates = ghosts
    .filter(named)
    .map((g) => candidateOf(v, g, style, scored))
    .filter(shown);
  const placed = placeLabels(candidates, area);
  ctx.strokeStyle = l.ink;
  ctx.lineWidth = 1.5;
  for (const p of placed) {
    if (!p.leader) continue;
    ctx.beginPath();
    ctx.moveTo(p.leader.x, p.leader.y);
    ctx.lineTo(p.x, p.y - LABEL_HEIGHT / 2);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  for (const p of placed) {
    pillBox(ctx, {
      left: p.x - p.width / 2,
      top: p.y - LABEL_HEIGHT,
      width: p.width,
      height: LABEL_HEIGHT,
    });
    ctx.font = labelFont(p.own);
    ctx.fillStyle = l.panelText;
    ctx.fillText(p.text, p.x, p.y - 3.5);
  }
  ctx.textAlign = 'start';
  return placed;
}
