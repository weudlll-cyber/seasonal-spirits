// Seasonal Spirits — the variants of the human round (session 2026-11-16-HUMAN): the bots
// alone (today) and the stand-in with three sights and slower reactions. The game config
// stays today's; a variant only names the stand-in's sight.

import type { HumanVariant } from './round.js';
import { DESKTOP_VIEW, HUMAN_REACTION_MS, PHONE_VIEW } from './standin.js';

const v = (name: string, sight: HumanVariant['sight']): HumanVariant => ({ name, sight });

// The stand-in as a desktop player with another delay: `pnpm human --reaction <ms>` (session
// 2026-11-16-RESPONSE: the client's measured delay plus a human's 250 ms).
export function desktopAt(reactionMs: number): HumanVariant {
  return v(`desktop-${reactionMs}`, { view: DESKTOP_VIEW, reactionMs });
}

export const HUMAN_VARIANTS: readonly HumanVariant[] = [
  v('bots', null),
  v('desktop', { view: DESKTOP_VIEW, reactionMs: HUMAN_REACTION_MS }),
  v('phone', { view: PHONE_VIEW, reactionMs: HUMAN_REACTION_MS }),
  v('full-no-delay', { view: null, reactionMs: 0 }),
  // Sensitivity of the 300 ms placeholder: a slower human, same view.
  desktopAt(600),
  desktopAt(1000),
];
