// Seasonal Sumo — what each mark on the field means, in plain words: the one text the help
// overlay ("What you see") shows, next to drawings of the same marks.

// Every mark the game draws (ghosts.ts, field.ts).
export type LegendMarker =
  'team' | 'own' | 'fast' | 'protected' | 'edge' | 'nextEdge' | 'zone' | 'bomb';

// In reading order.
export const LEGEND: readonly { marker: LegendMarker; text: string }[] = [
  {
    marker: 'team',
    text: 'Body colour: the ghost\'s team. Label: its name, or only its number in a crowd; "· 2": its score (knockouts or points).',
  },
  { marker: 'own', text: 'Thick white ring, label "You": your ghost.' },
  { marker: 'fast', text: 'A trail behind a ghost: it dashed or was knocked flying.' },
  {
    marker: 'protected',
    text: 'Pale dashed ring: just back after a fall; nobody can push it yet.',
  },
  { marker: 'edge', text: "The island's edge: step past it and you fall into the sea." },
  {
    marker: 'nextEdge',
    text: 'Dashed crack: where the island breaks at the next halving; it pulses before it breaks.',
  },
  {
    marker: 'zone',
    text: 'King of the Season: the bunting rings the zone; a dashed ring shows where it jumps.',
  },
  {
    marker: 'bomb',
    text: 'Halving Bomb: a ticking bomb above a ghost; its fuse is the time left.',
  },
];
