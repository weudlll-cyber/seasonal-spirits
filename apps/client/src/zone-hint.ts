// Seasonal Sumo — King of the Season's hint: while the own ghost stands outside the zone a pill
// under the band says "Stand in the zone to score" (index.html #hint); hidden otherwise.

import { inZone } from '@seasonal-spirits/game-core';
import {
  GHOST_FALLING,
  GHOST_OUT,
  STATE_RESULT,
  type GhostState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { zoneOf } from '@seasonal-spirits/render';
import { el } from './hud.js';

const ZONE_HINT = 'Stand in the zone to score';

// Whether the hint shows: a match of King running, the own ghost (as drawn) on the field outside
// the zone.
export function zoneHintShown(s: ServerState | undefined, own: GhostState | undefined): boolean {
  const zone = zoneOf(s);
  if (!s || !zone || !own || s.flags & STATE_RESULT) return false;
  if (own.flags & (GHOST_FALLING | GHOST_OUT)) return false;
  return !inZone(zone, own);
}

export class ZoneHint {
  private readonly pill = el('hint');

  constructor() {
    this.pill.textContent = ZONE_HINT;
  }

  // `own` as drawn; `playing` false while watching.
  update(s: ServerState | undefined, own: GhostState | undefined, playing: boolean): void {
    this.pill.hidden = !(playing && zoneHintShown(s, own));
  }
}
