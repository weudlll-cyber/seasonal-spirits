// Seasonal Sumo — what the clients say about each game mode, in one place: its name in the
// band, its halving in the countdown and the banner, its last-chance call, what a ghost's score
// counts. The wire carries the mode as its index in game-core's GAME_MODES.

import {
  DEFAULT_CONFIG,
  GAME_MODES,
  modeConfig,
  seasonsInMatch,
  type GameConfig,
  type GameMode,
} from '@seasonal-spirits/game-core';

export interface ModeWords {
  name: string;
  countdown: (next: string) => string; // "HALVING in 0:07 — …"
  banner: (season: string) => string; // "HALVING — …"
  lastChance: string; // "LAST CHANCE — … · 0:05"
  unit: string; // what a score counts, plural
}

const WORDS: Record<GameMode, ModeWords> = {
  sumo: {
    name: 'Seasonal Sumo',
    countdown: (next) => `the arena halves, then ${next} is in season`,
    banner: (season) => `the arena halves · ${season} is in season`,
    lastChance: 'push them off',
    unit: 'knockouts',
  },
  hill: {
    name: 'King of the Season',
    countdown: (next) => `the zone jumps to ${next} and halves`,
    banner: (season) => `the zone halves · ${season} is in season`,
    lastChance: 'hold the zone',
    unit: 'points',
  },
  bomb: {
    name: 'Halving Bomb',
    countdown: () => 'the bomb goes off',
    banner: () => 'the bomb goes off',
    lastChance: 'pass the bomb',
    unit: 'points',
  },
};

// The mode the wire names; an index it does not know reads as sumo.
export function modeOf(index: number): GameMode {
  return GAME_MODES[index] ?? 'sumo';
}

export function modeWords(index: number): ModeWords {
  return WORDS[modeOf(index)];
}

// The mode's config as the clients know it (the server's is the truth; the clients need its
// walls, its season count and its season length for drawing and their prediction).
export function clientConfig(index: number): GameConfig {
  return modeConfig(DEFAULT_CONFIG, modeOf(index));
}

export function seasonsOf(index: number): number {
  return seasonsInMatch(clientConfig(index));
}

// The bombs' fuse: the share of the season left — 1 just handed out … 0 going off.
export function fuseLeft(s: { mode: number; seasonLeftMs: number }): number {
  return s.seasonLeftMs / clientConfig(s.mode).seasonDurationMs;
}
