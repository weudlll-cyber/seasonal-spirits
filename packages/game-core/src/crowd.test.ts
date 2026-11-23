// Seasonal Sumo — King's smallest field and zone from the crowd: the field holds four crowds
// shoulder to shoulder, the zone one and a half within its quarter; the settings start there.

import { describe, expect, it } from 'vitest';
import { configFrom } from './config.js';
import { FIELD_CROWDS, ZONE_CROWDS, crowdArea, smallestField, smallestZone } from './crowd.js';
import { DEFAULT_SETTINGS } from './settings.js';

describe('room for the crowd', () => {
  it('counts a character standing shoulder to shoulder as the square of its diameter', () => {
    expect(crowdArea(16, 32)).toBe(32 * 32 * 32);
  });

  it.each([
    [16, 32],
    [8, 4],
    [32, 48],
  ])('sizes field and zone for the crowd and fits the zone into its quarter (r %d, %d)', (r, n) => {
    const field = smallestField(r, n);
    const zone = smallestZone(r, n);
    expect((2 * field) ** 2).toBeGreaterThanOrEqual(FIELD_CROWDS * crowdArea(r, n) - 1e-6);
    expect(Math.PI * zone ** 2).toBeCloseTo(ZONE_CROWDS * crowdArea(r, n), 6);
    expect(zone).toBeLessThanOrEqual(field / 2 + 1e-9);
  });

  it("starts King's settings at the crowd's numbers: 260 and 130 for 32 characters of radius 16", () => {
    const king = configFrom(DEFAULT_SETTINGS, 'hill');
    expect([king.walls.smallest, king.hill.smallest]).toEqual([260, 130]);
  });
});
