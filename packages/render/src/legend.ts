// Seasonal Sumo — what each mark on the field means, in plain words: the one text the help
// overlay ("What you see") shows, next to drawings of the same marks.

// Every mark the game draws (ghosts.ts, field.ts).
export type LegendMarker = 'team' | 'own' | 'fast' | 'protected' | 'edge' | 'nextEdge';

// In reading order.
export const LEGEND: readonly { marker: LegendMarker; text: string }[] = [
  {
    marker: 'team',
    text: 'Body colour: the ghost\'s team. Label: its name, or only its number in a crowd; "· 2": 2 knockouts.',
  },
  { marker: 'own', text: 'Thick white ring, label "You": your ghost.' },
  { marker: 'fast', text: 'A trail behind a ghost: it dashed or was knocked flying.' },
  {
    marker: 'protected',
    text: 'Pale dashed ring: just back after a fall; nobody can push it yet.',
  },
  { marker: 'edge', text: "Glowing ring: the arena's edge. Past it you fall." },
  { marker: 'nextEdge', text: 'Dashed ring before a halving: where the edge will be after it.' },
];
