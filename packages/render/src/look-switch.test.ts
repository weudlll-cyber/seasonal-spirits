// Seasonal Sumo — the Light/Dark switch on the kit's theme: the system setting while nothing is
// stored (followed live), a click stored under the website's key and winning on the next page,
// and a page whose storage throws still switches (it only forgets).

import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindLookSwitch } from './look-switch.js';
import { DARK, LIGHT, look } from './palette.js';

// A button that remembers its attributes and its one click handler.
function button() {
  const attrs = new Map<string, string>();
  let click = (): void => undefined;
  const el = {
    setAttribute: (k: string, v: string) => attrs.set(k, v),
    addEventListener: (_: string, f: () => void) => (click = f),
    blur: () => undefined,
  } as unknown as HTMLButtonElement;
  return {
    el,
    attrs,
    click: () => {
      click();
    },
  };
}

// A page: its storage, the system's dark setting (changeable) and the theme on <html>.
function page(storage: Storage, systemDark: boolean) {
  let dark = systemDark;
  let changed = (): void => undefined;
  let shown: string | null = null;
  vi.stubGlobal('window', {
    localStorage: storage,
    matchMedia: () => ({
      get matches() {
        return dark;
      },
      addEventListener: (_: string, f: () => void) => (changed = f),
    }),
  });
  vi.stubGlobal('document', {
    documentElement: { setAttribute: (_: string, v: string) => (shown = v) },
  });
  return {
    shown: () => shown,
    system: (now: boolean) => {
      dark = now;
      changed();
    },
  };
}

function memory(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => m.set(k, v),
  } as unknown as Storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the look switch', () => {
  it('follows the system setting while nothing is stored', () => {
    const p = page(memory(), true);
    const b = button();
    bindLookSwitch(b.el);
    expect(look()).toBe(DARK);
    expect(p.shown()).toBe('dark');
    expect(b.attrs.get('aria-pressed')).toBe('true');
    p.system(false);
    expect(look()).toBe(LIGHT);
    expect(p.shown()).toBe('light');
  });

  it('stores a click, which wins over the system on the next page and is no longer overridden', () => {
    const storage = memory();
    const first = page(storage, false);
    const b = button();
    bindLookSwitch(b.el);
    expect(look()).toBe(LIGHT);
    b.click();
    expect(look()).toBe(DARK);
    expect(storage.getItem('se.theme')).toBe('dark');
    first.system(false);
    expect(look()).toBe(DARK);
    const next = page(storage, false);
    bindLookSwitch(button().el);
    expect(look()).toBe(DARK);
    expect(next.shown()).toBe('dark');
  });

  it('still switches when the storage throws, starting from the system setting', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    page(broken, false);
    const b = button();
    bindLookSwitch(b.el);
    expect(look()).toBe(LIGHT);
    b.click();
    expect(look()).toBe(DARK);
  });
});
