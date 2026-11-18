// Seasonal Sumo — the Light/Dark switch (Sky Island look, 2026-11-18): Light by default, the
// choice remembered, and a page whose storage throws still switches (it only forgets).

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

function page(storage: Storage): { dark: () => boolean } {
  let dark = false;
  vi.stubGlobal('document', {
    body: { classList: { toggle: (_: string, on: boolean) => (dark = on) } },
  });
  vi.stubGlobal('localStorage', storage);
  return { dark: () => dark };
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
  it('starts Light, switches to Dark and is remembered on the next page', () => {
    const storage = memory();
    const first = page(storage);
    const b = button();
    bindLookSwitch(b.el);
    expect(look()).toBe(LIGHT);
    expect(b.attrs.get('aria-pressed')).toBe('false');
    b.click();
    expect(look()).toBe(DARK);
    expect(first.dark()).toBe(true);
    const next = page(storage);
    bindLookSwitch(button().el);
    expect(look()).toBe(DARK);
    expect(next.dark()).toBe(true);
  });

  it('still switches when the storage throws, and starts Light', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    page(broken);
    const b = button();
    bindLookSwitch(b.el);
    expect(look()).toBe(LIGHT);
    b.click();
    expect(look()).toBe(DARK);
  });
});
