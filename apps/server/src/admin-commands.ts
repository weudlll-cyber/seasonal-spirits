// Seasonal Sumo — the admin settings endpoint's commands (moved out of admin-settings.ts, audit
// 2026-11-22 P3: the file at its line limit): what a POST body may ask, each read field by field.

import {
  readSettings,
  startableGame,
  type RotationSlot,
  type Settings,
} from '@seasonal-spirits/game-core';

// The commands: apply settings to the running match; save the current settings — or the
// panel's draft — as a preset, load one (applied), read one (into the draft only), delete one;
// start a game with its settings; switch "keep playing this game".
export type Command =
  | { action: 'apply'; settings: Settings }
  | { action: 'save'; name: string; settings: Settings | null }
  | { action: 'load' | 'read' | 'delete'; name: string }
  | { action: 'start'; game: RotationSlot; settings: Settings; keep: boolean }
  | { action: 'keep'; on: boolean };

type Fields = Record<string, unknown>;
const nameOf = (f: Fields): string | null =>
  typeof f.name === 'string' && f.name.length <= 32 ? f.name : null;
const named =
  (action: 'load' | 'read' | 'delete') =>
  (f: Fields): Command | null => {
    const name = nameOf(f);
    return name === null ? null : { action, name };
  };

// One reader per action, each checking its fields (the settings against the schema, the game
// against the startable games); null for anything else.
const READERS: Record<string, (f: Fields) => Command | null> = {
  apply: (f) => {
    const settings = readSettings(f.settings);
    return settings ? { action: 'apply', settings } : null;
  },
  save: (f) => {
    const name = nameOf(f);
    const draft = f.settings === undefined ? null : readSettings(f.settings);
    if (name === null || (f.settings !== undefined && !draft)) return null;
    return { action: 'save', name, settings: draft };
  },
  load: named('load'),
  read: named('read'),
  delete: named('delete'),
  start: (f) => {
    const game = startableGame(f.game);
    const settings = readSettings(f.settings);
    if (!game || !settings || typeof f.keep !== 'boolean') return null;
    return { action: 'start', game, settings, keep: f.keep };
  },
  keep: (f) => (typeof f.on === 'boolean' ? { action: 'keep', on: f.on } : null),
};

// A POST body: one command; null for anything else.
export function readCommand(value: unknown): Command | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const f = value as Fields;
  const read = typeof f.action === 'string' && Object.hasOwn(READERS, f.action);
  return read ? (READERS[f.action as string]?.(f) ?? null) : null;
}
