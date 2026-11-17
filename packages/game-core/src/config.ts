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

// Sumo's two variants (LIVES 2026-11-17): "points" — the most knockout points wins (the time
// limit, or earlier when only one team has players left); "last-standing" — no points, the last
// player still in the arena wins. The server picks one per match, or lets them take turns.
export const SUMO_VARIANTS = ['points', 'last-standing'] as const;
export type SumoVariant = (typeof SUMO_VARIANTS)[number];
export const VARIANT_CHOICES = [...SUMO_VARIANTS, 'alternate'] as const;
export type VariantChoice = (typeof VARIANT_CHOICES)[number];
// Last One Standing after the third halving: "stop-time" — the arena keeps its size, the match
// ends at its time limit; "keep-halving" — it halves every halvingEveryMs, no time limit;
// "stop-open" — it keeps its size and there is no time limit.
export const AFTER_LAST = ['stop-time', 'keep-halving', 'stop-open'] as const;
export type AfterLast = (typeof AFTER_LAST)[number];

export interface SumoConfig {
  lives: number; // each ghost's lives in a match; a fall costs one, none left: out
  variant: VariantChoice; // the server's choice; a match plays one SumoVariant
  afterLast: AfterLast; // Last One Standing only; read every tick (the owner's slider)
  halvingEveryMs: number; // "keep-halving": the interval after the third halving
}

// The jump (owner's idea, JUMP 2026-11-17): a moment in the air to let a dash pass underneath.
export interface JumpConfig {
  enabled: boolean; // the owner's switch: off, a jump does nothing and the clients hide it
  airMs: number; // in the air: nothing hits it, it pushes nobody, it barely steers
  cooldownMs: number; // between two jumps, enforced by the core
  steer: number; // the share of the held direction that still steers in the air
}

export interface BotConfig {
  // Where a bot turns back inward (bots/bot.ts edgeMargin): edgeMargin field units from the edge,
  // but in a small arena at most edgeShare of its radius, so a halved arena does not leave the
  // bots only its middle (FIX 2026-11-17-4) — never less than a ghost radius.
  edgeMargin: number;
  edgeShare: number;
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
  jumpChance: number; // at average form: the share of dashes at it a bot jumps over
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
  knockSpeed: number; // units/s a dash hit throws the hit ghost off at (at least)
  knockWeight: number; // a thrown ghost counts this much heavier while dashMs lasts
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
  sumo: SumoConfig;
  jump: JumpConfig;
  bots: BotConfig;
}

export const DEFAULT_CONFIG: GameConfig = {
  mode: 'sumo',
  matchDurationMs: 300_000, // 5 minutes, as Seasonal Spirits
  seasonDurationMs: 75_000, // four seasons of 75 s
  startSeason: 'spring', // placeholder — the website's season clock later
  fieldSize: 2000,
  wallHalf: 700, // placeholder — owner decides (a 1400 square: hill and bomb)
  // 25 ghost diameters across (TUNE 2026-11-17: at 56 nobody fell in the first season and the
  // ghosts were drawn tiny); after three halvings (400 → 141) still 9 across. Placeholder —
  // owner decides with the live sliders (docs/SERVER.md, "Live tuning").
  arenaRadius: 400,
  arenaShrinkMs: 2000, // placeholder — owner decides
  ghostRadius: 16, // placeholder — owner decides
  // Walking 25 % slower than the first prototype's 320 and 1200 (TUNE 2026-11-17); the
  // tuning sliders scale the acceleration with the top speed. Placeholders — owner decides.
  acceleration: 900,
  friction: 2.5, // placeholder — owner decides
  maxSpeed: 240,
  // Twice the top speed: a dash carries (dashSpeed − maxSpeed) / friction = 96, 3 ghost
  // diameters, before it is back at top speed (FIX 2026-11-17-2 measured 7 at 900 and found the
  // bots zipping around; at most 4 since). Placeholder — owner decides.
  dashSpeed: 480,
  dashMs: 250, // placeholder — owner decides
  dashCooldownMs: 1500, // placeholder — owner decides (owner's sketch: about 1.5 s)
  // A dash hit throws a standing ghost about 5 ghost diameters (knockSpeed / friction plus the
  // dasher's follow-through); the crowd it flies into gives way (knockWeight). Placeholders —
  // owner decides (TUNE 2026-11-17: 4–5 diameters, not cancelled by a crowd).
  knockSpeed: 320,
  knockWeight: 10,
  // No bounce: a ghost running into a standing one at top speed moves it about 1.5 diameters
  // (TUNE 2026-11-17 asked for about 1; at 0.6 it was 2.3). Placeholder — owner decides.
  restitution: 0,
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
  // Placeholders — owner decides with the live sliders (LIVES 2026-11-17).
  sumo: { lives: 3, variant: 'points', afterLast: 'stop-time', halvingEveryMs: 75_000 },
  // Half a second in the air, every 3 s at most, a tenth of the steering left. Placeholders —
  // owner decides with the live panel (JUMP 2026-11-17).
  jump: { enabled: true, airMs: 500, cooldownMs: 3000, steer: 0.1 },
  bots: {
    edgeMargin: 140, // placeholder — owner decides
    // 140 of the starting radius 400, so the full arena keeps the absolute margin; 49 of the last
    // halving's 141, where 140 left the bots only the middle (FIX 2026-11-17-4: a share of 0.15
    // everywhere made it 60 in the full arena, and every match ended by elimination at 2–4 min).
    // Placeholder — owner decides.
    edgeShare: 0.35,
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
    jumpChance: 0.5, // placeholder — owner decides (JUMP 2026-11-17: never a perfect dodge)
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

// The owner's live tuning (TUNE, LIVES and JUMP 2026-11-17, development only; the numbers and
// their ranges are protocol's tuning.ts): the config fields eleven whole numbers set — the
// acceleration scales with the top speed, so a ghost reaches it in the same time; variant and
// afterLast are indices in VARIANT_CHOICES and AFTER_LAST, the halving interval is in seconds,
// jump is 1 on and 0 off.
export interface Tunable {
  arenaRadius: number;
  maxSpeed: number;
  dashSpeed: number;
  knockSpeed: number;
  lives: number;
  variant: number;
  afterLast: number;
  halvingEverySec: number;
  jump: number;
  jumpMs: number;
  jumpCooldownMs: number;
}
export type TunedFields = Pick<
  GameConfig,
  'arenaRadius' | 'maxSpeed' | 'dashSpeed' | 'knockSpeed' | 'acceleration' | 'sumo' | 'jump'
>;
const ACCELERATION_PER_SPEED = DEFAULT_CONFIG.acceleration / DEFAULT_CONFIG.maxSpeed;

export function tunedFields(t: Tunable): TunedFields {
  const { arenaRadius, maxSpeed, dashSpeed, knockSpeed } = t;
  return {
    arenaRadius,
    maxSpeed,
    dashSpeed,
    knockSpeed,
    acceleration: maxSpeed * ACCELERATION_PER_SPEED,
    sumo: {
      lives: t.lives,
      variant: VARIANT_CHOICES[t.variant] ?? 'points',
      afterLast: AFTER_LAST[t.afterLast] ?? 'stop-time',
      halvingEveryMs: t.halvingEverySec * 1000,
    },
    jump: {
      ...DEFAULT_CONFIG.jump,
      enabled: t.jump === 1,
      airMs: t.jumpMs,
      cooldownMs: t.jumpCooldownMs,
    },
  };
}

// The other way round: a config's numbers as the sliders show them (their starting values).
export function tuningOf(cfg: GameConfig): Tunable {
  const { arenaRadius, maxSpeed, dashSpeed, knockSpeed, sumo, jump } = cfg;
  return {
    arenaRadius,
    maxSpeed,
    dashSpeed,
    knockSpeed,
    lives: sumo.lives,
    variant: VARIANT_CHOICES.indexOf(sumo.variant),
    afterLast: AFTER_LAST.indexOf(sumo.afterLast),
    halvingEverySec: Math.round(sumo.halvingEveryMs / 1000),
    jump: jump.enabled ? 1 : 0,
    jumpMs: jump.airMs,
    jumpCooldownMs: jump.cooldownMs,
  };
}

// Hill and bomb play inside walls (nobody falls); sumo on the disc.
export function walled(cfg: GameConfig): boolean {
  return cfg.mode !== 'sumo';
}
