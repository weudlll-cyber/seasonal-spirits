// Seasonal Spirits — the four seasons, their order and the season clock of a match.
// Spring → Summer → Autumn → Winter → Spring, as the real tokens (CONCEPT.md §2).

import type { GameConfig } from './config.js';

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export type SeasonCounts = Record<Season, number>;

export function emptyCounts(): SeasonCounts {
  return { spring: 0, summer: 0, autumn: 0, winter: 0 };
}

export function totalCount(c: SeasonCounts): number {
  return c.spring + c.summer + c.autumn + c.winter;
}

export function nextSeason(s: Season): Season {
  return SEASONS[(SEASONS.indexOf(s) + 1) % SEASONS.length] ?? 'spring';
}

export interface SeasonClock {
  current: Season;
  next: Season;
  index: number; // 0-based season number within the match
  timeLeftMs: number; // until the next season (or the match end)
}

export function seasonClock(cfg: GameConfig, elapsedMs: number): SeasonClock {
  const seasonsInMatch = Math.ceil(cfg.matchDurationMs / cfg.seasonDurationMs);
  const index = Math.min(seasonsInMatch - 1, Math.floor(elapsedMs / cfg.seasonDurationMs));
  let current = cfg.startSeason;
  for (let i = 0; i < index; i++) current = nextSeason(current);
  const seasonEnd = Math.min(cfg.matchDurationMs, (index + 1) * cfg.seasonDurationMs);
  return { current, next: nextSeason(current), index, timeLeftMs: seasonEnd - elapsedMs };
}

// The value of carried coins if banked now: full in their own season, reduced outside.
export function valueNow(cfg: GameConfig, carried: SeasonCounts, current: Season): number {
  let v = 0;
  for (const s of SEASONS) v += carried[s] * (s === current ? 1 : cfg.offSeasonValueFactor);
  return v;
}
