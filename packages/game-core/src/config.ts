// Seasonal Sumo — every number of the prototype in one place. Every value is a placeholder the
// owner decides after playing (NIGHT 2026-11-17); nothing else holds a magic number.

import type { Season } from './seasons.js';

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
  earlyDashChance: number; // per decision: a dash at nothing in particular (too early)
  hesitateChance: number; // per decision: a short pause
  hesitateMs: number;
  edgeSlack: number; // a bot's own edge margin is drawn from [edgeSlack, 1] × edgeMargin
  form: [number, number]; // the band a bot's form drifts in (1 = average)
  formStep: number; // the largest step of the drift
  formEveryMs: number; // how often the form drifts
}

export interface GameConfig {
  matchDurationMs: number;
  seasonDurationMs: number;
  startSeason: Season;
  fieldSize: number;
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
  bots: BotConfig;
}

export const DEFAULT_CONFIG: GameConfig = {
  matchDurationMs: 300_000, // 5 minutes, as Seasonal Spirits
  seasonDurationMs: 75_000, // four seasons of 75 s
  startSeason: 'spring', // placeholder — the website's season clock later
  fieldSize: 2000,
  // 32 ghosts of radius 16 fill about 1 % of a disc of 900: room at the start, and after three
  // halvings (900 → 318) still a disc a few ghosts can fight on.
  arenaRadius: 900, // placeholder — owner decides
  arenaShrinkMs: 2000, // placeholder — owner decides
  ghostRadius: 16, // placeholder — owner decides
  acceleration: 1200, // placeholder — owner decides
  friction: 2.5, // placeholder — owner decides
  maxSpeed: 320, // placeholder — owner decides
  dashSpeed: 900, // placeholder — owner decides
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
  bots: {
    edgeMargin: 140, // placeholder — owner decides
    dashRange: 220, // placeholder — owner decides
    dashAimCos: 0.9, // placeholder — owner decides
    wanderMs: 3000, // placeholder — owner decides
    reactionMs: [250, 450], // placeholder — owner decides (owner's sketch: 250–450 ms)
    reactionJitterMs: 50, // placeholder — owner decides
    aimNoiseDeg: 6, // placeholder — owner decides (owner's sketch: a few degrees)
    dashChance: 0.6, // placeholder — owner decides
    earlyDashChance: 0.004, // placeholder — owner decides
    hesitateChance: 0.002, // placeholder — owner decides
    hesitateMs: 400, // placeholder — owner decides
    edgeSlack: 0.6, // placeholder — owner decides
    form: [0.85, 1.15], // placeholder — owner decides
    formStep: 0.06, // placeholder — owner decides
    formEveryMs: 5000, // placeholder — owner decides
  },
};
