// Seasonal Sumo — the rotation: which games the server plays in turn (settings rotation1…6) and
// which the admin panel can start next. Out of config.ts, which holds a match's config.

import { VARIANT_CHOICES, type GameMode, type VariantChoice } from './config.js';
import { ROTATION_SLOTS, type Settings } from './settings.js';

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
