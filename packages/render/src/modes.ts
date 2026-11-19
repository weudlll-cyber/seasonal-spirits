// Seasonal Sumo — what the clients say about each game mode, in one place: its name in the
// band (sumo's with its variant), its halving in the countdown and the banner, its last-chance
// call, what a ghost's score counts. The wire carries the mode as its index in game-core's
// GAME_MODES, sumo's variant as STATE_LAST_STANDING.

import {
  DEFAULT_SETTINGS,
  GAME_MODES,
  configFrom,
  type GameConfig,
  type GameMode,
  type Settings,
} from '@seasonal-spirits/game-core';
import { STATE_LAST_STANDING, type WireDisc } from '@seasonal-spirits/protocol';

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

// King of the Season's zone in a state (its glowing disc); null in the other modes.
export function zoneOf(s: { mode: number; area: WireDisc | null } | undefined): WireDisc | null {
  return s && modeOf(s.mode) === 'hill' ? s.area : null;
}

// How many top scorers show their score (GhostStyle.scoreTop): Halving Bomb's labels are names,
// with the score only for the top three and the own ghost; null in the other modes (all scores).
export function scoreTopOf(s: { mode: number } | undefined): number | null {
  return s && modeOf(s.mode) === 'bomb' ? 3 : null;
}

// Sumo's variant of the match on screen, by its name; null in the walled modes.
export function variantName(s: { mode: number; flags: number }): string | null {
  if (modeOf(s.mode) !== 'sumo') return null;
  return s.flags & STATE_LAST_STANDING ? 'Last One Standing' : 'Points';
}

// The band's name of the match: the mode's, with sumo's variant ("Seasonal Sumo · Points").
export function matchName(s: { mode: number; flags: number }): string {
  const variant = variantName(s);
  return variant ? `${modeWords(s.mode).name} · ${variant}` : modeWords(s.mode).name;
}

// The mode's config as the clients know it (the server's is the truth; the clients need its
// walls, its season count and its season length for drawing and their prediction), with the
// owner's live tuning when the server sent one (development only).
export function clientConfig(index: number, tuning: Settings | null = null): GameConfig {
  return configFrom(tuning ?? DEFAULT_SETTINGS, modeOf(index));
}

// The running match's config as the client knows it, with the walls where the newest state has
// them: in hill and bomb they close in at a halving (2026-11-19) — the prediction's bounds, the
// fence and the camera follow them.
export function liveConfig(
  s: { mode: number; wall: number },
  tuning: Settings | null = null,
): GameConfig {
  const cfg = clientConfig(s.mode, tuning);
  return s.wall > 0 ? { ...cfg, wallHalf: s.wall } : cfg;
}

// The bombs' fuse: the share of the season left — 1 just handed out … 0 going off.
export function fuseLeft(s: { mode: number; seasonLeftMs: number }): number {
  return s.seasonLeftMs / clientConfig(s.mode).seasonDurationMs;
}
