// Seasonal Sumo — what the owner's play tests of 2026-11-15 asked for, at desktop and phone
// size: "You are Team <Season>", the team scores readable in the band, in "Near" the minimap,
// V or the corner button switching to "Overview" and the choice surviving a reload. In every
// sampled frame: every ghost named, every name label wholly inside the view (not under the top
// bar, not past a screen edge), none on another label; the corner buttons and the scores sit
// in the band, not on the field. Screenshots: <size>-near.png and <size>-overview.png in
// reports/screens/latest/.

import path from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { overlaps, type Rect } from '@seasonal-spirits/render';
import {
  CENTRE,
  SCREENS,
  joystick,
  keyboard,
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

const labelBox = (l: ClientView['labels'][number]): Rect => ({
  left: l.x - l.width / 2,
  right: l.x + l.width / 2,
  top: l.y - LABEL_HEIGHT,
  bottom: l.y,
});

// Every ghost on screen named (owner's observation 2026-11-15: unnamed dots); no label under
// the bar or past the screen edge, none on another label (session 2026-11-15-CD; a label cut
// at the screen's edge, session 2026-11-16-LOOK-B).
function labelFaults(v: ClientView, screen: { width: number; height: number }): string[] {
  const faults: string[] = [];
  const named = new Set(v.labels.map((l) => l.id));
  for (const g of v.ghostsShown) {
    if (!named.has(g.id)) faults.push(`ghost ${g.id} without a label`);
  }
  v.labels.forEach((l, i) => {
    const b = labelBox(l);
    if (b.top < v.barBottom) faults.push(`label "${l.text}" under the bar`);
    if (b.left < 0 || b.right > screen.width || b.bottom > screen.height)
      faults.push(`label "${l.text}" past the screen edge`);
    if (v.labels.some((o, j) => j > i && overlaps(b, labelBox(o)))) {
      faults.push(`label "${l.text}" on another label`);
    }
  });
  return faults;
}

async function frameFaults(page: Page): Promise<string[]> {
  const screen = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  return labelFaults(await view(page), screen);
}

// The team scores: four chips, none cut off, inside the band.
async function scoresReadable(page: Page): Promise<void> {
  const chips = page.locator('#scores .score');
  await expect(chips).toHaveCount(4);
  const barBottom = (await view(page)).barBottom;
  for (const chip of await chips.all()) {
    await expect(chip).toHaveText(/^(Spring|Summer|Autumn|Winter) \d+$/);
    const cut = await chip.evaluate((e) => e.scrollWidth > e.clientWidth);
    expect(cut, `score chip "${(await chip.textContent()) ?? ''}" cut off`).toBe(false);
    const box = await chip.boundingBox();
    expect(box && box.y + box.height, 'the scores sit in the band').toBeLessThanOrEqual(barBottom);
  }
}

async function switchView(page: Page, info: TestInfo): Promise<void> {
  if (info.project.name === 'phone') await page.locator('#view').tap();
  else await page.keyboard.press('KeyV');
}

async function steering(page: Page, info: TestInfo): Promise<Steering> {
  return info.project.name === 'phone' ? joystick(page) : keyboard(page);
}

test('team line, scores and minimap in Near, Overview remembered, labels never in the way', async ({
  page,
}, info) => {
  const shot = (name: string): Promise<Buffer> =>
    page.screenshot({ path: path.join(SCREENS, `${info.project.name}-${name}.png`) });
  // Every frame the spec samples is checked; the faults are reported together at the end.
  const faults = new Set<string>();
  await page.goto('/');
  const team = await joined(page);
  await expect(page.locator('#team')).toHaveText(`You are Team ${SEASON_NAMES[team] ?? ''}`);
  const cut = await page.locator('#team').evaluate((e) => e.scrollWidth > e.clientWidth);
  expect(cut, 'the team line is not cut off').toBe(false);
  await scoresReadable(page);
  const start = await view(page);
  expect(start.view).toBe('near');
  expect(start.minimap).not.toBeNull();
  for (const id of ['#view', '#mute']) {
    const box = await page.locator(id).boundingBox();
    expect(box && box.y + box.height, `${id} sits in the band`).toBeLessThanOrEqual(
      start.barBottom,
    );
  }
  // Walk into the middle of the arena for a few seconds, checking every sampled frame.
  const steer = await steering(page, info);
  const until = Date.now() + 5000;
  await steerTo(page, steer, CENTRE, async () => {
    for (const f of await frameFaults(page)) faults.add(f);
    return Date.now() > until;
  });
  await shot('near');
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
  expect((await view(page)).minimap).toBeNull();
  expect(await frameFaults(page)).toEqual([]);
  await shot();
  await page.reload();
  await joined(page);
  await expect.poll(async () => (await view(page)).view).toBe('overview');
  await expect(page.locator('#view')).toHaveText('View: Overview');
  await switchView(page, info);
  await expect.poll(async () => (await view(page)).view).toBe('near');
  await expect(page.locator('#view')).toHaveText('View: Near');
}
