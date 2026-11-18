// Seasonal Sumo — how large a character is drawn and how far its drawing reaches (moved out of
// ghosts.ts for the Sky Island look, 2026-11-18): its body radius in pixels from the match's
// size, how far above its centre the hat, a bomb, the protection ring or the own triangle reach,
// and how far to its sides it reaches — what its label keeps clear of.

import {
  GHOST_AIRBORNE,
  GHOST_BOMB,
  GHOST_PROTECTED,
  type GhostState,
} from '@seasonal-spirits/protocol';
import { bombReach } from './bomb.js';
import { REACH } from './character.js';
import { AIR_TOP_SCALE } from './jump.js';
import { POINTER_REACH } from './own.js';
import { shape } from './shape.js';
import type { View } from './view.js';

// Pixels outside the body to the protection ring's centre line; ghostReach adds half its width.
export const PROTECT_RING = 9;

export function ghostRadiusPx(v: View): number {
  // The match's size; at least 4 px, so a character stays visible on a small phone.
  return Math.max(4, shape().ghostRadius * v.scale);
}

// How far to the sides and below a character of body radius `r` pixels is drawn (LabelCandidate.r):
// its arms and feet, or the protection ring.
export function ghostSide(r: number, g: Pick<GhostState, 'flags'>): number {
  return g.flags & GHOST_PROTECTED ? r + PROTECT_RING + 1 : r * REACH.side;
}

// How far above the body's centre a character of body radius `r` pixels is drawn: what its label
// keeps clear of (LabelCandidate.up) — its hat (larger in the air), a bomb above it in full, the
// protection ring, and for the own one the triangle above all of that.
export function ghostReach(
  r: number,
  g: Pick<GhostState, 'id' | 'flags'>,
  ownId: number | null,
): number {
  const reach = Math.max(
    r * REACH.top * (g.flags & GHOST_AIRBORNE ? AIR_TOP_SCALE : 1),
    g.flags & GHOST_PROTECTED ? r + PROTECT_RING + 1 : 0,
    g.flags & GHOST_BOMB ? bombReach(r) : 0,
  );
  return g.id === ownId ? reach + POINTER_REACH : reach;
}
