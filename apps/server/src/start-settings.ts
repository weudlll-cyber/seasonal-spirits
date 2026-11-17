// Seasonal Sumo — the settings a server starts with (NIGHT 2026-11-18, piece 3): the defaults
// (game-core settings.ts), then a named preset — PRESET, or with the admin endpoint on the one
// loaded last — then what the environment asks for in development and the tests (GAME_MODE,
// SUMO_VARIANT, SUMO_LIVES, SEASON_SECONDS, RESULT_SECONDS, GHOSTS). Every value is checked: an
// environment value out of its range, a preset that does not pass the schema, or a result that
// does not, stops the server before it starts.

import {
  DEFAULT_SETTINGS,
  VARIANT_CHOICES,
  readSettings,
  type Settings,
} from '@seasonal-spirits/game-core';
import { envChoice, envInt, type Env } from './env.js';
import { PRESET_NAME } from '@seasonal-spirits/protocol';
import type { PresetStore } from './presets.js';

// GAME_MODE's rotation slots (game-core ROTATION_SLOTS): one mode, or every mode in turn — Sumo
// Points, King of the Season, Halving Bomb, Sumo Last One Standing (NIGHT 2026-11-18, piece 7).
const ROTATIONS: Record<string, number[]> = {
  sumo: [1],
  hill: [4],
  bomb: [5],
  rotate: [2, 4, 5, 3],
};

// GHOSTS: the seats, 4 to 48, eight per team by default; a multiple of four (teams take seats in
// turn). The team size, or undefined when not set.
export function teamSizeFromEnv(env: Env): number | undefined {
  if (env.GHOSTS === undefined || env.GHOSTS === '') return undefined;
  const ghosts = envInt(env, 'GHOSTS', 32, [4, 48]);
  if (ghosts % 4 !== 0) throw new Error(`GHOSTS must be a multiple of 4, got "${env.GHOSTS}"`);
  return ghosts / 4;
}

// The environment's overrides: only the variables that are set.
function fromEnv(env: Env): Partial<Settings> {
  const out: Partial<Settings> = {};
  const set = (name: string): boolean => env[name] !== undefined && env[name] !== '';
  if (set('GAME_MODE')) {
    const mode = envChoice(env, 'GAME_MODE', 'sumo', ['sumo', 'hill', 'bomb', 'rotate'] as const);
    const slots = ROTATIONS[mode] ?? [1];
    for (let i = 0; i < 6; i++) Object.assign(out, { [`rotation${String(i + 1)}`]: slots[i] ?? 0 });
  }
  if (set('SUMO_VARIANT')) {
    out.variant = VARIANT_CHOICES.indexOf(
      envChoice(env, 'SUMO_VARIANT', 'points', VARIANT_CHOICES),
    );
  }
  if (set('SUMO_LIVES')) out.lives = envInt(env, 'SUMO_LIVES', 3, [1, 9]);
  if (set('SEASON_SECONDS')) {
    out.sumoSeason = envInt(env, 'SEASON_SECONDS', 75, [15, 75]);
    out.sumoMatch = 4 * out.sumoSeason;
  }
  if (set('RESULT_SECONDS')) out.resultPause = envInt(env, 'RESULT_SECONDS', 15, [3, 60]);
  const teamSize = teamSizeFromEnv(env);
  if (teamSize !== undefined) out.teamSize = teamSize;
  return out;
}

// The preset to start from: PRESET, else the last loaded one; its settings, checked.
function presetBase(
  env: Env,
  presets: PresetStore | null,
): { base: Settings; preset: string | null } {
  const named = env.PRESET !== undefined && env.PRESET !== '' ? env.PRESET : null;
  if (named !== null && !PRESET_NAME.test(named)) {
    throw new Error(`PRESET "${named}" is not a name`);
  }
  const preset = named ?? presets?.lastLoaded() ?? null;
  if (preset === null) return { base: DEFAULT_SETTINGS, preset };
  if (!presets) throw new Error('PRESET needs the admin settings (DEV_TUNING=1)');
  const loaded = presets.load(preset);
  if (!loaded.ok) throw new Error(`preset "${preset}" could not be loaded (${loaded.reason})`);
  return { base: loaded.settings, preset };
}

// The starting settings and the preset they came from, if any.
export function startSettings(
  env: Env,
  presets: PresetStore | null,
): { settings: Settings; preset: string | null } {
  const { base, preset } = presetBase(env, presets);
  const settings = readSettings({ ...base, ...fromEnv(env) });
  if (!settings) throw new Error('the starting settings do not pass the schema');
  return { settings, preset };
}
