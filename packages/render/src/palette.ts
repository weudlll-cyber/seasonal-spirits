// Seasonal Spirits — colours and names of the four seasons and the Sky Island look's palette
// (owner's choice 2026-11-18): the one list both apps draw with; index = season = team.

export const SEASON_COLOURS = ['#AFB84E', '#E06E22', '#F9A825', '#04AAF7'] as const;
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;

export const TEXT = '#e6edf3';
export const MUTED = '#8b98a5';

// Every colour of the world around the ghosts: the sky, the sea, the island and what grows on it.
export interface Look {
  ink: string; // every outline
  sky: string;
  cloud: string;
  sea: string;
  wave: string;
  farTop: string; // the small far islands
  farUnder: string;
  sun: string;
  sunRing: string;
  grass: string;
  dirt: string;
  rock: string;
  strata: string;
  roots: string; // also the trees' trunks and the fence
  tuft: string;
  flowers: readonly string[];
  crowns: readonly [string, string];
  pebble: string;
  crack: string; // the next halving's line
}

export const LIGHT: Look = {
  ink: '#2b2140',
  sky: '#9EDCF5',
  cloud: '#ffffff',
  sea: '#3E9CC4',
  wave: '#7cc6e2',
  farTop: '#8fcf6a',
  farUnder: '#a58463',
  sun: '#fff1a8',
  sunRing: '#ffe073',
  grass: '#8ED36A',
  dirt: '#9a6b45',
  rock: '#b0896a',
  strata: '#8d6a52',
  roots: '#6e4c34',
  tuft: '#5ea845',
  flowers: ['#ff8fb1', '#ffffff', '#ffd23f'],
  crowns: ['#6cbf4b', '#ffb347'],
  pebble: '#d8d0c4',
  crack: '#6e4c34',
};

export function look(): Look {
  return LIGHT;
}

export function seasonColour(i: number): string {
  return SEASON_COLOURS[i & 3] ?? TEXT;
}

export function seasonName(i: number): string {
  return SEASON_NAMES[i & 3] ?? '?';
}
