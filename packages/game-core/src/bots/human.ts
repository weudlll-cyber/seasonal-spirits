// Seasonal Sumo — the human-like layer over every mode's bot brain, so bots play like an average
// human: it sees late (human/perception.ts), aims with noise, misses chances, keeps a dash gap,
// grows bolder in the endgame, jumps a dash by chance, its form drifts. Randomness from `seed`.

import type { GameConfig } from '../config.js';
import { clamp } from '../geometry.js';
import { nextDeadline } from '../standing.js';
import { perceive } from '../human/perception.js';
import { mulberry32 } from '../rng.js';
import { IDLE, type Ghost, type Intent, type MatchState } from '../types.js';

import { bombIntent } from './bomb.js';
import { botIntent, underAttack, type Bot } from './bot.js';
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

function rotate(i: Intent, radians: number): Intent {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { dx: i.dx * c - i.dy * s, dy: i.dx * s + i.dy * c };
}

// How bold the endgame makes a bot: 0 while a halving is still to come (the shrinking arena
// presses them; bold earlier, every match ended before the third halving) or with bots.boldAt
// ghosts or more still in, rising to 1 with two.
export function boldness(cfg: GameConfig, s: Readonly<MatchState>): number {
  if (nextDeadline(cfg, s) === 'halving') return 0;
  const b = cfg.bots;
  const left = s.ghosts.filter((g) => g.lives > 0).length;
  return clamp((b.boldAt - left) / Math.max(1, b.boldAt - 2), 0, 1);
}

// boldness, the lead with it, and any angle once it has waited long enough without a dash
// (the wait shrinks to a quarter with two left).
// once it has waited long enough without a dash (the wait shrinks to a quarter with two left).
export function bolder(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  sinceDashMs: number,
): { brain: GameConfig; committed: boolean } {
  const b = cfg.bots;
  const bold = boldness(cfg, s);
  const committed = bold > 0 && sinceDashMs >= b.commitMs * (1 - 0.75 * bold);
  const dashAimCos = committed ? -1 : b.dashAimCos - (b.dashAimCos - b.boldAimCos) * bold;
  // The lead grows with the boldness: in a full sumo arena it aims where it sees them, as before
  // (a full lead there ended every match at about 2 min). In hill, where nobody is knocked out,
  // it always leads: the zone is a crowd of moving rivals to hit (NIGHT 2026-11-18).
  const leadMs = b.leadMs * (cfg.mode === 'hill' ? 1 : bold);
  return { brain: { ...cfg, bots: { ...b, dashAimCos, leadMs } }, committed };
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
  let nextDashMs = 0;
  let lastDashMs = 0;
  let nextDodgeMs = 0; // one jump decision per dash at it
  // Its form drifts; now and then it hesitates — true: it does nothing this time.
  const pause = (now: number): boolean => {
    if (now >= nextFormMs) {
      form = clamp(form + (rng() * 2 - 1) * b.formStep, b.form[0], b.form[1]);
      nextFormMs = now + b.formEveryMs;
    }
    mind?.({ reactionMs, form });
    if (now < hesitateUntilMs) return true;
    if (rng() >= b.hesitateChance / form) return false;
    hesitateUntilMs = now + b.hesitateMs;
    return true;
  };
  return (s, me) => {
    const now = s.elapsedMs;
    if (pause(now)) return IDLE;
    const delay = reactionMs + (rng() * 2 - 1) * b.reactionJitterMs;
    const seen = perceive(s, me.id, Math.round(delay / TICK_MS) * TICK_MS);
    if (!seen) return IDLE;
    const { brain, committed } = bolder(tuned, seen.state, now - lastDashMs);
    const intent = BRAINS[cfg.mode](brain, seen.state, seen.me);
    // A weaker form aims worse: the noise grows from × form[0]… to × 1 / form.
    const noise = ((rng() * 2 - 1) * ((b.aimNoiseDeg * Math.PI) / 180)) / form;
    const dir = rotate(intent, noise);
    if (now >= nextDodgeMs && underAttack(cfg, seen.state, seen.me)) {
      nextDodgeMs = now + cfg.dashMs;
      if (rng() < b.jumpChance * form) return { ...dir, action: 'jump' };
    }
    // The dash rate limit: a bot's dashes lie at least dashGapMs apart, whatever its brain asks.
    // A committed bot takes the dash its brain asks for; else only by chance.
    const chance = committed || rng() < b.dashChance * form;
    const take = intent.action === 'dash' && now >= nextDashMs && chance;
    if (!take) return dir;
    nextDashMs = now + b.dashGapMs;
    lastDashMs = now;
    return { ...dir, action: 'dash' };
  };
}
