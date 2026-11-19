// Seasonal Sumo review capture — the contact sheets (`pnpm review:sheets [mode …]` alone, or at
// the end of a capture): per mode and size one grid of every shot in moment order, each labelled
// with its number, moment, look and role, large enough to read the HUD (desktop and big screen
// 640 px wide, phone 260 px), split into -1, -2 … past about 4000 px. Drawn by the browser from
// a page of <img>s, so no image library is needed.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { REVIEW_DIR } from './shoot.js';

const MAX_HEIGHT = 4000;
const LABEL_PX = 22;
const GAP = 10;
const LAYOUT = {
  desktop: { width: 640, height: 400, columns: 4 },
  phone: { width: 260, height: 563, columns: 8 },
  big: { width: 640, height: 360, columns: 4 },
} as const;

// <size>-<look>-<role>-<nn>-<moment>.png → its parts.
function parse(
  file: string,
): { size: string; look: string; role: string; nn: string; moment: string } | null {
  const m = /^(desktop|phone|big)-(light|dark)-(player|spectator|viewer)-(\d+)-(.+)\.png$/.exec(
    file,
  );
  return m
    ? { size: m[1] ?? '', look: m[2] ?? '', role: m[3] ?? '', nn: m[4] ?? '', moment: m[5] ?? '' }
    : null;
}

const cell = (file: string, label: string, w: number): string =>
  `<figure><img src="${file}" width="${String(w)}"><figcaption>${label}</figcaption></figure>`;

function page(cells: string[], columns: number, w: number): string {
  return `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:${String(GAP)}px;background:#20242c;font:600 15px system-ui,sans-serif;color:#fff}
main{display:grid;grid-template-columns:repeat(${String(columns)},${String(w)}px);gap:${String(GAP)}px}
figure{margin:0}img{display:block;border:1px solid #556}figcaption{height:${String(LABEL_PX)}px;line-height:${String(LABEL_PX)}px;white-space:nowrap;overflow:hidden}
</style><main>${cells.join('')}</main>`;
}

// The sheets of `modes` (folder names under reports/screens/review/); returns their files.
export async function makeSheets(modes: readonly string[]): Promise<string[]> {
  const browser = await chromium.launch();
  const out: string[] = [];
  try {
    for (const mode of modes) {
      const dir = path.join(REVIEW_DIR, mode);
      if (!fs.existsSync(dir)) continue;
      for (const old of fs.readdirSync(REVIEW_DIR).filter((f) => f.startsWith(`sheet-${mode}-`)))
        fs.rmSync(path.join(REVIEW_DIR, old)); // a shorter run leaves no sheet of the last behind
      const shots = fs
        .readdirSync(dir)
        .map((f) => ({ f, p: parse(f) }))
        .filter((x) => x.p !== null)
        .sort((a, b) => a.f.localeCompare(b.f, 'en', { numeric: true }));
      for (const [size, l] of Object.entries(LAYOUT)) {
        const mine = shots
          .filter((s) => s.p?.size === size)
          .sort((a, b) => (a.p?.nn ?? '').localeCompare(b.p?.nn ?? '') || a.f.localeCompare(b.f));
        const perSheet =
          l.columns * Math.max(1, Math.floor(MAX_HEIGHT / (l.height + LABEL_PX + GAP)));
        const parts = Math.ceil(mine.length / perSheet);
        for (let k = 0; k < parts; k++) {
          const cells = mine
            .slice(k * perSheet, (k + 1) * perSheet)
            .map(({ f, p }) =>
              cell(
                `${mode}/${f}`,
                `${p?.nn ?? ''} ${p?.moment ?? ''} · ${p?.look ?? ''} · ${p?.role ?? ''}`,
                l.width,
              ),
            );
          const name = `sheet-${mode}-${size}${parts > 1 ? `-${String(k + 1)}` : ''}`;
          const html = path.join(REVIEW_DIR, `${name}.html`);
          fs.writeFileSync(html, page(cells, l.columns, l.width));
          const tab = await browser.newPage({
            viewport: { width: l.columns * (l.width + GAP) + 3 * GAP, height: 600 },
          });
          await tab.goto(`file:///${html.replaceAll('\\', '/')}`);
          await tab.screenshot({ path: path.join(REVIEW_DIR, `${name}.png`), fullPage: true });
          await tab.close();
          fs.rmSync(html);
          out.push(`${name}.png`);
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`sheets: ${out.join(', ')}`);
  return out;
}

// Alone: the named modes, or every mode with shots.
if (process.argv[1]?.endsWith('sheets.ts')) {
  const named = process.argv.slice(2);
  const all = fs
    .readdirSync(REVIEW_DIR)
    .filter((f) => fs.statSync(path.join(REVIEW_DIR, f)).isDirectory());
  void makeSheets(named.length ? named : all);
}
