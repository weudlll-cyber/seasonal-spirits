// Seasonal Sumo — the owner's live tuning panel in the viewer (TUNE and LIVES 2026-11-17,
// development only): sliders and two choices for the server's /dev/tune (apps/server
// tuning-route.ts) — the physics and the halving setting at once, lives and variant from the
// next match — Reset to the starting values, and every value as one line to copy. Shown only
// when the server answers: without DEV_TUNING the channel does not exist and the panel stays
// hidden.

import { AFTER_LAST, DEFAULT_CONFIG, VARIANT_CHOICES } from '@seasonal-spirits/game-core';
import {
  TUNING_KEYS,
  TUNING_RANGES,
  readTuning,
  type Tuning,
  type TuningKey,
} from '@seasonal-spirits/protocol';

const SEND_GAP_MS = 100; // a dragged slider sends its newest value at most this often
const GHOST = 2 * DEFAULT_CONFIG.ghostRadius;

// A slider (its step and its number in words) or a choice (its options by index: game-core's
// VARIANT_CHOICES and AFTER_LAST, in the same order).
type Row =
  | { label: string; step: number; unit: (n: number) => string }
  | { label: string; options: readonly string[]; names: readonly string[] };

const ROWS: Record<TuningKey, Row> = {
  arenaRadius: {
    label: 'Arena size',
    step: 10,
    unit: (r) => `${r * 2} across = ${((r * 2) / GHOST).toFixed(1)} ghosts`,
  },
  maxSpeed: { label: 'Walking speed', step: 10, unit: (v) => `${v} u/s top speed` },
  dashSpeed: { label: 'Dash strength', step: 10, unit: (v) => `${v} u/s at the start of a dash` },
  knockSpeed: { label: 'Push strength', step: 10, unit: (v) => `${v} u/s a dash hit throws at` },
  lives: { label: 'Lives', step: 1, unit: (n) => `${n} per player, from the next match` },
  variant: {
    label: 'Sumo variant (next match)',
    options: ['Points', 'Last One Standing', 'Alternate: Points, then Last One Standing'],
    names: VARIANT_CHOICES,
  },
  afterLast: {
    label: 'After the last season',
    options: ['Stop, time limit', 'Keep halving', 'Stop, no time limit'],
    names: AFTER_LAST,
  },
  halvingEverySec: { label: 'Keep halving every', step: 5, unit: (s) => `${s} s` },
};

// Every value as the line the owner copies; a choice by its name.
export function tuningLine(t: Tuning): string {
  return TUNING_KEYS.map((k) => {
    const row = ROWS[k];
    return `${k} ${'names' in row ? (row.names[t[k]] ?? '?') : String(t[k])}`;
  }).join(' · ');
}

interface Answer {
  current: Tuning;
  start: Tuning;
}

// GET (no body) or POST the four numbers; null when the channel is absent or refuses.
async function call(url: string, body: Tuning | null): Promise<Answer | null> {
  try {
    const r = await fetch(
      url,
      body
        ? {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }
        : {},
    );
    if (!r.ok) return null;
    const v = (await r.json()) as { current?: unknown; start?: unknown };
    const current = readTuning(v.current);
    const start = readTuning(v.start);
    return current && start ? { current, start } : null;
  } catch {
    return null;
  }
}

interface Control {
  label: HTMLLabelElement;
  input: HTMLInputElement | HTMLSelectElement;
  show: (n: number) => void;
}

// One row: the name, then the slider over the key's range with its number in words, or the
// choice of its options.
function control(k: TuningKey): Control {
  const row = ROWS[k];
  const label = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = row.label;
  const out = document.createElement('output');
  if ('options' in row) {
    const input = document.createElement('select');
    input.append(...row.options.map((text, i) => new Option(text, String(i))));
    label.append(name, input, out);
    return { label, input, show: (n) => (input.value = String(n)) };
  }
  const [min, max] = TUNING_RANGES[k];
  const input = document.createElement('input');
  Object.assign(input, {
    type: 'range',
    min: String(min),
    max: String(max),
    step: String(row.step),
  });
  label.append(name, input, out);
  const show = (n: number): void => {
    input.value = String(n);
    out.textContent = row.unit(n);
  };
  return { label, input, show };
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

// Builds the panel into `root` once the server answers; `onChange` hears every tuning in force.
export async function startTuningPanel(
  url: string,
  root: HTMLElement,
  onChange: (t: Tuning) => void,
): Promise<void> {
  const first = await call(url, null);
  if (!first) return;
  const { start } = first;
  let wanted: Tuning = first.current;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const status = document.createElement('p');
  const line = document.createElement('textarea'); // four lines: the whole line stays visible
  line.readOnly = true;
  line.rows = 4;
  line.className = 'line';
  const controls = new Map(TUNING_KEYS.map((k) => [k, control(k)] as const));
  const show = (t: Tuning): void => {
    for (const [k, c] of controls) c.show(t[k]);
    line.value = tuningLine(t);
  };
  // The newest wanted numbers go out at most every SEND_GAP_MS; the answer is what holds.
  const later = (): void => {
    timer ??= setTimeout(() => {
      timer = null;
      void call(url, wanted).then((a) => {
        status.textContent = a ? '' : 'The server refused the change.';
        if (!a) return;
        show(a.current);
        onChange(a.current);
      });
    }, SEND_GAP_MS);
  };
  for (const [k, c] of controls) {
    c.input.addEventListener('input', () => {
      wanted = { ...wanted, [k]: Number(c.input.value) };
      show(wanted);
      later();
    });
  }
  const reset = button('Reset', () => {
    wanted = { ...start };
    show(wanted);
    later();
  });
  const copy = button('Copy', () => {
    line.select();
    navigator.clipboard.writeText(line.value).catch(() => undefined); // selected either way
  });
  const heading = document.createElement('h2');
  heading.textContent = 'Live tuning';
  const row = document.createElement('div');
  row.append(reset, copy);
  root.append(heading, ...[...controls.values()].map((c) => c.label), row, line, status);
  show(wanted);
  onChange(wanted);
  root.hidden = false;
}
