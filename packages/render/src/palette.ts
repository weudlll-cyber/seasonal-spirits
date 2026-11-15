// Seasonal Spirits — colours and names of the four seasons, the one list both apps draw with.
// Token colours from the website's design tokens (CONCEPT.md §8); index = season = team.

export const SEASON_COLOURS = ['#AFB84E', '#E06E22', '#F9A825', '#04AAF7'] as const;
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;

// The map's ground per season: dark, with a cast of the season's colour (CONCEPT.md §8: the
// map changes colour and light with the season).
const GROUND = ['#121a0e', '#1c120b', '#1b160a', '#0b141c'] as const;

export const TEXT = '#e6edf3';
export const MUTED = '#8b98a5';
export const LINE = '#22303c';
// The shield around a carrier of swapped, steal-proof coins: ice-white, unlike any team colour
// and unlike the yellow steal range.
export const SHIELD = '#cfefff';

export function seasonColour(i: number): string {
  return SEASON_COLOURS[i & 3] ?? TEXT;
}

export function seasonName(i: number): string {
  return SEASON_NAMES[i & 3] ?? '?';
}

export function ground(i: number): string {
  return GROUND[i & 3] ?? '#0b0f14';
}
