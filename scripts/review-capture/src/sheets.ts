// Seasonal Sumo review capture — the contact sheets (`pnpm review:sheets [mode …]` alone, or at
// the end of a capture): per mode and size one grid of every shot in moment order, each labelled
// with its number, moment, look and role — the player's run first, then the spectator's —, large enough to read the HUD (desktop and big screen
// 640 px wide, phone 260 px), split into -1, -2 … past about 4000 px; or one sheet of a folder's
// every shot, all sizes in one flow (the own marker's sheet, own-marker.ts); or the minimap's sheet,
// each phone shot under its map enlarged (minimap.ts). Drawn by the browser from a page of <img>s,
// so no image library is needed.

import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { REVIEW_DIR } from './shoot.js';

const MAX_HEIGHT = 4000;
const ROLES = ['player', 'spectator', 'viewer'];
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

// `main` laid out by `layout` (CSS).
const page = (cells: string[], layout: string): string =>
  `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:${String(GAP)}px;background:#20242c;font:600 15px system-ui,sans-serif;color:#fff}
main{${layout};gap:${String(GAP)}px}
figure{margin:0}img{display:block;border:1px solid #556}figcaption{height:${String(LABEL_PX)}px;line-height:${String(LABEL_PX)}px;white-space:nowrap;overflow:hidden}
</style><main>${cells.join('')}</main>`;

const grid = (columns: number, w: number): string =>
  `display:grid;grid-template-columns:repeat(${String(columns)},${String(w)}px)`;

// The page at `html` shot whole into `png`.
async function shootPage(
  browser: Browser,
  html: string,
  width: number,
  png: string,
): Promise<void> {
  const tab = await browser.newPage({ viewport: { width, height: 600 } });
  await tab.goto(`file:///${html.replaceAll('\\', '/')}`);
  await tab.screenshot({ path: png, fullPage: true });
  await tab.close();
  fs.rmSync(html);
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
          // Each run's own moments together: the player's run, then the spectator's, the viewer's.
          .sort(
            (a, b) =>
              ROLES.indexOf(a.p?.role ?? '') - ROLES.indexOf(b.p?.role ?? '') ||
              (a.p?.nn ?? '').localeCompare(b.p?.nn ?? '') ||
              a.f.localeCompare(b.f),
          );
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
          fs.writeFileSync(html, page(cells, grid(l.columns, l.width)));
          const width = l.columns * (l.width + GAP) + 3 * GAP;
          await shootPage(browser, html, width, path.join(REVIEW_DIR, `${name}.png`));
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

// One sheet of every shot in the folder `mode`, as sheet-<mode>.png: the desktop's at their width
// first, then the phone's, each by moment (its game first) with Light before Dark, wrapped into
// rows four desktop shots wide.
export async function makeFlowSheet(mode: string): Promise<string> {
  const dir = path.join(REVIEW_DIR, mode);
  const sizes = Object.keys(LAYOUT);
  // Size, moment, look of a shot: what it is sorted by (Light before Dark).
  const key = (p: ReturnType<typeof parse>): [number, string, string] => [
    sizes.indexOf(p?.size ?? ''),
    p?.moment ?? '',
    p?.look === 'light' ? '0' : '1',
  ];
  const shots = fs
    .readdirSync(dir)
    .map((f) => ({ f, k: key(parse(f)), p: parse(f) }))
    .filter((x) => x.p !== null)
    .sort(
      ({ k: a }, { k: b }) =>
        a[0] - b[0] ||
        a[1].localeCompare(b[1], 'en', { numeric: true }) ||
        a[2].localeCompare(b[2]),
    );
  const cells = shots.map(({ f, p }) => {
    const w = LAYOUT[(p?.size ?? 'desktop') as keyof typeof LAYOUT].width;
    return cell(`${mode}/${f}`, `${p?.moment ?? ''} · ${p?.look ?? ''} · ${p?.size ?? ''}`, w);
  });
  const width = LAYOUT.desktop.columns * (LAYOUT.desktop.width + GAP);
  const html = path.join(REVIEW_DIR, `sheet-${mode}.html`);
  fs.writeFileSync(html, page(cells, `display:flex;flex-wrap:wrap;width:${String(width)}px`));
  const browser = await chromium.launch();
  try {
    await shootPage(browser, html, width + 3 * GAP, path.join(REVIEW_DIR, `sheet-${mode}.png`));
  } finally {
    await browser.close();
  }
  console.log(`sheet: sheet-${mode}.png`);
  return `sheet-${mode}.png`;
}

// Where the minimap stood at each moment (minimap.ts writes it): one JSON line per moment.
export const MAPS_FILE = 'minimap.jsonl';
const MAP_ZOOM = 3; // the map's crop, enlarged so its marks can be read
const MAP_PAD = 6; // px round the map in its crop
const PHONE_WIDTH = 390; // the phone's viewport (pages.ts SIZES)
const UNDER_BAND = 8; // the map's top below the band without a banner (client scene.ts minimapAt)

// One sheet of the minimap folder's shots, sheet-minimap.png: per shot its map enlarged
// MAP_ZOOM times over the whole phone screen, by game and moment, Light before Dark.
export async function makeMinimapSheet(mode: string): Promise<string> {
  const dir = path.join(REVIEW_DIR, mode);
  type Box = { left: number; top: number; right: number; bottom: number };
  type Line = { moment: string; minimap: Box | null; barBottom: number };
  const maps = new Map<string, Box | null>();
  for (const line of fs.readFileSync(path.join(dir, MAPS_FILE), 'utf8').split('\n'))
    if (line) {
      const { moment, minimap: m, barBottom } = JSON.parse(line) as Line;
      // The Dark shot follows the Light one by a moment: the halving's banner may have gone and
      // the map moved up under the band (client minimapAt), so the crop reaches up to there.
      maps.set(moment, m && { ...m, top: Math.min(m.top, barBottom + UNDER_BAND) });
    }
  type Shot = { f: string; p: NonNullable<ReturnType<typeof parse>> };
  const lightFirst = (s: Shot): number => (s.p.look === 'light' ? 0 : 1);
  const shots = fs
    .readdirSync(dir)
    .map((f) => ({ f, p: parse(f) }))
    .filter((x): x is Shot => x.p !== null)
    .sort(
      (a, b) =>
        (a.p.moment.split('-')[0] ?? '').localeCompare(b.p.moment.split('-')[0] ?? '') ||
        a.p.nn.localeCompare(b.p.nn) ||
        lightFirst(a) - lightFirst(b),
    );
  const w = LAYOUT.phone.width;
  const cells = shots.map(({ f, p }) => {
    const m = maps.get(p.moment) ?? null;
    const crop = m ? mapCrop(`${mode}/${f}`, m) : '<div style="height:40px">no minimap drawn</div>';
    return `<figure style="width:${String(w + 20)}px">${crop}<img src="${mode}/${f}" width="${String(w)}"><figcaption>${p.moment} · ${p.look}</figcaption></figure>`;
  });
  const width = 6 * (w + 20 + GAP);
  const html = path.join(REVIEW_DIR, `sheet-${mode}.html`);
  fs.writeFileSync(html, page(cells, `display:flex;flex-wrap:wrap;width:${String(width)}px`));
  const browser = await chromium.launch();
  try {
    await shootPage(browser, html, width + 3 * GAP, path.join(REVIEW_DIR, `sheet-${mode}.png`));
  } finally {
    await browser.close();
  }
  console.log(`sheet: sheet-${mode}.png`);
  return `sheet-${mode}.png`;
}

// The map's part of the shot `src`, enlarged MAP_ZOOM times: the box `m` with MAP_PAD round it.
function mapCrop(
  src: string,
  m: { left: number; top: number; right: number; bottom: number },
): string {
  const px = (n: number): string => `${String(n * MAP_ZOOM)}px`;
  const box = `width:${px(m.right - m.left + 2 * MAP_PAD)};height:${px(m.bottom - m.top + 2 * MAP_PAD)}`;
  const shift = `margin-left:${px(MAP_PAD - m.left)};margin-top:${px(MAP_PAD - m.top)}`;
  return `<div style="${box};overflow:hidden;margin:0 auto 6px"><img src="${src}" style="width:${px(PHONE_WIDTH)};max-width:none;border:0;${shift}"></div>`;
}

// Alone: the named modes, or every mode with shots.
if (process.argv[1]?.endsWith('sheets.ts')) {
  const named = process.argv.slice(2);
  const all = fs
    .readdirSync(REVIEW_DIR)
    .filter((f) => fs.statSync(path.join(REVIEW_DIR, f)).isDirectory());
  void makeSheets(named.length ? named : all);
}
