// Seasonal Spirits — what each marker on the field means, in plain words: the one text the help
// overlay ("What you see") and the `pnpm looks` pictures both show, so they never disagree.

// Every marker the game draws for a ghost or a shrine (ghosts.ts, field.ts).
export type LegendMarker = 'team' | 'shrine' | 'coin' | 'carrier' | 'trail' | 'own' | 'securing';

// In reading order; the help shows every line, a picture only those of markers it shows.
export const LEGEND: readonly { marker: LegendMarker; text: string }[] = [
  {
    marker: 'team',
    text: "Body colour: the ghost's team. Label: its name, or only its number in a crowd.",
  },
  { marker: 'shrine', text: "Large circle with a name: a team's shrine, where coins are secured." },
  {
    marker: 'coin',
    text: "Small diamond: a coin, in its season's colour; the price board at the top says what it is worth now.",
  },
  { marker: 'carrier', text: 'Bigger body, "· 9" in the label: carrying 9 coins.' },
  { marker: 'trail', text: 'A trail behind a ghost: it carries coins.' },
  { marker: 'own', text: 'Thick white ring, label "You": your ghost.' },
  { marker: 'securing', text: 'Thin white ring further out: securing at its shrine.' },
];
