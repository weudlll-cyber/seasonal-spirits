// Seasonal Sumo review capture — review images do not pile up (owner decision 2026-11-21): a run
// first removes its topic's previous images and sheets, and nothing of another topic.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearTopic } from './topics.js';

let root = '';
const put = (file: string): void => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), '');
};
const has = (file: string): boolean => fs.existsSync(path.join(root, file));

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-topics-'));
  for (const f of [
    'minimap/phone-light-player-01-halving-bomb-start.png',
    'minimap/phone-light-player-01-king-of-the-season-start.png',
    'sheet-minimap.png',
    'sumo-points/desktop-light-player-01-first-seconds.png',
    'sheet-sumo-points-phone-1.png',
    'sheet-sumo-points-big.png',
    'sheet-sumo-last-one-standing-big.png',
    'own-marker/phone-dark-player-02-halving-bomb-first-seconds.png',
  ])
    put(f);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('review images: only the latest run of a topic', () => {
  it("removes a topic's images and sheets before its run, and no other topic's", () => {
    clearTopic(root, 'sumo-points', null);
    expect(fs.readdirSync(path.join(root, 'sumo-points'))).toEqual([]);
    expect(has('sheet-sumo-points-phone-1.png')).toBe(false);
    expect(has('sheet-sumo-points-big.png')).toBe(false);
    // A topic whose name starts the same is another topic.
    expect(has('sheet-sumo-last-one-standing-big.png')).toBe(true);
    expect(has('minimap/phone-light-player-01-halving-bomb-start.png')).toBe(true);
    expect(has('own-marker/phone-dark-player-02-halving-bomb-first-seconds.png')).toBe(true);
  });

  it('removes only the named games of a topic shot again, and its sheet', () => {
    clearTopic(root, 'minimap', ['halving-bomb']);
    expect(has('minimap/phone-light-player-01-halving-bomb-start.png')).toBe(false);
    expect(has('minimap/phone-light-player-01-king-of-the-season-start.png')).toBe(true);
    expect(has('sheet-minimap.png')).toBe(false);
  });
});
