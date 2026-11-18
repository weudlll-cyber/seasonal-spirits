// Seasonal Sumo — the admin panel's one request helper (moved out of admin-panel.ts in the panel
// rebuild): the commands it sends to the server's admin settings endpoint (protocol
// ADMIN_SETTINGS_PATH; apps/server admin-settings.ts decides who may) and the answer, every part
// checked against the game's one schema before the panel uses it.

import { readSettings, type Settings } from '@seasonal-spirits/game-core';
import { PRESET_NAME } from '@seasonal-spirits/protocol';

export interface AdminView {
  current: Settings; // what the next match starts with: the running match's, 'next' rows aside
  presets: string[];
  keep: boolean; // "keep playing this game" is on
  preset: Settings | null; // a preset read into the draft
}

export type Command =
  | { action: 'apply'; settings: Settings }
  | { action: 'save'; name: string; settings?: Settings } // without: the current settings
  | { action: 'load' | 'read' | 'delete'; name: string } // load applies, read fills the draft
  | { action: 'start'; game: string; settings: Settings; keep: boolean }
  | { action: 'keep'; on: boolean };

// The endpoint's answer, every part checked: the settings against the schema, the names.
function readView(v: unknown): AdminView | null {
  if (typeof v !== 'object' || v === null) return null;
  const { current, presets, keep, preset } = v as Record<string, unknown>;
  const now = readSettings(current);
  const names = Array.isArray(presets) ? presets.filter((n) => typeof n === 'string') : [];
  if (!now || typeof keep !== 'boolean' || names.some((n) => !PRESET_NAME.test(n))) return null;
  return { current: now, presets: names, keep, preset: readSettings(preset) };
}

// GET (no command) or POST one; null when the endpoint is absent or refuses.
export async function call(url: string, command: Command | null): Promise<AdminView | null> {
  try {
    const r = await fetch(
      url,
      command
        ? {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(command),
          }
        : {},
    );
    return r.ok ? readView(await r.json()) : null;
  } catch {
    return null;
  }
}
