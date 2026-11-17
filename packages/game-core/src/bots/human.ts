// Seasonal Sumo — the human-like layer over the bot's brain (owner requirement 2026-11-17: bots
// fill seats and play like an average human). One layer over every mode's brain:
// - it sees what a player's "Near" view shows, a reaction time late (human/perception.ts);
// - each bot has its own reaction time from bots.reactionMs, varied per decision;
// - its direction carries aim noise; a good dash chance is sometimes missed (too late), and now
//   and then it dashes at nothing (too early); it hesitates now and then; its own edge margin
//   may be too small;
// - its form drifts slowly within bots.form (a seeded random walk): sharper and steadier on a
//   good run, sloppier in a weak spell.
// All randomness comes from `seed` (derived from the match's seed), so runs are reproducible.

import type { GameConfig } from '../config.js';
import { clamp } from '../geometry.js';
import { NEAR_VIEW, perceive } from '../human/perception.js';
import { mulberry32 } from '../rng.js';
import { IDLE, type Ghost, type Intent, type MatchState } from '../types.js';
import { bombIntent } from './bomb.js';
import { botIntent, type Bot } from './bot.js';
import { hillIntent } from './hill.js';

export type { Bot } from './bot.js';

const TICK_MS = 50; // reactions count in whole ticks, so perception keeps few past lists

type Brain = (cfg: GameConfig, s: Readonly<MatchState>, me: Readonly<Ghost>) => Intent;
const BRAINS: Record<GameConfig['mode'], Brain> = {
  sumo: botIntent,
  hill: hillIntent,
  bomb: bombIntent,
};

// What a human-like bot is at this moment: for the tests.
export interface Mind {
  reactionMs: number; // its own, before the per-decision variation
  form: number;
}

export function rotate(i: Intent, radians: number): Intent {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { dx: i.dx * c - i.dy * s, dy: i.dx * s + i.dy * c };
}

export function createBot(cfg: GameConfig, seed: number, mind?: (m: Mind) => void): Bot {
  const b = cfg.bots;
  const rng = mulberry32(seed);
  const spread = (lo: number, hi: number): number => lo + rng() * (hi - lo);
  const reactionMs = spread(b.reactionMs[0], b.reactionMs[1]);
  // The bot's own idea of how close to the edge is safe.
  const tuned = { ...cfg, bots: { ...b, edgeMargin: b.edgeMargin * spread(b.edgeSlack, 1) } };
  let form = 1;
  let nextFormMs = 0;
  let hesitateUntilMs = -1;
  return (s, me) => {
    const now = s.elapsedMs;
    if (now >= nextFormMs) {
      form = clamp(form + (rng() * 2 - 1) * b.formStep, b.form[0], b.form[1]);
      nextFormMs = now + b.formEveryMs;
    }
    mind?.({ reactionMs, form });
    if (now < hesitateUntilMs) return IDLE;
    if (rng() < b.hesitateChance / form) {
      hesitateUntilMs = now + b.hesitateMs;
      return IDLE;
    }
    const delay = reactionMs + (rng() * 2 - 1) * b.reactionJitterMs;
    const sight = { view: NEAR_VIEW, reactionMs: Math.round(delay / TICK_MS) * TICK_MS };
    const seen = perceive(cfg.fieldSize, s, me.id, sight);
    if (!seen) return IDLE;
    const intent = BRAINS[cfg.mode](tuned, seen.state, seen.me);
    // A weaker form aims worse: the noise grows from × form[0]… to × 1 / form.
    const noise = ((rng() * 2 - 1) * ((b.aimNoiseDeg * Math.PI) / 180)) / form;
    const dir = rotate(intent, noise);
    const moving = intent.dx !== 0 || intent.dy !== 0;
    const take = intent.action === 'dash' && rng() < b.dashChance * form;
    const early = !intent.action && moving && rng() < b.earlyDashChance;
    return take || early ? { ...dir, action: 'dash' } : dir;
  };
}
