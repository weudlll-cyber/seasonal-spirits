// Seasonal Spirits — team signal markers in the client: one per ghost, gone after the show
// time, never more than the bound.

import { describe, expect, it } from 'vitest';
import type { ServerSignal } from '@seasonal-spirits/protocol';
import { CLIENT_CONFIG } from './config.js';
import { SignalMarkers } from './signals.js';

const signal = (ghost: number, s: ServerSignal['signal'] = 'attack'): ServerSignal => ({
  kind: 'signal',
  ghost,
  signal: s,
  x: 100,
  y: 200,
});

describe('signal markers', () => {
  it('shows a signal for the show time, then drops it', () => {
    const m = new SignalMarkers();
    m.add(signal(3), 1000);
    expect(m.active(1000 + CLIENT_CONFIG.signalShowMs - 1)).toHaveLength(1);
    expect(m.active(1000 + CLIENT_CONFIG.signalShowMs)).toEqual([]);
  });

  it('keeps one marker per ghost, the newest', () => {
    const m = new SignalMarkers();
    m.add(signal(3, 'attack'), 0);
    m.add(signal(3, 'home'), 10);
    expect(m.active(20).map((x) => x.signal)).toEqual(['home']);
  });

  it('never keeps more than 32 markers', () => {
    const m = new SignalMarkers();
    for (let g = 0; g < 100; g++) m.add(signal(g), 0);
    expect(m.active(1)).toHaveLength(32);
  });
});
