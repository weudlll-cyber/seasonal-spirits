// Seasonal Sumo — King of the Season's hint: "Stand in the zone to score" shows only for a player
// on the field outside the zone in a running King match.

import { describe, expect, it } from 'vitest';
import {
  GHOST_FALLING,
  STATE_RESULT,
  type GhostState,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { zoneHintShown } from './zone-hint.js';

const HILL = 1;
const zone = { x: 1000, y: 1000, r: 100 };
const at = (x: number, flags = 0): GhostState => ({ id: 1, x, y: 1000, flags }) as GhostState;
const state = (more: Partial<ServerState> = {}): ServerState =>
  ({ mode: HILL, flags: 0, area: zone, next: null, ghosts: [], ...more }) as ServerState;

describe("King of the Season's hint", () => {
  it('shows while the own ghost stands outside the zone', () => {
    expect(zoneHintShown(state(), at(1200))).toBe(true);
  });

  it('hides while the own ghost stands inside the zone', () => {
    expect(zoneHintShown(state(), at(1050))).toBe(false);
  });

  it('never shows in the other modes, without an own ghost, falling, or in the result', () => {
    expect(zoneHintShown(state({ mode: 0 }), at(1200))).toBe(false);
    expect(zoneHintShown(state({ mode: 2, area: null }), at(1200))).toBe(false);
    expect(zoneHintShown(state(), undefined)).toBe(false);
    expect(zoneHintShown(state(), at(1200, GHOST_FALLING))).toBe(false);
    expect(zoneHintShown(state({ flags: STATE_RESULT }), at(1200))).toBe(false);
  });
});
