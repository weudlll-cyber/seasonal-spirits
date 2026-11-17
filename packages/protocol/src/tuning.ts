// Seasonal Sumo — the owner's live tuning (TUNE and LIVES 2026-11-17, development only): the
// eight whole numbers the viewer's panel sets, their ranges, and the one reader every side checks
// them with — the server on the viewer's request, the clients on the server's word. Which config
// fields they set is game-core's tunedFields (variant and afterLast: indices in its
// VARIANT_CHOICES and AFTER_LAST).

import { isIntIn, isObject } from './checks.js';

export const TUNING_KEYS = [
  'arenaRadius',
  'maxSpeed',
  'dashSpeed',
  'knockSpeed',
  'lives',
  'variant',
  'afterLast',
  'halvingEverySec',
] as const;
export type TuningKey = (typeof TUNING_KEYS)[number];
export type Tuning = Record<TuningKey, number>;

// Whole numbers in field units and units/s, a wide band around the starting values: the arena
// from 10 to 60 ghost diameters across, walking from half to twice today's top speed; 1 to 9
// lives; three variant choices (Points, Last One Standing, alternate) and three ways after the
// last season; keep-halving every 30 to 120 s.
export const TUNING_RANGES: Readonly<Record<TuningKey, readonly [number, number]>> = {
  arenaRadius: [160, 960],
  maxSpeed: [120, 480],
  dashSpeed: [160, 1200],
  knockSpeed: [0, 960],
  lives: [1, 9],
  variant: [0, 2],
  afterLast: [0, 2],
  halvingEverySec: [30, 120],
};

// Exactly the eight keys, each a whole number in its range; anything else is null.
export function readTuning(value: unknown): Tuning | null {
  if (!isObject(value) || Object.keys(value).length !== TUNING_KEYS.length) return null;
  const out: Partial<Tuning> = {};
  for (const key of TUNING_KEYS) {
    const n = value[key];
    const [min, max] = TUNING_RANGES[key];
    if (!isIntIn(n, min, max)) return null;
    out[key] = n;
  }
  return out as Tuning;
}
