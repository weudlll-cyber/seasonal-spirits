// Seasonal Sumo review capture — what can be measured on a page at a moment, for the review's
// checklist: the smallest font of any text shown, texts cut off at the screen's edge, texts that
// overlap one another, the lowest text contrast against its own background (WCAG; a text over the
// canvas has none of its own and is left to the eye), and from the client the playing area on
// screen and the characters' size. Boxes are the texts' own, as far as a clipping or scrolling
// ancestor shows them (a text scrolled out of a panel counts as not shown, not as cut). While an
// overlay (help, result, start) shows, only its texts.
// The page hands over raw boxes and colours (collect); the judging happens here.

import type { Page } from '@playwright/test';

interface Text {
  name: string;
  font: number;
  box: { l: number; t: number; r: number; b: number } | null; // null: not in view
  color: string;
  bg: string | null; // the first opaque background behind it, null over the canvas
  inside: number[]; // the texts it lies inside (their indices)
}

interface Raw {
  texts: Text[];
  width: number;
  height: number;
  field: { left: number; right: number; top: number; bottom: number } | null;
  radii: number[];
}

export interface Measured {
  fontMin: number | null;
  cut: string[];
  overlaps: string[];
  contrastMin: { ratio: number; text: string } | null;
  field: { left: number; right: number; top: number; bottom: number; width: number } | null;
  bodyPx: number | null;
}

// Runs in the page (sent whole by page.evaluate, so everything it uses is inside it).
function collect(): Raw {
  const opaque = (c: string): boolean =>
    c !== 'transparent' && !/rgba\(.*, 0(\.[0-8]\d*)?\)$/.test(c);
  const overlay = ['help', 'result', 'start']
    .map((id) => document.getElementById(id))
    .find((o): o is HTMLElement => !!o && !o.hidden && o.getBoundingClientRect().width > 0);
  const els = Array.from((overlay ?? document.body).querySelectorAll<HTMLElement>('*')).filter(
    (e) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      const own = Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim());
      return (
        own &&
        r.width > 0 &&
        r.height > 0 &&
        s.visibility !== 'hidden' &&
        Number(s.opacity) > 0.05 &&
        !e.closest('[hidden]')
      );
    },
  );
  els.forEach((e, i) => (e.dataset.reviewText = String(i))); // for textBoxes, next
  const texts = els.map((e): Text => {
    let bg: HTMLElement | null = e;
    while (bg && !opaque(getComputedStyle(bg).backgroundColor)) bg = bg.parentElement;
    return {
      name: `${e.id ? `#${e.id}` : e.tagName.toLowerCase()} "${e.textContent.trim().slice(0, 24)}"`,
      font: parseFloat(getComputedStyle(e).fontSize),
      box: null,
      color: getComputedStyle(e).color,
      bg: bg ? getComputedStyle(bg).backgroundColor : null,
      inside: els.flatMap((o, j) => (o !== e && o.contains(e) ? [j] : [])),
    };
  });
  type Client = { playArea: Raw['field']; ghostsShown: { r: number }[] };
  const c = (window as unknown as { __client?: Client }).__client;
  return {
    texts,
    width: innerWidth,
    height: innerHeight,
    field: c?.playArea ?? null,
    radii: c?.ghostsShown.map((g) => g.r) ?? [],
  };
}

// Runs in the page after collect: the box of each marked element's own text (not its block), cut
// to the ancestors that clip it (a scrolling panel); null when nothing of it is in view.
function textBoxes(): Text['box'][] {
  const marked = Array.from(document.querySelectorAll<HTMLElement>('[data-review-text]'));
  const range = document.createRange();
  return marked.map((e) => {
    delete e.dataset.reviewText;
    const b = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
    for (const n of Array.from(e.childNodes).filter((x) => x.nodeType === 3)) {
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      if (r.width === 0) continue;
      b.l = Math.min(b.l, r.left);
      b.t = Math.min(b.t, r.top);
      b.r = Math.max(b.r, r.right);
      b.b = Math.max(b.b, r.bottom);
    }
    for (let a = e.parentElement; a; a = a.parentElement) {
      if (getComputedStyle(a).overflowY === 'visible') continue;
      const c = a.getBoundingClientRect();
      b.l = Math.max(b.l, c.left);
      b.t = Math.max(b.t, c.top);
      b.r = Math.min(b.r, c.right);
      b.b = Math.min(b.b, c.bottom);
    }
    return b.r > b.l && b.b > b.t ? b : null;
  });
}

// WCAG relative luminance of a CSS rgb()/rgba() colour; null if unreadable.
function luminance(css: string): number | null {
  const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)/.exec(css);
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => {
    const v = Number(x) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export function contrast(fg: string, bg: string): number | null {
  const a = luminance(fg);
  const b = luminance(bg);
  if (a === null || b === null) return null;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// The checklist's numbers from the raw boxes and colours.
export function judge(raw: Raw): Measured {
  type Seen = Text & { box: NonNullable<Text['box']>; i: number };
  const t: Seen[] = raw.texts.flatMap((x, i) => (x.box ? [{ ...x, box: x.box, i }] : []));
  const out = (x: Seen): boolean =>
    x.box.l < -1 || x.box.t < -1 || x.box.r > raw.width + 1 || x.box.b > raw.height + 1;
  const meet = (a: Seen, b: Seen): boolean =>
    Math.min(a.box.r, b.box.r) - Math.max(a.box.l, b.box.l) > 2 &&
    Math.min(a.box.b, b.box.b) - Math.max(a.box.t, b.box.t) > 2 &&
    !a.inside.includes(b.i) &&
    !b.inside.includes(a.i);
  const overlaps = t.flatMap((a, k) =>
    t.slice(k + 1).flatMap((b) => (meet(a, b) ? [`${a.name} × ${b.name}`] : [])),
  );
  let contrastMin: Measured['contrastMin'] = null;
  for (const x of t) {
    const ratio = x.bg === null ? null : contrast(x.color, x.bg);
    if (ratio !== null && (!contrastMin || ratio < contrastMin.ratio))
      contrastMin = { ratio: Math.round(ratio * 100) / 100, text: x.name };
  }
  return {
    fontMin: t.length ? Math.min(...t.map((x) => x.font)) : null,
    cut: t.filter(out).map((x) => x.name),
    overlaps,
    contrastMin,
    field: raw.field ? { ...raw.field, width: raw.width } : null,
    bodyPx: raw.radii.length ? Math.round(Math.max(...raw.radii) * 20) / 10 : null,
  };
}

export async function measurePage(page: Page): Promise<Measured> {
  const raw = await page.evaluate(collect);
  const boxes = await page.evaluate(textBoxes);
  return judge({ ...raw, texts: raw.texts.map((x, i) => ({ ...x, box: boxes[i] ?? null })) });
}
