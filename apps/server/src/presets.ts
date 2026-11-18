// Seasonal Sumo — named presets of the settings (NIGHT 2026-11-18, piece 3): saved by the admin
// panel, one JSON file each in a dev data folder outside the repository's tracked files
// (`data/presets/`, git-ignored), the name of the last loaded one beside them so `pnpm dev`
// starts with it. Every preset is checked against the game's one schema (game-core readSettings)
// when it is saved and when it is loaded: an invalid or unknown value is refused, never applied.
// Bounded: names of 1–32 lowercase letters, digits and dashes, at most MAX_PRESETS files.

import fs from 'node:fs';
import path from 'node:path';
import { readSettings, type Settings } from '@seasonal-spirits/game-core';
import { PRESET_NAME } from '@seasonal-spirits/protocol';

const MAX_PRESETS = 50;
const MAX_FILE_BYTES = 8192; // the settings as JSON take under 2 KB
const LAST = 'last-loaded.txt';

export type PresetResult = { ok: true; settings: Settings } | { ok: false; reason: string };

export class PresetStore {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  list(): string[] {
    if (!fs.existsSync(this.dir)) return [];
    return fs
      .readdirSync(this.dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
      .filter((n) => PRESET_NAME.test(n))
      .sort();
  }

  save(name: string, settings: Settings): PresetResult {
    if (!PRESET_NAME.test(name)) return { ok: false, reason: 'name' };
    const valid = readSettings(settings);
    if (!valid) return { ok: false, reason: 'invalid' };
    if (!this.list().includes(name) && this.list().length >= MAX_PRESETS) {
      return { ok: false, reason: 'full' };
    }
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.file(name), JSON.stringify(valid, null, 2));
    return { ok: true, settings: valid };
  }

  // The preset's settings, checked against the schema; it becomes the last loaded one.
  load(name: string): PresetResult {
    if (!PRESET_NAME.test(name) || !this.list().includes(name))
      return { ok: false, reason: 'unknown' };
    const file = this.file(name);
    if (fs.statSync(file).size > MAX_FILE_BYTES) return { ok: false, reason: 'invalid' };
    let value: unknown;
    try {
      value = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return { ok: false, reason: 'invalid' };
    }
    const settings = readSettings(value);
    if (!settings) return { ok: false, reason: 'invalid' };
    fs.writeFileSync(path.join(this.dir, LAST), name);
    return { ok: true, settings };
  }

  remove(name: string): boolean {
    if (!PRESET_NAME.test(name) || !this.list().includes(name)) return false;
    fs.unlinkSync(this.file(name));
    // `pnpm dev` keeps the rotation off while a last loaded preset is marked; a deleted one
    // must not keep it off.
    if (this.lastLoaded() === null) fs.rmSync(path.join(this.dir, LAST), { force: true });
    return true;
  }

  // The name of the last loaded preset, if it still exists.
  lastLoaded(): string | null {
    const file = path.join(this.dir, LAST);
    if (!fs.existsSync(file)) return null;
    const name = fs.readFileSync(file, 'utf8').trim();
    return PRESET_NAME.test(name) && this.list().includes(name) ? name : null;
  }

  private file(name: string): string {
    return path.join(this.dir, `${name}.json`);
  }
}
