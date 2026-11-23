// Seasonal Sumo — the settings schema: every config number comes from a setting, game-core holds
// no other gameplay constant, the reader refuses bad values, and next-match values wait.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAME_MODES, configFrom, type GameMode } from './config.js';
import {
  DEFAULT_SETTINGS,
  NOT_SETTINGS,
  SETTINGS,
  nowPart,
  readSettings,
  type Settings,
} from './settings.js';

// Every numeric leaf of a config, by its path.
function leaves(v: unknown, at = ''): Map<string, number> {
  const out = new Map<string, number>();
  if (typeof v === 'number') out.set(at, v);
  else if (typeof v === 'object' && v !== null) {
    for (const [k, x] of Object.entries(v))
      for (const [p, n] of leaves(x, `${at}.${k}`)) out.set(p, n);
  }
  return out;
}

// One step away from the default, inside the range.
function nudged(key: (typeof SETTINGS)[number]): Settings {
  const up = key.default + key.step;
  return { ...DEFAULT_SETTINGS, [key.key]: up <= key.max ? up : key.default - key.step };
}

// Not settings, and not per mode: the coordinate space; sumo has no walls (its field's edge), so
// none close in.
const FIXED: Record<GameMode, string[]> = {
  sumo: ['.fieldSize', '.wallHalf', '.walls.factor', '.walls.smallest'],
  hill: ['.fieldSize'],
  bomb: ['.fieldSize'],
};

describe('the settings schema', () => {
  it.each(GAME_MODES)('sets every number of the %s config', (mode) => {
    const base = leaves(configFrom(DEFAULT_SETTINGS, mode));
    const covered = new Set<string>();
    for (const s of SETTINGS) {
      for (const [p, n] of leaves(configFrom(nudged(s), mode))) {
        if (base.get(p) !== n) covered.add(p);
      }
    }
    const uncovered = [...base.keys()].filter((p) => !covered.has(p) && !FIXED[mode].includes(p));
    expect(uncovered).toEqual([]);
  });

  it('leaves no other numeric constant in game-core', () => {
    const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
    const files = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = path.join(d, f);
        return statSync(p).isDirectory()
          ? files(p)
          : p.endsWith('.ts') && !p.endsWith('.test.ts')
            ? [p]
            : [];
      });
    const constants = files(dir).flatMap((f) =>
      [
        ...readFileSync(f, 'utf8').matchAll(/^(?:export )?const ([A-Z][A-Z0-9_]*) = -?[0-9.]/gm),
      ].map((m) => m[1] ?? ''),
    );
    expect(constants.length).toBeGreaterThan(0);
    expect(constants.filter((c) => !(c in NOT_SETTINGS))).toEqual([]);
  });
});

describe('reading the settings', () => {
  it('reads the defaults, and every setting has its default in range and on its step', () => {
    expect(readSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it('refuses a value out of range, off its step, not a number, unknown or missing', () => {
    const bad = [
      { ...DEFAULT_SETTINGS, lives: 0 },
      { ...DEFAULT_SETTINGS, lives: 10 },
      { ...DEFAULT_SETTINGS, lives: 2.5 },
      { ...DEFAULT_SETTINGS, maxSpeed: '240' },
      { ...DEFAULT_SETTINGS, maxSpeed: Number.NaN },
      { ...DEFAULT_SETTINGS, jump: 2 },
      { ...DEFAULT_SETTINGS, rotation1: 6 },
      { ...DEFAULT_SETTINGS, teleport: 1 },
      Object.fromEntries(Object.entries(DEFAULT_SETTINGS).filter(([k]) => k !== 'lives')),
      null,
      [],
      'lives=3',
    ];
    for (const v of bad) expect(readSettings(v), JSON.stringify(v)).toBeNull();
  });

  it('applies the now-values to a running match; the next-match values wait', () => {
    const wanted = { ...DEFAULT_SETTINGS, maxSpeed: 300, lives: 5, sumoMatch: 120 };
    const running = nowPart(DEFAULT_SETTINGS, wanted);
    expect(running.maxSpeed).toBe(300); // now
    expect(running.lives).toBe(DEFAULT_SETTINGS.lives); // next match
    expect(running.sumoMatch).toBe(DEFAULT_SETTINGS.sumoMatch); // next match
  });
});
