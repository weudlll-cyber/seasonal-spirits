// Seasonal Sumo — the owner's live tuning panel in the viewer (TUNE 2026-11-17, development only):
// four sliders for the server's /dev/tune (apps/server tuning-route.ts), Reset to the starting
// values, and the numbers as one line to copy. Shown only when the server answers: without
// DEV_TUNING the channel does not exist and the panel stays hidden.

import { DEFAULT_CONFIG } from '@seasonal-spirits/game-core';
import {
  TUNING_KEYS,
  TUNING_RANGES,
  readTuning,
  type Tuning,
  type TuningKey,
} from '@seasonal-spirits/protocol';

const SEND_GAP_MS = 100; // a dragged slider sends its newest value at most this often
const STEP = 10;
const GHOST = 2 * DEFAULT_CONFIG.ghostRadius;

const ROWS: Record<TuningKey, { label: string; unit: (n: number) => string }> = {
  arenaRadius: {
    label: 'Arena size',
    unit: (r) => `${r * 2} across = ${((r * 2) / GHOST).toFixed(1)} ghosts`,
  },
  maxSpeed: { label: 'Walking speed', unit: (v) => `${v} u/s top speed` },
  dashSpeed: { label: 'Dash strength', unit: (v) => `${v} u/s at the start of a dash` },
  knockSpeed: { label: 'Push strength', unit: (v) => `${v} u/s a dash hit throws at` },
};

// The four numbers as the line the owner copies.
export function tuningLine(t: Tuning): string {
  return TUNING_KEYS.map((k) => `${k} ${t[k]}`).join(' · ');
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

interface Slider {
  label: HTMLLabelElement;
  input: HTMLInputElement;
  out: HTMLOutputElement;
}

// One row: the name, the slider over the key's range, its number in words.
function slider(k: TuningKey): Slider {
  const [min, max] = TUNING_RANGES[k];
  const label = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = ROWS[k].label;
  const input = document.createElement('input');
  Object.assign(input, { type: 'range', min: String(min), max: String(max), step: String(STEP) });
  const out = document.createElement('output');
  label.append(name, input, out);
  return { label, input, out };
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
  const line = document.createElement('textarea'); // two lines: the whole line stays visible
  line.readOnly = true;
  line.rows = 2;
  line.className = 'line';
  const sliders = new Map(TUNING_KEYS.map((k) => [k, slider(k)] as const));
  const show = (t: Tuning): void => {
    for (const [k, s] of sliders) {
      s.input.value = String(t[k]);
      s.out.textContent = ROWS[k].unit(t[k]);
    }
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
  for (const [k, s] of sliders) {
    s.input.addEventListener('input', () => {
      wanted = { ...wanted, [k]: Number(s.input.value) };
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
  root.append(heading, ...[...sliders.values()].map((s) => s.label), row, line, status);
  show(wanted);
  onChange(wanted);
  root.hidden = false;
}
