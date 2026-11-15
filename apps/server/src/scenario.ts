// Seasonal Spirits — staged situations for the browser specs (SCENARIO, development only like
// the whole server). 'steal': the first player stands in the middle of the field carrying
// coins, an opponent hunter with nothing right beside it — so a steal happens in both
// directions within a second, and the lit and dimmed Steal button can be checked. 'shield':
// the player stands in its own shrine with enough coins to swap, beside an opponent that
// carries only swapped (steal-proof) coins and stands still — the shield ring and the dimmed
// Steal button can be checked.

import {
  SEASONS,
  nextSeason,
  shrineOf,
  type GameConfig,
  type MatchState,
  type Roster,
  type Strategy,
} from '@seasonal-spirits/game-core';

export type Scenario = 'none' | 'steal' | 'shield';
export const SCENARIOS: readonly Scenario[] = ['none', 'steal', 'shield'];

const STAGED_COINS = 6; // the player's load: a hunter with nothing goes for it
const SHIELDED_COINS = 9; // what a swap of 6 gives: the opponent's steal-proof load

type Slots = readonly (Roster & { strategy: Strategy })[];

export function stageSteal(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  roster: Slots,
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

// Returns the opponent's ghost id; the match host keeps it standing (no bot steers it), as a
// disconnected player stands, so it stays in range.
export function stageShield(
  cfg: GameConfig,
  s: Readonly<MatchState>,
  player: number,
): number | null {
  const me = s.ghosts.find((g) => g.id === player);
  const other = s.ghosts.find((g) => g.team !== me?.team);
  if (!me || !other) return null;
  const home = shrineOf(s.shrines, me.team);
  Object.assign(me, { x: home.x, y: home.y });
  me.carried[s.clock.current] = cfg.swapMinIn;
  // Inside steal range, outside the separation push.
  Object.assign(other, { x: home.x + cfg.separationRadius + 10, y: home.y });
  const next = nextSeason(s.clock.current);
  for (const season of SEASONS) other.carried[season] = 0;
  other.carried[next] = SHIELDED_COINS;
  other.shielded[next] = SHIELDED_COINS;
  return other.id;
}
