// Seasonal Sumo — the shape of a match's config and how it is built from the settings
// (configFrom): every gameplay number lives in the settings schema (settings.ts, NIGHT 2026-11-18)
// and is a placeholder the owner sets with the admin panel; nothing here holds one.

import type { Season } from './seasons.js';
import { DEFAULT_SETTINGS, ROTATION_SLOTS, type Settings } from './settings.js';

// The game mode of a match, chosen by the server per match (NIGHT 2026-11-17, piece 5):
// "sumo" — push them off a shrinking disc; "hill" — King of the Season, hold the zone;
// "bomb" — Halving Bomb, pass the bomb before it goes off.
export const GAME_MODES = ['sumo', 'hill', 'bomb'] as const;
export type GameMode = (typeof GAME_MODES)[number];

export interface HillConfig {
  zoneRadius: number; // the zone at the start
  bounceMs: number; // leaving the zone within this of an opponent's touch: a bounce for it
  shrink: number; // each jump: the zone's radius × this
  pointsPerSecond: number; // each ghost in the zone
}

export interface BombConfig {
  playersPerBomb: number; // one bomb per this many players, at least one
  passBackMs: number; // a bomb cannot go back to the ghost that just gave it before this
  blastShare: number; // the share of its points a carrier loses when the bomb goes off
  pointsPerSecond: number; // everyone
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
  shrink: number; // each halving: the arena's radius × this
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
  approach: number; // share of the dash range a bot aims beside its target, from its own side
  // FIX 2026-11-17-5 (the last bots circled each other): once no halving is coming and fewer
  // than boldAt ghosts are left a bot grows bolder — it aims up to leadMs ahead of its target
  // from its seen speed, its dash angle widens towards boldAimCos and, after commitMs without a
  // dash (a quarter of it with two left), it attacks anyway (bots/human.ts).
  leadMs: number;
  boldAt: number;
  boldAimCos: number;
  commitMs: number;
  holdShare: number; // hill: the bot's spot sits within this share of the zone's radius
  fleeRanges: number; // bomb: a carrier closer than this many dash ranges is a threat…
  middlePull: number; // …fled from, bending this much towards the middle
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
  arenaRadius: number; // at the start; every halving shrinks it (sumo.shrink)
  arenaShrinkMs: number; // how long the edge takes to ease in after a halving
  ghostRadius: number;
  acceleration: number; // units/s² towards the held direction
  friction: number; // share of the speed lost per second (exponential decay)
  maxSpeed: number; // units/s by running; a dash and a knock may go faster
  dashSpeed: number; // units/s at the start of a dash
  dashMs: number; // how long a dash counts as one (it knocks what it hits)
  dashCooldownMs: number; // between two dashes, enforced by the core
  // The dash's wind-up (owner's option, default off): the ghost holds this long, glowing and
  // showing its line, before it dashes; 0: the dash goes at the press (windup.ts).
  dashWindUpMs: number;
  knockSpeed: number; // units/s a dash hit throws the hit ghost off at (at least)
  knockWeight: number; // a thrown ghost counts this much heavier while dashMs lasts
  restitution: number; // 0..1: how much two ghosts bounce off each other
  inSeasonPush: number; // ghosts of the team in season push this much harder
  fallMs: number; // the fall animation: falling, then out
  outMs: number; // from the fall until the respawn
  protectMs: number; // after the respawn: nothing pushes it, it pushes nothing
  creditMs: number; // a fall counts for the last opponent that touched within this time
  // Where a team's ghosts come back: its quarter, from `inner` to `outer` of the radius.
  respawnBand: { inner: number; outer: number };
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

// The config of a match in `mode`, built from the settings (settings.ts: one schema holds every
// gameplay number; times there in seconds). Each mode's own times, field and countdown are its
// settings'; the rest is shared.
export function configFrom(s: Settings, mode: GameMode): GameConfig {
  const times = {
    // Sumo has no walls: its field's edge (fieldBounds keeps walls for hill and bomb only).
    sumo: {
      match: s.sumoMatch,
      season: s.sumoSeason,
      countdown: s.countdown,
      wall: FIELD_SIZE / 2,
    },
    hill: { match: s.hillMatch, season: s.hillJump, countdown: s.countdown, wall: s.hillWall },
    bomb: { match: s.bombMatch, season: s.bombBlast, countdown: s.bombCountdown, wall: s.bombWall },
  }[mode];
  return {
    mode,
    matchDurationMs: ms(times.match),
    seasonDurationMs: ms(times.season),
    startSeason: 'spring', // the website's season clock later
    fieldSize: FIELD_SIZE,
    wallHalf: times.wall,
    arenaRadius: s.arenaRadius,
    arenaShrinkMs: ms(s.edgeEase),
    ghostRadius: s.ghostRadius,
    acceleration: s.acceleration,
    friction: s.friction,
    maxSpeed: s.maxSpeed,
    dashSpeed: s.dashSpeed,
    dashMs: ms(s.dashTime),
    dashCooldownMs: ms(s.dashCooldown),
    dashWindUpMs: s.dashWindUp === 1 ? ms(s.dashWindUpTime) : 0,
    knockSpeed: s.knockSpeed,
    knockWeight: s.knockWeight,
    restitution: s.restitution,
    inSeasonPush: s.inSeasonPush,
    fallMs: ms(s.fall),
    outMs: ms(s.respawn),
    protectMs: ms(s.protect),
    creditMs: ms(s.credit),
    respawnBand: { inner: s.respawnInner, outer: s.respawnOuter },
    startSpread: s.startSpread,
    deadlineCountdownMs: ms(times.countdown),
    reconnectGraceMs: ms(s.reconnectGrace),
    resultPauseMs: ms(s.resultPause),
    ...rulesFrom(s),
    bots: botsFrom(s),
  };
}

// Settings hold seconds; the config milliseconds.
const ms = (seconds: number): number => Math.round(seconds * 1000);

// The modes' own rules and the jump.
function rulesFrom(s: Settings): Pick<GameConfig, 'hill' | 'bomb' | 'sumo' | 'jump'> {
  return {
    hill: {
      zoneRadius: s.zoneRadius,
      bounceMs: ms(s.bounce),
      shrink: s.zoneShrink,
      pointsPerSecond: s.hillRate,
    },
    bomb: {
      playersPerBomb: s.perBomb,
      passBackMs: ms(s.passBack),
      blastShare: s.blastShare,
      pointsPerSecond: s.bombRate,
    },
    sumo: {
      lives: s.lives,
      variant: VARIANT_CHOICES[s.variant] ?? 'points',
      afterLast: AFTER_LAST[s.afterLast] ?? 'stop-time',
      halvingEveryMs: ms(s.halvingEvery),
      shrink: s.sumoShrink,
    },
    jump: {
      enabled: s.jump === 1,
      airMs: ms(s.jumpAir),
      cooldownMs: ms(s.jumpCooldown),
      steer: s.jumpSteer,
    },
  };
}

// The bots' brains and their human-like layer.
function botsFrom(s: Settings): BotConfig {
  return {
    edgeMargin: s.botEdgeMargin,
    edgeShare: s.botEdgeShare,
    dashRange: s.botDashRange,
    dashAimCos: s.botDashAim,
    approach: s.botApproach,
    leadMs: ms(s.botLead),
    boldAt: s.botBoldAt,
    boldAimCos: s.botBoldAim,
    commitMs: ms(s.botCommit),
    holdShare: s.botHold,
    fleeRanges: s.botFlee,
    middlePull: s.botMiddlePull,
    wanderMs: ms(s.botWander),
    reactionMs: [ms(s.botReactionMin), ms(s.botReactionMax)],
    reactionJitterMs: ms(s.botJitter),
    aimNoiseDeg: s.botAimNoise,
    dashChance: s.botDashChance,
    dashGapMs: ms(s.botDashGap),
    hesitateChance: s.botHesitateChance,
    hesitateMs: ms(s.botHesitate),
    edgeSlack: s.botEdgeSlack,
    jumpChance: s.botJumpChance,
    form: [s.botFormMin, s.botFormMax],
    formStep: s.botFormStep,
    formEveryMs: ms(s.botFormEvery),
  };
}

// One match of the rotation (settings rotation1…6, ROTATION_SLOTS): its mode and, for sumo, the
// variant — or the Sumo variant setting's choice ("Sumo", which may alternate).
export interface RotationSlot {
  mode: GameMode;
  variant: VariantChoice;
}

// The rotation slots that name one game outright, by their index in ROTATION_SLOTS; slot 1,
// "Sumo", takes the Sumo variant setting's choice; slot 0 is off.
const GAME_SLOTS: Readonly<Record<number, RotationSlot>> = {
  2: { mode: 'sumo', variant: 'points' },
  3: { mode: 'sumo', variant: 'last-standing' },
  4: { mode: 'hill', variant: 'points' },
  5: { mode: 'bomb', variant: 'points' },
};

// The matches in turn, from the rotation settings; every slot off: Sumo alone.
export function rotationOf(s: Settings): RotationSlot[] {
  const own: RotationSlot = { mode: 'sumo', variant: VARIANT_CHOICES[s.variant] ?? 'points' };
  const picked = [s.rotation1, s.rotation2, s.rotation3, s.rotation4, s.rotation5, s.rotation6]
    .map((v) => (v === 1 ? own : GAME_SLOTS[v]))
    .filter((x): x is RotationSlot => x !== undefined);
  return picked.length > 0 ? picked : [own];
}

// The games the admin panel can start next, by their rotation slot's name (Sumo · Points, Sumo ·
// Last One Standing, King of the Season, Halving Bomb).
export const STARTABLE_GAMES: readonly string[] = ROTATION_SLOTS.filter((_, i) => i in GAME_SLOTS);

// The game a name stands for; null for anything that is not one of STARTABLE_GAMES.
export function startableGame(name: unknown): RotationSlot | null {
  return GAME_SLOTS[(ROTATION_SLOTS as readonly unknown[]).indexOf(name)] ?? null;
}

// The coordinate space every position lives in (the wire carries it as u16): not a play size.
export const FIELD_SIZE = 2000;

// Sumo with the default settings: what tests and tools start from.
export const DEFAULT_CONFIG: GameConfig = configFrom(DEFAULT_SETTINGS, 'sumo');

// Hill and bomb play inside walls (nobody falls); sumo on the disc.
export function walled(cfg: GameConfig): boolean {
  return cfg.mode !== 'sumo';
}
