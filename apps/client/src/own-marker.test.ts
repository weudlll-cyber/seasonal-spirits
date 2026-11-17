// Seasonal Sumo — finding the own ghost (own-marker.ts): the band's line counts down to the
// respawn on the server's clock, and the pulse runs after a respawn and at a new match.

import { describe, expect, it } from 'vitest';
import {
  GHOST_FALLING,
  GHOST_OUT,
  STATE_RESULT,
  type ServerState,
} from '@seasonal-spirits/protocol';
import { PULSE_MS } from '@seasonal-spirits/render';
import { OwnMarker, fellLine } from './own-marker.js';

const OUT_MS = 3000;
const state = (serverMs: number, flags: number, over = false): ServerState =>
  ({
    serverMs,
    flags: over ? STATE_RESULT : 0,
    ghosts: [{ id: 3, flags }],
  }) as unknown as ServerState;

describe('the own ghost out after a fall', () => {
  it('counts the band line down to the respawn in whole seconds, then stops', () => {
    const m = new OwnMarker();
    m.observe(state(0, 0), 3, 0, OUT_MS);
    m.observe(state(1000, GHOST_FALLING), 3, 1000, OUT_MS);
    const line = () => fellLine(m.backInMs() ?? NaN);
    expect(line()).toBe('You fell — back in 3');
    m.observe(state(1600, GHOST_OUT), 3, 1600, OUT_MS);
    expect(line()).toBe('You fell — back in 3');
    m.observe(state(2500, GHOST_OUT), 3, 2500, OUT_MS);
    expect(line()).toBe('You fell — back in 2');
    m.observe(state(3950, GHOST_OUT), 3, 3950, OUT_MS);
    expect(line()).toBe('You fell — back in 1');
    m.observe(state(4000, 0), 3, 4000, OUT_MS);
    expect(m.backInMs()).toBeNull();
  });
});

describe('the own ghost pulse', () => {
  it('runs after a respawn and at the start of a new match, for about 1.5 s', () => {
    const m = new OwnMarker();
    m.observe(state(0, 0), 3, 0, OUT_MS);
    expect(m.pulseMs(100)).toBe(100); // joined
    expect(m.pulseMs(PULSE_MS + 1)).toBeNull();
    m.observe(state(2000, GHOST_FALLING), 3, 2000, OUT_MS);
    m.observe(state(5000, 0), 3, 5000, OUT_MS); // back
    expect(m.pulseMs(5200)).toBe(200);
    m.observe(state(9000, 0, true), 3, 9000, OUT_MS); // result screen
    expect(m.pulseMs(9000)).toBeNull();
    m.observe(state(24000, 0), 3, 24000, OUT_MS); // the next match
    expect(m.pulseMs(24100)).toBe(100);
  });
});
