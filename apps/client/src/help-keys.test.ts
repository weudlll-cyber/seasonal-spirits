// Seasonal Sumo — the help card by keyboard (DECISIONS D3): a keyboard player reads it to its
// end. Why: before, any key closed it, so a card longer than the screen could not be read.

import { describe, expect, it } from 'vitest';
import { helpKey } from './help-keys.js';

// A card showing 400 px of 1000: it scrolls from 0 to 600.
const card = (scrollTop: number) => ({ scrollTop, clientHeight: 400, scrollHeight: 1000 });
const key = (k: string, shiftKey = false) => ({ key: k, shiftKey });

describe('helpKey', () => {
  it('scrolls by a line, a page and to both ends, never past them', () => {
    expect(helpKey(key('ArrowDown'), card(0))).toEqual({ scrollTo: 40 });
    expect(helpKey(key('ArrowUp'), card(0))).toEqual({ scrollTo: 0 });
    expect(helpKey(key('PageDown'), card(100))).toEqual({ scrollTo: 460 });
    expect(helpKey(key('PageUp'), card(100))).toEqual({ scrollTo: 0 });
    expect(helpKey(key('End'), card(0))).toEqual({ scrollTo: 600 });
    expect(helpKey(key('Home'), card(600))).toEqual({ scrollTo: 0 });
    expect(helpKey(key('PageDown'), card(580))).toEqual({ scrollTo: 600 });
  });

  it('pages down with Space and up with Shift+Space', () => {
    expect(helpKey(key(' '), card(0))).toEqual({ scrollTo: 360 });
    expect(helpKey(key(' ', true), card(360))).toEqual({ scrollTo: 0 });
  });

  it('reaches the end of the card by keys alone', () => {
    let top = 0;
    for (let i = 0; i < 10; i++) {
      const what = helpKey(key('PageDown'), card(top));
      if (typeof what === 'object' && 'scrollTo' in what) top = what.scrollTo;
    }
    expect(top).toBe(600);
  });

  it('moves the focus forward on Tab and back on Shift+Tab, the card left open (D15)', () => {
    expect(helpKey(key('Tab'), card(0))).toEqual({ focus: 1 });
    expect(helpKey(key('Tab', true), card(0))).toEqual({ focus: -1 });
  });

  it('stays open on a modifier alone (Shift, the jump key, starts Shift+Space)', () => {
    for (const k of ['Shift', 'Control', 'Alt', 'Meta'])
      expect(helpKey(key(k), card(0))).toBe('stay');
  });

  it('closes on Escape, "?", Enter and any other key', () => {
    for (const k of ['Escape', '?', 'Enter', 'w', 'd'])
      expect(helpKey(key(k), card(0))).toBe('close');
  });
});
