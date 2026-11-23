// Seasonal Sumo — the game's "Admin" link exists in the dev build only: never in a production
// build, never without the admin panel switched on.

import { describe, expect, it } from 'vitest';
import { devAdmin } from './dev-admin.js';

describe('the dev admin link', () => {
  it('is in the dev server with the admin panel on', () => {
    expect(devAdmin({ DEV_TUNING: '1' }, 'serve')).toBe(true);
  });

  it('is never in a build, without DEV_TUNING, or with NODE_ENV=production', () => {
    expect(devAdmin({ DEV_TUNING: '1' }, 'build')).toBe(false);
    expect(devAdmin({}, 'serve')).toBe(false);
    expect(devAdmin({ DEV_TUNING: '0' }, 'serve')).toBe(false);
    expect(devAdmin({ DEV_TUNING: '1', NODE_ENV: 'production' }, 'serve')).toBe(false);
  });
});
