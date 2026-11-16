// Seasonal Spirits — what the owner's play tests of 2026-11-15 asked for, at desktop and phone
// size: "You are Team <Season>", the own shrine labelled, in "Near" the minimap and the
// "Your shrine" arrow when the shrine is out of sight, V or the corner button switching to
// "Overview" and the choice surviving a reload. In every sampled frame: every ghost named, every
// name label wholly inside the view (not under the top bar, not past a screen edge), none on
// another label or on a shrine label,
// every shrine label wholly in view and off the ghost bodies where a spot is free, the arrow out of the thumb zones, the own shrine label
// under no control; the corner buttons sit in the band, not on the field.
// Screenshots: <size>-near.png, <size>-hud.png and <size>-overview.png in
// reports/screens/latest/.

import path from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { bodyBox, overlaps, type Rect } from '@seasonal-spirits/render';
import {
  SCREENS,
  joystick,
  keyboard,
  ownShrine,
  steerTo,
  view,
  type ClientView,
  type Steering,
} from './stack.js';

const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
const LABEL_HEIGHT = 14; // packages/render/src/labels.ts

async function joined(page: Page): Promise<number> {
  await expect.poll(async () => (await view(page)).own !== null, { timeout: 15_000 }).toBe(true);
  // Joining during a result pause: the result screen covers the field (and the joystick).
  await expect(page.locator('#result')).toBeHidden({ timeout: 20_000 });
  return (await view(page)).team ?? 0;
}

// The HUD checks are only worth something if the rectangles arrived whole (a DOMRect copied
// out of the page loses its fields).
function rectsWhole(v: ClientView): boolean {
  return [...v.zones, ...v.controls].every((r) =>
    [r.left, r.top, r.right, r.bottom].every(Number.isFinite),
  );
}

const sameRect = (a: Rect, b: Rect): boolean =>
  a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;

const labelBox = (l: ClientView['labels'][number]): Rect => ({
  left: l.x - l.width / 2,
  right: l.x + l.width / 2,
  top: l.y - LABEL_HEIGHT,
  bottom: l.y,
});

// Every ghost on screen named (owner's observation 2026-11-15: unnamed dots); no label under
// the bar or past the screen edge, none on another label or a shrine label; every shrine
// label in view lies wholly inside it and off the ghosts unless every spot was taken (session
// 2026-11-15-CD: names on the ghost next door, shrine and ghost labels on each other, a
// foreign shrine's label below the screen).
function labelFaults(v: ClientView, screen: { width: number; height: number }): string[] {
  const faults: string[] = [];
  const named = new Set(v.labels.map((l) => l.id));
  for (const g of v.ghostsShown) {
    if (!named.has(g.id)) faults.push(`ghost ${g.id} without a label`);
  }
  v.labels.forEach((l, i) => {
    const b = labelBox(l);
    if (b.top < v.barBottom) faults.push(`label "${l.text}" under the bar`);
    // Session 2026-11-16-LOOK-B: a label cut at the screen's edge.
    if (b.left < 0 || b.right > screen.width || b.bottom > screen.height)
      faults.push(`label "${l.text}" past the screen edge`);
    if (v.labels.some((o, j) => j > i && overlaps(b, labelBox(o)))) {
      faults.push(`label "${l.text}" on another label`);
    }
    if (v.shrineLabels.some((s) => overlaps(b, s)))
      faults.push(`label "${l.text}" on a shrine label`);
  });
  const bodies = v.ghostsShown.map((g) => bodyBox(g));
  const crowded = (s: Rect): boolean => v.shrineLabelsOnGhost.some((c) => sameRect(c, s));
  for (const s of v.shrineLabels) {
    const inside =
      s.left >= 0 && s.right <= screen.width && s.top >= v.barBottom && s.bottom <= screen.height;
    if (!inside) faults.push(`shrine label at ${JSON.stringify(s)} not wholly in view`);
    // A drawn ghost on a shrine label the layout thought free: it laid out other ghosts than
    // it drew (owner's observation 2026-11-16: shrine labels under ghost bodies).
    if (!crowded(s) && bodies.some((b) => overlaps(b, s)))
      faults.push(`shrine label at ${JSON.stringify(s)} on a ghost, though a spot was free`);
  }
  return faults;
}

// What is wrong with the HUD in the current frame; empty when nothing is.
async function hudFaults(page: Page): Promise<string[]> {
  const v = await view(page);
  const screen = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const faults = labelFaults(v, screen);
  if (!rectsWhole(v)) faults.push('a zone or control arrived without its edges');
  const at = v.arrowAt;
  const inZone = (z: (typeof v.zones)[number]): boolean =>
    at !== null && at.x > z.left && at.x < z.right && at.y > z.top && at.y < z.bottom;
  if (v.zones.some(inZone)) faults.push(`arrow at ${JSON.stringify(at)} in a thumb zone`);
  const label = v.shrineLabel;
  if (label && v.controls.some((c) => overlaps(c, label)))
    faults.push('shrine label under a control');
  if (label && v.minimap && overlaps(v.minimap, label))
    faults.push('shrine label under the minimap');
  return faults;
}

async function switchView(page: Page, info: TestInfo): Promise<void> {
  if (info.project.name === 'phone') await page.locator('#view').tap();
  else await page.keyboard.press('KeyV');
}

async function steering(page: Page, info: TestInfo): Promise<Steering> {
  return info.project.name === 'phone' ? joystick(page) : keyboard(page);
}

test('team line, own shrine, minimap and arrow in Near, Overview remembered, HUD never in the way', async ({
  page,
}, info) => {
  const shot = (name: string): Promise<Buffer> =>
    page.screenshot({ path: path.join(SCREENS, `${info.project.name}-${name}.png`) });
  // Every frame the spec samples is checked; the faults are reported together at the end.
  const faults = new Set<string>();
  const sample = async (): Promise<void> => {
    for (const f of await hudFaults(page)) faults.add(f);
  };
  await page.goto('/');
  const team = await joined(page);
  await expect(page.locator('#team')).toHaveText(`You are Team ${SEASON_NAMES[team] ?? ''}`);
  await expect(page.locator('#team')).toBeVisible();
  const cut = await page.locator('#team').evaluate((e) => e.scrollWidth > e.clientWidth);
  expect(cut, 'the team line is not cut off').toBe(false);
  const start = await view(page);
  expect(start.view).toBe('near');
  expect(start.minimap).not.toBeNull();
  for (const id of ['#view', '#mute']) {
    const box = await page.locator(id).boundingBox();
    expect(box && box.y + box.height, `${id} sits in the band`).toBeLessThanOrEqual(
      start.barBottom,
    );
  }
  const steer = await steering(page, info);

  // Home first (a player takes over a bot's ghost wherever it stands): the shrine in sight.
  const home = async (): Promise<boolean> => {
    await sample();
    const v = await view(page);
    return v.shrineOnScreen && !v.arrow;
  };
  expect(await steerTo(page, steer, ownShrine(team), home), 'the own shrine in sight').toBe(true);
  expect((await view(page)).shrineLabel, 'the "Your shrine" label is drawn').not.toBeNull();
  await shot('hud');

  // Out to the middle: the shrine leaves the screen and the arrow points to it.
  const away = await steerTo(page, steer, { x: 1000, y: 1000 }, async () => {
    await sample();
    return (await view(page)).arrow;
  });
  expect(away, 'the "Your shrine" arrow appears with the shrine out of sight').toBe(true);
  expect((await view(page)).shrineOnScreen).toBe(false);
  await shot('near');

  // Back home: the shrine is in sight again, the arrow goes.
  const back = await steerTo(page, steer, ownShrine(team), home);
  expect(back, 'the own shrine comes back into sight').toBe(true);

  await sample();
  await overviewSurvivesReload(page, info, () => shot('overview'));
  expect([...faults]).toEqual([]);
});

// Overview: the whole field, no minimap; the choice survives a reload, and back to Near.
async function overviewSurvivesReload(
  page: Page,
  info: TestInfo,
  shot: () => Promise<unknown>,
): Promise<void> {
  await switchView(page, info);
  await expect.poll(async () => (await view(page)).view).toBe('overview');
  const overview = await view(page);
  expect(overview.minimap).toBeNull();
  expect(overview.shrineOnScreen).toBe(true);
  expect(await hudFaults(page)).toEqual([]);
  await shot();
  await page.reload();
  await joined(page);
  await expect.poll(async () => (await view(page)).view).toBe('overview');
  await expect(page.locator('#view')).toHaveText('View: Overview');
  await switchView(page, info);
  await expect.poll(async () => (await view(page)).view).toBe('near');
  await expect(page.locator('#view')).toHaveText('View: Near');
}
