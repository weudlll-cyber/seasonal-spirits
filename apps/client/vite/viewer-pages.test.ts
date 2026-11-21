// Seasonal Sumo — one address (chain 2026-11-21, piece 1): /admin and /viewer reach the viewer's
// page on the client's port, everything else stays the game's.

import { describe, expect, it } from 'vitest';
import { VIEWER_BASE, viewerPath } from './viewer-pages.js';

describe("the viewer and admin pages on the game's address", () => {
  it('serves the viewer page at /admin, /admin/ and /viewer, keeping the query', () => {
    expect(viewerPath('/admin')).toBe(VIEWER_BASE);
    expect(viewerPath('/admin/')).toBe(VIEWER_BASE);
    expect(viewerPath('/viewer')).toBe(VIEWER_BASE);
    expect(viewerPath('/admin/?a=1')).toBe(`${VIEWER_BASE}?a=1`);
    expect(viewerPath('/viewer/src/main.ts')).toBe('/viewer/src/main.ts');
  });

  it("answers the admin page's relative files from the viewer (the kit's theme script)", () => {
    expect(viewerPath('/admin/theme-init.js')).toBe(`${VIEWER_BASE}theme-init.js`);
    expect(viewerPath('/admin/theme-init.js?v=2')).toBe(`${VIEWER_BASE}theme-init.js?v=2`);
  });

  it("leaves the game's own requests alone", () => {
    expect(viewerPath('/')).toBeNull();
    expect(viewerPath('/src/main.ts')).toBeNull();
    expect(viewerPath('/administrator')).toBeNull();
    expect(viewerPath('/viewers')).toBeNull();
  });
});
