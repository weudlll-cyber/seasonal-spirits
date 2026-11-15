// Seasonal Spirits — a staged situation for the browser specs (SCENARIO=steal, development
// only like the whole server): the first player stands in the middle of the field carrying
// coins, an opponent hunter with nothing right beside it — so a steal happens in both
// directions within a second, and the lit and dimmed Steal button can be checked.

import {
  SEASONS,
  type GameConfig,
  type MatchState,
  type Roster,
  type Strategy,
} from '@seasonal-spirits/game-core';

export type Scenario = 'none' | 'steal';
export const SCENARIOS: readonly Scenario[] = ['none', 'steal'];

const STAGED_COINS = 6; // the player's load: a hunter with nothing goes for it

export function stageSteal(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  roster: readonly (Roster & { strategy: Strategy })[],
  player: number,
): void {
  const me = s.ghosts.find((g) => g.id === player);
  if (!me) return;
  const hunterSlot = roster.find((r) => r.strategy === 'hunter' && r.team !== me.team);
  const hunter = s.ghosts.find((g) => g.id === hunterSlot?.id);
  if (!hunter) return;
  const middle = cfg.fieldSize / 2;
  Object.assign(me, { x: middle, y: middle });
  me.carried[s.clock.current] = STAGED_COINS;
  Object.assign(hunter, { x: middle + cfg.separationRadius, y: middle });
  for (const season of SEASONS) hunter.carried[season] = 0;
}
