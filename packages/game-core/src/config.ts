// Seasonal Sumo — every number of the prototype in one place, and the three game modes'
// own times (modeConfig). Every value is a placeholder the owner decides after playing
// (NIGHT 2026-11-17); nothing else holds a magic number.

import type { Season } from './seasons.js';

// The game mode of a match, chosen by the server per match (NIGHT 2026-11-17, piece 5):
// "sumo" — push them off a shrinking disc; "hill" — King of the Season, hold the zone;
// "bomb" — Halving Bomb, pass the bomb before it goes off.
export const GAME_MODES = ['sumo', 'hill', 'bomb'] as const;
export type GameMode = (typeof GAME_MODES)[number];

export interface HillConfig {
  zoneRadius: number; // the zone at the start; its area halves at each halving
  bounceMs: number; // leaving the zone within this of an opponent's touch: a bounce for it
}

export interface BombConfig {
  playersPerBomb: number; // one bomb per this many players, at least one
  passBackMs: number; // a bomb cannot go back to the ghost that just gave it before this
}

export interface BotConfig {
  edgeMargin: number; // field units from the edge where a bot turns back inward
  dashRange: number; // a bot dashes at an opponent closer than this…
  dashAimCos: number; // …when its heading points at it at least this well (cosine)
  wanderMs: number; // how often a bot's own offset around its target moves on
  // The human-like layer (bots/human.ts, owner requirement 2026-11-17):
  reactionMs: [number, number]; // each bot's reaction time is drawn from this range
  reactionJitterMs: number; // ± per decision
  aimNoiseDeg: number; // direction noise at average form, ± degrees
  dashChance: number; // share of good dash chances taken at average form (else too late)
  dashGapMs: number; // the least time between two of a bot's dashes (a calm player's pace)
  hesitateChance: number; // per decision: a short pause
  hesitateMs: number;
  edgeSlack: number; // a bot's own edge margin is drawn from [edgeSlack, 1] × edgeMargin
  form: [number, number]; // the band a bot's form drifts in (1 = average)
  formStep: number; // the largest step of the drift
  formEveryMs: number; // how often the form drifts
}

export interface GameConfig {
  mode: GameMode;
  matchDurationMs: number;
  seasonDurationMs: number;
  startSeason: Season;
  fieldSize: number;
  wallHalf: number; // hill and bomb: half the side of the walled square around the middle
  arenaRadius: number; // at the start; every halving divides the area by 2
  arenaShrinkMs: number; // how long the edge takes to ease in after a halving
  ghostRadius: number;
  acceleration: number; // units/s² towards the held direction
  friction: number; // share of the speed lost per second (exponential decay)
  maxSpeed: number; // units/s by running; a dash and a knock may go faster
  dashSpeed: number; // units/s at the start of a dash
  dashMs: number; // how long a dash counts as one (it knocks what it hits)
  dashCooldownMs: number; // between two dashes, enforced by the core
  knockSpeed: number; // units/s a dashing ghost adds to the one it hits
  restitution: number; // 0..1: how much two ghosts bounce off each other
  inSeasonPush: number; // ghosts of the team in season push this much harder
  fallMs: number; // the fall animation: falling, then out
  outMs: number; // from the fall until the respawn
  protectMs: number; // after the respawn: nothing pushes it, it pushes nothing
  creditMs: number; // a fall counts for the last opponent that touched within this time
  startSpread: number; // share of the radius the start ring sits at
  deadlineCountdownMs: number;
  reconnectGraceMs: number;
  resultPauseMs: number;
  hill: HillConfig;
  bomb: BombConfig;
  bots: BotConfig;
}

export const DEFAULT_CONFIG: GameConfig = {
  mode: 'sumo',
  matchDurationMs: 300_000, // 5 minutes, as Seasonal Spirits
  seasonDurationMs: 75_000, // four seasons of 75 s
  startSeason: 'spring', // placeholder — the website's season clock later
  fieldSize: 2000,
  wallHalf: 700, // placeholder — owner decides (a 1400 square: hill and bomb)
  // 32 ghosts of radius 16 fill about 1 % of a disc of 900: room at the start, and after three
  // halvings (900 → 318) still a disc a few ghosts can fight on.
  arenaRadius: 900, // placeholder — owner decides
  arenaShrinkMs: 2000, // placeholder — owner decides
  ghostRadius: 16, // placeholder — owner decides
  acceleration: 1200, // placeholder — owner decides
  friction: 2.5, // placeholder — owner decides
  maxSpeed: 320, // placeholder — owner decides
  // A dash carries at most 4 ghost diameters before it is back at top speed:
  // (dashSpeed − maxSpeed) / friction = 128 (owner 2026-11-17: at 900 it carried 7, the bots
  // zipped around). Placeholder — owner decides.
  dashSpeed: 640,
  dashMs: 250, // placeholder — owner decides
  dashCooldownMs: 1500, // placeholder — owner decides (owner's sketch: about 1.5 s)
  knockSpeed: 700, // placeholder — owner decides
  restitution: 0.6, // placeholder — owner decides
  inSeasonPush: 1.25, // placeholder — owner decides (owner's sketch: about 1.25)
  fallMs: 600, // placeholder — owner decides
  outMs: 3000, // placeholder — owner decides (owner's sketch: about 3 s)
  protectMs: 1000, // placeholder — owner decides (owner's sketch: about 1 s)
  creditMs: 3000, // placeholder — owner decides (owner's sketch: 3 s)
  startSpread: 0.6, // placeholder — owner decides
  deadlineCountdownMs: 10_000, // the countdown before every halving and the end, as before
  reconnectGraceMs: 12_000, // a disconnected player stands 12 s, then a bot takes over
  resultPauseMs: 15_000, // placeholder — owner decides (result screen before the next match)
  hill: {
    zoneRadius: 300, // placeholder — owner decides
    bounceMs: 1000, // placeholder — owner decides
  },
  bomb: {
    playersPerBomb: 8, // placeholder — owner decides (owner's sketch: one per 8 players)
    passBackMs: 1000, // owner's rule: not back to the giver for 1 s
  },
  bots: {
    edgeMargin: 140, // placeholder — owner decides
    dashRange: 220, // placeholder — owner decides
    dashAimCos: 0.9, // placeholder — owner decides
    wanderMs: 3000, // placeholder — owner decides
    reactionMs: [250, 450], // placeholder — owner decides (owner's sketch: 250–450 ms)
    reactionJitterMs: 50, // placeholder — owner decides
    aimNoiseDeg: 6, // placeholder — owner decides (owner's sketch: a few degrees)
    dashChance: 0.6, // placeholder — owner decides
    // At most one dash per 3 s, as a calm player (owner 2026-11-17: the bots zipped around at
    // ~23 dashes a minute). Placeholder — owner decides.
    dashGapMs: 3000,
    hesitateChance: 0.002, // placeholder — owner decides
    hesitateMs: 400, // placeholder — owner decides
    edgeSlack: 0.6, // placeholder — owner decides
    form: [0.85, 1.15], // placeholder — owner decides
    formStep: 0.06, // placeholder — owner decides
    formEveryMs: 5000, // placeholder — owner decides
  },
};

// Each mode's own times over the shared numbers: a season turn is the mode's halving — the
// arena halves (sumo), the zone jumps and halves (hill), the bombs go off (bomb).
const MODE_TIMES: Record<GameMode, Partial<GameConfig>> = {
  sumo: {},
  // placeholders — owner decides (owner's sketch: 3 min, the zone jumps every 45 s)
  hill: { matchDurationMs: 180_000, seasonDurationMs: 45_000 },
  // placeholders — owner decides (owner's sketch: 3 min, the bombs go off every 20 s); a
  // shorter countdown, so it does not run for half of every fuse
  bomb: { matchDurationMs: 180_000, seasonDurationMs: 20_000, deadlineCountdownMs: 5000 },
};

export function modeConfig(base: GameConfig, mode: GameMode): GameConfig {
  return { ...base, ...MODE_TIMES[mode], mode };
}

// Hill and bomb play inside walls (nobody falls); sumo on the disc.
export function walled(cfg: GameConfig): boolean {
  return cfg.mode !== 'sumo';
}
