// Seasonal Spirits — when the client sends its direction (input-sender.ts): at once on a
// change, never a repeat, never faster than the gap.

import { describe, expect, it } from 'vitest';
import { InputSender, SEND_GAP_MS } from './input-sender.js';

const RIGHT = { dx: 1, dy: 0 };
const UP = { dx: 0, dy: -1 };

describe('InputSender', () => {
  it('sends a changed direction at once', () => {
    const s = new InputSender();
    s.hold(RIGHT);
    expect(s.due(1000)).toEqual(RIGHT);
  });

  it('never sends the direction it sent last', () => {
    const s = new InputSender();
    s.hold(RIGHT);
    s.due(1000);
    s.hold({ dx: 1, dy: 0 });
    expect(s.due(2000)).toBeNull();
    expect(s.due(3000)).toBeNull();
  });

  it('holds a change inside the gap back and sends it once the gap has passed', () => {
    const s = new InputSender();
    s.hold(RIGHT);
    s.due(1000);
    s.hold(UP);
    expect(s.due(1000 + SEND_GAP_MS - 1)).toBeNull();
    expect(s.due(1000 + SEND_GAP_MS)).toEqual(UP);
  });

  it('stays inside 17 directions in any second however fast the keys change', () => {
    const s = new InputSender();
    const sentAt: number[] = [];
    for (let t = 0; t < 5000; t += 4) {
      s.hold(t % 8 === 0 ? RIGHT : UP);
      if (s.due(t)) sentAt.push(t);
    }
    for (const t of sentAt) {
      expect(sentAt.filter((u) => u >= t && u < t + 1000).length).toBeLessThanOrEqual(17);
    }
  });
});
