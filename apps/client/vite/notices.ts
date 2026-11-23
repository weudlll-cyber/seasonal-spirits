// Seasonal Sumo — the third-party notices that travel with the built game (audit 2026-11-22 P7
// item 2): the SIL Open Font License asks that Fredoka's licence text goes with every copy of the
// font (OFL §2), so a build writes THIRD-PARTY-NOTICES.txt beside the game, from the package's own
// LICENSE file (never a copy kept here).

import fs from 'node:fs';
import { createRequire } from 'node:module';
import type { Plugin } from 'vite';

export const NOTICES_FILE = 'THIRD-PARTY-NOTICES.txt';

// The notices: what each bundled third-party part is and its licence text as its package ships it.
export function noticesText(fredokaLicence: string): string {
  return [
    "Seasonal Party bundles the following third-party font. Its licence is not the game's own",
    '(AGPL-3.0-or-later); the font may be used, studied, modified and redistributed under it.',
    '',
    'Fredoka — @fontsource/fredoka, SIL Open Font License 1.1',
    '',
    fredokaLicence.trim(),
    '',
  ].join('\n');
}

export function thirdPartyNotices(): Plugin {
  return {
    name: 'seasonal-third-party-notices',
    apply: 'build',
    generateBundle() {
      const licence = createRequire(import.meta.url).resolve('@fontsource/fredoka/LICENSE');
      this.emitFile({
        type: 'asset',
        fileName: NOTICES_FILE,
        source: noticesText(fs.readFileSync(licence, 'utf8')),
      });
    },
  };
}
