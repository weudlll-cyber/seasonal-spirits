// Seasonal Sumo — how much room a crowd standing shoulder to shoulder needs, and from it King's
// smallest field and zone, the starting values of their settings (settings-list.ts).

export const FIELD_CROWDS = 4; // the smallest field holds this many crowds
export const ZONE_CROWDS = 1.5; // the smallest zone holds this many

// `players` characters of body radius `ghostRadius` shoulder to shoulder, in square field units.
export function crowdArea(ghostRadius: number, players: number): number {
  return players * (2 * ghostRadius) ** 2;
}

// The smallest zone's radius: its disc holds ZONE_CROWDS crowds.
export function smallestZone(ghostRadius: number, players: number): number {
  return Math.sqrt((ZONE_CROWDS * crowdArea(ghostRadius, players)) / Math.PI);
}

// The smallest field's half side: its square holds FIELD_CROWDS crowds, and the smallest zone
// still fits its quarter (a zone's radius is at most half the half side, modes/hill.ts).
export function smallestField(ghostRadius: number, players: number): number {
  const holds = Math.sqrt(FIELD_CROWDS * crowdArea(ghostRadius, players)) / 2;
  return Math.max(holds, 2 * smallestZone(ghostRadius, players));
}

// `v` rounded up to a setting's `step`.
export function upToStep(v: number, step: number): number {
  return Math.ceil(v / step - 1e-9) * step;
}
