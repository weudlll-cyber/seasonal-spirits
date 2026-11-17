// Seasonal Sumo — the four seasons, their order and the season clock of a match.
// Spring → Summer → Autumn → Winter → Spring, as the real tokens; every turn is a halving.

import type { GameConfig } from './config.js';

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export function nextSeason(s: Season): Season {
  return SEASONS[(SEASONS.indexOf(s) + 1) % SEASONS.length] ?? 'spring';
}

export interface SeasonClock {
  current: Season;
  next: Season;
  index: number; // 0-based season number within the match
  timeLeftMs: number; // until the next season (or the match end)
}

export function seasonsInMatch(cfg: GameConfig): number {
  return Math.ceil(cfg.matchDurationMs / cfg.seasonDurationMs);
}

export function seasonClock(cfg: GameConfig, elapsedMs: number): SeasonClock {
  const index = Math.min(seasonsInMatch(cfg) - 1, Math.floor(elapsedMs / cfg.seasonDurationMs));
  let current = cfg.startSeason;
  for (let i = 0; i < index; i++) current = nextSeason(current);
  const seasonEnd = Math.min(cfg.matchDurationMs, (index + 1) * cfg.seasonDurationMs);
  return { current, next: nextSeason(current), index, timeLeftMs: seasonEnd - elapsedMs };
}
