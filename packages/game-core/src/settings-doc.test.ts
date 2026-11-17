// Seasonal Sumo — docs/SETTINGS.md is the schema's own table (settings-doc.ts): this fails when a
// setting changes and the doc is not regenerated (`pnpm settings:doc`). Prettier's padding of the
// table is not part of the comparison.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { settingsDoc } from './settings-doc.js';

const plain = (md: string): string => md.replace(/-{3,}/g, '---').replace(/\s+/g, ' ').trim();

describe('docs/SETTINGS.md', () => {
  it('is the table generated from the settings schema', () => {
    const file = readFileSync(new URL('../../../docs/SETTINGS.md', import.meta.url), 'utf8');
    expect(plain(file)).toBe(plain(settingsDoc()));
  });
});
