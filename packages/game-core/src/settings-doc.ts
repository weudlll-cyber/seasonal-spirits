// Seasonal Sumo — the settings table of docs/SETTINGS.md, generated from the one schema
// (settings.ts): `pnpm settings:doc` writes it, settings-doc.test.ts fails when the file and the
// schema part. No second list of the settings exists anywhere.

import { writeFileSync } from 'node:fs';
import { GROUP_LABELS, NOT_SETTINGS, SETTINGS, SETTING_GROUPS, type Setting } from './settings.js';

const range = (s: Setting): string =>
  s.choices
    ? s.choices.join(' / ')
    : `${String(s.min)}–${String(s.max)} ${s.unit} (step ${String(s.step)})`;
const value = (s: Setting): string =>
  s.choices ? (s.choices[s.default] ?? '?') : String(s.default);

export function settingsDoc(): string {
  const groups = SETTING_GROUPS.map((g) => {
    const rows = SETTINGS.filter((s) => s.group === g).map(
      (s) =>
        `| \`${s.key}\` | ${s.label} | ${range(s)} | ${value(s)} | ${s.modes.join(', ')} | ${s.apply === 'now' ? 'now' : 'next match'} |`,
    );
    return [
      `## ${GROUP_LABELS[g]}`,
      '',
      '| Key | Setting | Range | Default | Modes | Applies |',
      '| --- | --- | --- | --- | --- | --- |',
      ...rows,
    ].join('\n');
  });
  const not = Object.entries(NOT_SETTINGS).map(([k, why]) => `- \`${k}\`: ${why}`);
  return [
    '# Settings',
    '',
    'Generated from `packages/game-core/src/settings-list.ts` (the settings) and `settings.ts` (the',
    'numbers that are not settings) by `pnpm settings:doc` — do not edit by hand. Every number that',
    'shapes play; all placeholders the owner sets in the admin panel.',
    '',
    ...groups.flatMap((g) => [g, '']),
    '## Numbers in game-core that are not settings',
    '',
    ...not,
    '',
  ].join('\n');
}

// `pnpm settings:doc`: writes the file given (docs/SETTINGS.md).
const target = process.argv[2];
if (target && process.argv[1]?.endsWith('settings-doc.ts')) writeFileSync(target, settingsDoc());
