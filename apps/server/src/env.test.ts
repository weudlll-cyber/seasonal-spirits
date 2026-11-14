// Seasonal Spirits — environment values are checked at the boundary; dev tools refuse production.

import { describe, expect, it } from 'vitest';
import { envInt, refuseProduction } from './env.js';

describe('envInt', () => {
  it('uses the fallback when the variable is unset or empty', () => {
    expect(envInt({}, 'PORT', 3930, [1, 65535])).toBe(3930);
    expect(envInt({ PORT: '' }, 'PORT', 3930, [1, 65535])).toBe(3930);
  });

  it('accepts a whole number within the range', () => {
    expect(envInt({ PORT: '4000' }, 'PORT', 3930, [1, 65535])).toBe(4000);
  });

  it('stops on text, fractions, NaN, Infinity and values out of range', () => {
    for (const raw of ['abc', '1.5', 'NaN', 'Infinity', '0', '70000', '1e3']) {
      expect(() => envInt({ PORT: raw }, 'PORT', 3930, [1, 65535]), raw).toThrow(/PORT/);
    }
  });
});

describe('refuseProduction', () => {
  it('stops a development tool when NODE_ENV is production', () => {
    expect(() => {
      refuseProduction({ NODE_ENV: 'production' }, 'The dev server');
    }).toThrow(/development tool/);
    expect(() => {
      refuseProduction({ NODE_ENV: 'development' }, 'The dev server');
    }).not.toThrow();
  });
});
