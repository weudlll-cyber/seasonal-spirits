// Seasonal Sumo — the owner's live tuning (TUNE, LIVES and JUMP 2026-11-17, development only):
// the eleven whole numbers the viewer's panel sets, their ranges, and the one reader every side checks
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
  'jump',
  'jumpMs',
  'jumpCooldownMs',
] as const;
export type TuningKey = (typeof TUNING_KEYS)[number];
export type Tuning = Record<TuningKey, number>;

// Whole numbers in field units and units/s, a wide band around the starting values: the arena
// from 10 to 60 ghost diameters across, walking from half to twice today's top speed; 1 to 9
// lives; three variant choices (Points, Last One Standing, alternate) and three ways after the
// last season; keep-halving every 30 to 120 s; the jump off (0) or on (1), 0.2 to 1.5 s in the
// air, a cooldown of 0.5 to 5 s (at most 255 steps of 20 ms on the wire).
export const TUNING_RANGES: Readonly<Record<TuningKey, readonly [number, number]>> = {
  arenaRadius: [160, 960],
  maxSpeed: [120, 480],
  dashSpeed: [160, 1200],
  knockSpeed: [0, 960],
  lives: [1, 9],
  variant: [0, 2],
  afterLast: [0, 2],
  halvingEverySec: [30, 120],
  jump: [0, 1],
  jumpMs: [200, 1500],
  jumpCooldownMs: [500, 5000],
};

// Exactly the eleven keys, each a whole number in its range; anything else is null.
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
