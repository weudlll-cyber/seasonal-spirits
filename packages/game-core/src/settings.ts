// Seasonal Sumo — every number that shapes play, in one schema (NIGHT 2026-11-18, piece 3): its
// key, group, label, unit, range, step, default, the modes it belongs to, and whether it applies
// at once or from the next match — the shape here, the entries in settings-list.ts. The game's config is built from it (config.ts configFrom); the
// server validates with it (readSettings), the admin panel and the docs table (docs/SETTINGS.md,
// settings-doc.ts) are generated from it. Nothing else holds a gameplay number; the numbers in
// game-core that are not gameplay are listed in NOT_SETTINGS.

import type { GameMode } from './config.js';
import { ROTATION_SLOTS, SETTINGS } from './settings-list.js';

export const SETTING_GROUPS = ['general', 'bots', 'sumo', 'hill', 'bomb', 'rotation'] as const;
export type SettingGroup = (typeof SETTING_GROUPS)[number];
export const GROUP_LABELS: Record<SettingGroup, string> = {
  general: 'General',
  bots: 'Bots',
  sumo: 'Sumo',
  hill: 'King of the Season',
  bomb: 'Halving Bomb',
  rotation: 'Rotation',
};

export interface Setting {
  key: string;
  group: SettingGroup;
  label: string;
  unit: string; // as the panel shows it; times in seconds
  min: number;
  max: number;
  step: number;
  default: number;
  modes: readonly GameMode[]; // where it shapes play
  apply: 'now' | 'next'; // at once in the running match, or from the next match
  choices?: readonly string[]; // a choice: the value is the index (a switch: off, on)
}

export { ROTATION_SLOTS, SETTINGS };

export type SettingKey = (typeof SETTINGS)[number]['key'];
export type Settings = Record<SettingKey, number>;

export const DEFAULT_SETTINGS: Settings = Object.fromEntries(
  SETTINGS.map((s) => [s.key, s.default]),
) as Settings;

const BY_KEY = new Map<string, Setting>(SETTINGS.map((s) => [s.key, s]));

export function settingOf(key: string): Setting | undefined {
  return BY_KEY.get(key);
}

// On its step from the minimum (a float's last digits forgiven).
function onStep(s: Setting, v: number): boolean {
  const k = (v - s.min) / s.step;
  return Math.abs(k - Math.round(k)) < 1e-6;
}

// Exactly the schema's keys, each a finite number in its range and on its step; anything else is
// null — never applied, never stored (the tuning channel, presets, the clients' copy).
export function readSettings(value: unknown): Settings | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const fields = value as Record<string, unknown>;
  if (Object.keys(fields).length !== SETTINGS.length) return null;
  const out: Partial<Settings> = {};
  for (const s of SETTINGS) {
    const v = fields[s.key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < s.min || v > s.max || !onStep(s, v)) {
      return null;
    }
    out[s.key] = v;
  }
  return out as Settings;
}

// The running match's settings after a change: the values that apply at once from `wanted`,
// the rest as the match began with (`started`).
export function nowPart(started: Settings, wanted: Settings): Settings {
  const out = { ...started };
  for (const s of SETTINGS) if (s.apply === 'now') out[s.key] = wanted[s.key];
  return out;
}

// The numbers in game-core that are not gameplay, and why; settings.test.ts holds every other
// top-level numeric constant in game-core to the schema.
export const NOT_SETTINGS: Record<string, string> = {
  FIELD_SIZE: 'the coordinate space the wire carries (u16 positions), not a play size',
  SPAWN_TRIES: 'how hard the respawn spot search looks, not a rule',
  GOLDEN: 'a mathematical constant that spreads wander points',
  GOLDEN_ANGLE: 'a mathematical constant that parts ghosts sharing one point',
  MAX_SUB_STEPS: 'a bound on the work of a stalled tick',
  TICK_MS: "the bots' perception granularity, the server's tick",
  SIM_TICK_MS: "the simulation's step, the server's tick",
  TOUCH_SLACK: 'a numerical tolerance: two touching ghosts lie exactly two radii apart',
};
