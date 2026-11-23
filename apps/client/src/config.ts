// Seasonal Sumo — the client's configuration: the bridge box.
// The bridge box (CONCEPT.md §1 rule 3, §8) is on by default and switched off here.

import type { GameMode } from '@seasonal-spirits/game-core';

export interface ClientConfig {
  bridge: {
    enabled: boolean;
    startHereUrl: string; // the website's path for newcomers
    simulatorUrl: string;
  };
}

export const CLIENT_CONFIG: ClientConfig = {
  bridge: {
    enabled: true,
    // The website's "Start here" page (seasonal-entertainment docs/DESIGN.md, "Start here").
    startHereUrl: 'https://stentertainment.net/start',
    simulatorUrl: 'https://seasonaltokens.org',
  },
};

// The bridge box's line per mode: what a halving really does there (DECISIONS D6). Sumo's word
// for word from the owner's sketch (NIGHT 2026-11-17: the arena's radius × 0.71 halves its area);
// King of the Season — the zone jumps to the next season's quarter and shrinks, never below its
// smallest (game-core modes/hill.ts); Halving Bomb — every bomb goes off and its carrier loses
// `blastShare` of its points, half by default (modes/bomb.ts), so no number is promised here.
const TOKENS = 'This is how Seasonal Tokens work: every halving cuts in half —';
export const BRIDGE_TEXTS: Record<GameMode, string> = {
  sumo: `${TOKENS} here it cuts the arena.`,
  hill: `${TOKENS} here the zone jumps to the next season and shrinks, down to its smallest.`,
  bomb: `${TOKENS} here every bomb goes off and cuts its carrier's points.`,
};
