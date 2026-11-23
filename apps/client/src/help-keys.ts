// Seasonal Sumo — the help card by keyboard (DECISIONS D3, audit P6 item 3): the scroll keys
// move the card, so a keyboard player reads it to its end; Tab moves between "×" and the source
// link (D15); Escape, "?" and any other key close it. Kept out of help.ts, which builds the card.

export type HelpKey = { scrollTo: number } | { focus: 1 | -1 } | 'stay' | 'close';

// Where a line key moves the card, in pixels; a page key moves 90 % of what it shows.
const LINE_PX = 40;
const PAGE_SHARE = 0.9;

// What a key does on the open card: scroll it to a new top (clamped to its range), move the focus
// to the card's next or, with Shift, previous control (Tab), stay (a modifier alone), or close it.
export function helpKey(
  e: { key: string; shiftKey: boolean },
  box: { scrollTop: number; clientHeight: number; scrollHeight: number },
): HelpKey {
  const page = box.clientHeight * PAGE_SHARE;
  const by: Record<string, number> = {
    ArrowDown: LINE_PX,
    ArrowUp: -LINE_PX,
    PageDown: page,
    PageUp: -page,
    ' ': e.shiftKey ? -page : page,
    Home: -box.scrollHeight,
    End: box.scrollHeight,
  };
  const step = by[e.key];
  if (step !== undefined) {
    const end = Math.max(0, box.scrollHeight - box.clientHeight);
    return { scrollTo: Math.min(end, Math.max(0, box.scrollTop + step)) };
  }
  if (e.key === 'Tab') return { focus: e.shiftKey ? -1 : 1 };
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return 'stay';
  return 'close';
}
