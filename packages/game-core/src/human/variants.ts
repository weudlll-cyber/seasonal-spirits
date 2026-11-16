// Seasonal Spirits — the variants of the human round (session 2026-11-16-HUMAN): the bots
// alone (today), the stand-in with three sights, and the bot trials T1–T3 with the stand-in as
// a desktop player. Each names its config changes; the defaults stay today's game.

import type { BotConfig, GameConfig } from '../config.js';
import type { HumanVariant } from './round.js';
import { DESKTOP_VIEW, HUMAN_REACTION_MS, PHONE_VIEW } from './standin.js';

export interface NamedVariant extends HumanVariant {
  bots: Partial<BotConfig>; // the bot trials (T1, T2) this variant switches on
}

const DESKTOP = { view: DESKTOP_VIEW, reactionMs: HUMAN_REACTION_MS };
const T1 = { viewRadius: DESKTOP_VIEW };
const T2 = { reactionMs: HUMAN_REACTION_MS };
const T3_BOTS = 16; // trial T3: bot seats beside a human, placeholder — owner decides
const T4 = { deadlineSpreadMs: 10_000 }; // trial T4, placeholder — owner decides

const v = (
  name: string,
  sight: HumanVariant['sight'],
  bots: Partial<BotConfig> = {},
  botSeats: number | null = null,
): NamedVariant => ({ name, sight, bots, botSeats });

// The stand-in as a desktop player with another delay: `pnpm human --reaction <ms>` (session
// 2026-11-16-RESPONSE: the client's measured delay plus a human's 250 ms).
export function desktopAt(reactionMs: number): NamedVariant {
  return v(`desktop-${reactionMs}`, { view: DESKTOP_VIEW, reactionMs });
}

export const HUMAN_VARIANTS: readonly NamedVariant[] = [
  v('bots', null),
  v('desktop', DESKTOP),
  v('phone', { view: PHONE_VIEW, reactionMs: HUMAN_REACTION_MS }),
  v('full-no-delay', { view: null, reactionMs: 0 }),
  // Sensitivity of the 300 ms placeholder: a slower human, same view.
  desktopAt(600),
  desktopAt(1000),
  v('T1', DESKTOP, T1),
  v('T2', DESKTOP, T2),
  v('T1+T2', DESKTOP, { ...T1, ...T2 }),
  v('T3', DESKTOP, {}, T3_BOTS),
  v('T1+T2+T3', DESKTOP, { ...T1, ...T2 }, T3_BOTS),
  // The bot trials without the stand-in: the fairness between the bot strategies.
  v('bots T1', null, T1),
  v('bots T2', null, T2),
  v('bots T1+T2', null, { ...T1, ...T2 }),
  // Trial T4 (step 3: the deadline rush at the shrines).
  v('T4', DESKTOP, T4),
  v('bots T4', null, T4),
];

export function configOf(base: GameConfig, variant: NamedVariant): GameConfig {
  return { ...base, bots: { ...base.bots, ...variant.bots } };
}
