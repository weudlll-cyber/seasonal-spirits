// Seasonal Spirits — colours and names of the four seasons and the Sky Island look's palettes
// (owner's choice 2026-11-18), light and dark (the player's switch, look-switch.ts): the one
// list both apps draw with; index = season = team.

// The team colours of the Sky Island look (they replace the website's tokens in this game; the
// owner's question of 2026-11-16 — Summer and Autumn too alike — answered with them).
export const SEASON_COLOURS = ['#9BD15A', '#FF8A3D', '#FFC23C', '#4CC2FF'] as const;
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;

// Every colour of the world around the ghosts: the sky, the sea, the island and what grows on it.
export interface Look {
  night: boolean; // dark: stars and a moon instead of the sun, lanterns, a glowing crack
  ink: string; // every outline
  sky: string;
  cloud: string;
  sea: string;
  wave: string;
  farTop: string; // the small far islands
  farUnder: string;
  sun: string; // the moon at night
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
  night: false,
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

export const DARK: Look = {
  night: true,
  ink: '#120e22',
  sky: '#1d1b3f',
  cloud: '#3a3768',
  sea: '#15305a',
  wave: '#2f5a8e',
  farTop: '#3e5a52',
  farUnder: '#3b2f45',
  sun: '#fff3c4',
  sunRing: '#fff3c4',
  grass: '#4f8f5a',
  dirt: '#5a4058',
  rock: '#5b4a6e',
  strata: '#463a59',
  roots: '#3a2b3e',
  tuft: '#3c7a4a',
  flowers: ['#c9708f', '#d9d4ff', '#d6b14a'],
  crowns: ['#3f7d55', '#c97b3a'],
  pebble: '#6d6480',
  crack: '#ffcf6e',
  feet: ['#6f9a3c', '#c25a1c', '#c98c1a', '#1f86c0'],
  marker: '#ffe27a',
  puff: '#c9c3ff',
  panel: '#2b2550',
  panelText: '#f3f0ff',
  alertText: '#ff8a9a',
};

// The lanterns on the island at night.
export const LANTERN = '#ffd98a';

let current: Look = LIGHT;

// The look in force: Light unless the player switched to Dark (look-switch.ts).
export function look(): Look {
  return current;
}

export function useLook(dark: boolean): void {
  current = dark ? DARK : LIGHT;
}

export function seasonColour(i: number): string {
  return SEASON_COLOURS[i & 3] ?? '#ffffff';
}

export function seasonName(i: number): string {
  return SEASON_NAMES[i & 3] ?? '?';
}
