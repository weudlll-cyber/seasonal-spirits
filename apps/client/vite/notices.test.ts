// Seasonal Sumo — the built game carries Fredoka's licence text (audit 2026-11-22 P7 item 2, OFL
// §2). Why: without the plugin a build ships the font with no licence beside it.

import { describe, expect, it } from 'vitest';
import { NOTICES_FILE, thirdPartyNotices } from './notices.js';

describe('the third-party notices', () => {
  it("emits Fredoka's whole SIL Open Font License beside a build, and only in a build", () => {
    const plugin = thirdPartyNotices();
    expect(plugin.apply).toBe('build');
    const emitted: { fileName?: string; source?: unknown }[] = [];
    const generate = plugin.generateBundle as (this: unknown) => void;
    generate.call({ emitFile: (f: { fileName?: string; source?: unknown }) => emitted.push(f) });
    expect(emitted.map((f) => f.fileName)).toEqual([NOTICES_FILE]);
    const text = String(emitted[0]?.source);
    expect(text).toContain('Copyright 2016 The Fredoka Project Authors');
    expect(text).toContain('SIL OPEN FONT LICENSE Version 1.1');
    // The licence's last section: the whole text, not its head.
    expect(text).toContain('OTHER DEALINGS IN THE FONT SOFTWARE.');
  });
});
