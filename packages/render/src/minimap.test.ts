// Seasonal Sumo — the follow camera's minimap (2026-11-19): every mark on it — King's zone, a
// bomb's carrier, the own dot — is outlined in ink, so it reads on every season's ground even
// where its colour is the ground's own (spring's green on spring grass).

import { GHOST_BOMB, type ServerState } from '@seasonal-spirits/protocol';
import { describe, expect, it } from 'vitest';
import { recorder } from './canvas-recorder.js';
import { drawMinimap } from './minimap.js';
import { look } from './palette.js';

describe('the minimap', () => {
  it('outlines the zone, every bomb carrier and the own dot in ink', () => {
    const r = recorder();
    const inked: number[] = [];
    const stroke = (): void => {
      if (r.ctx.strokeStyle === look().ink) inked.push(r.arcs.length);
    };
    Object.assign(r.ctx, { stroke });
    const ghosts = [
      { id: 1, x: 900, y: 900, team: 0, flags: 0 },
      { id: 2, x: 1100, y: 900, team: 1, flags: GHOST_BOMB },
      { id: 3, x: 1000, y: 1100, team: 2, flags: GHOST_BOMB },
    ];
    const s = { season: 0, area: { x: 800, y: 800, r: 150 }, ghosts } as unknown as ServerState;
    drawMinimap(r.ctx, { right: 400, top: 100 }, s, {
      field: { x: 1000, y: 1000, half: 450 },
      ownId: 1,
    });
    expect(r.arcs).toHaveLength(4); // the zone, two carriers, the own dot
    // Each circle is stroked in ink right after it is drawn.
    expect(inked).toEqual(expect.arrayContaining([1, 2, 3, 4]));
  });
});
