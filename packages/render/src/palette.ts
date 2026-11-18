// Seasonal Spirits — colours and names of the four seasons and the Sky Island look's palette
// (owner's choice 2026-11-18): the one list both apps draw with; index = season = team.

// The team colours of the Sky Island look (they replace the website's tokens in this game; the
// owner's question of 2026-11-16 — Summer and Autumn too alike — answered with them).
export const SEASON_COLOURS = ['#9BD15A', '#FF8A3D', '#FFC23C', '#4CC2FF'] as const;
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;

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
  feet: readonly string[]; // per team: the shade of its colour the feet wear
  marker: string; // the own character's ring and triangle
  puff: string; // dash puffs, fall streaks, the splash
  panel: string; // labels, the clock, bubbles
  panelText: string;
  alertText: string; // the clock's countdown on the panel
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
  feet: ['#7fb446', '#e2702a', '#e8a82a', '#2ea6e4'],
  marker: '#ffffff',
  puff: '#ffffff',
  panel: '#ffffff',
  panelText: '#2b2140',
  alertText: '#c2183a',
};

// Announcements, the countdown and lives: one red for both looks.
export const ALERT = '#FF5A6E';

export function look(): Look {
  return LIGHT;
}

export function seasonColour(i: number): string {
  return SEASON_COLOURS[i & 3] ?? '#ffffff';
}

export function seasonName(i: number): string {
  return SEASON_NAMES[i & 3] ?? '?';
}
