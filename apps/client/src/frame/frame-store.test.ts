// Seasonal Sumo — the frame's store: the loop reports every frame, the frame re-renders only on a
// real change (a match starting or ending, a new result to fit).

import { describe, expect, it } from 'vitest';
import { frameSnapshot, resultFilled, setRunning, subscribeFrame } from './frame-store.js';

describe("the frame's store", () => {
  it('tells its listeners of a change only, and keeps the snapshot while nothing changes', () => {
    let heard = 0;
    const stop = subscribeFrame(() => (heard += 1));
    setRunning(true);
    const running = frameSnapshot();
    setRunning(true);
    expect(heard).toBe(1);
    expect(frameSnapshot()).toBe(running);
    resultFilled();
    expect(heard).toBe(2);
    expect(frameSnapshot()).toEqual({ running: true, results: running.results + 1 });
    stop();
    setRunning(false);
    expect(heard).toBe(2);
  });
});
