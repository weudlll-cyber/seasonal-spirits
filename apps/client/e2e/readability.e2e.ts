// Seasonal Sumo — what the owner's play tests of 2026-11-15 and 2026-11-17 asked for, at desktop
// and phone size: "You are Team <Season>", the team scores readable in the band. In every
// sampled frame: the whole playing area on screen below the band and clear of the controls,
// every ghost named, the own one "You", every name label wholly inside the view (not under the top bar, not past a
// screen edge), none on another label; the corner buttons and the scores sit in the band, not
// on the field. Screenshot: <size>-field.png in reports/screens/latest/.

import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
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
  // The own ghost is always "You", also in its respawn protection (owner 2026-11-17).
  const own = v.labels.find((l) => l.id === v.ghost);
  if (v.ghostsShown.some((g) => g.id === v.ghost) && !own?.text.startsWith('You'))
    faults.push(`own ghost labelled "${own?.text ?? ''}", not "You"`);
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

// The whole playing area on screen (owner's observation 2026-11-17: only its upper half showed
// in the old "Near" view), below the band and under no control.
function areaFaults(v: ClientView, screen: { width: number; height: number }): string[] {
  const a = v.playArea;
  const faults: string[] = [];
  if (a.top < v.barBottom || a.left < 0 || a.right > screen.width || a.bottom > screen.height)
    faults.push('playing area not wholly on screen');
  if (v.zones.some((z) => overlaps(a, z))) faults.push('playing area under a control');
  return faults;
}

async function frameFaults(page: Page): Promise<string[]> {
  const screen = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const v = await view(page);
  return [...labelFaults(v, screen), ...areaFaults(v, screen)];
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

async function steering(page: Page, phone: boolean): Promise<Steering> {
  return phone ? joystick(page) : keyboard(page);
}

test('team line, scores, the whole playing area on screen, labels never in the way', async ({
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
  for (const id of ['#help-open', '#mute']) {
    const box = await page.locator(id).boundingBox();
    expect(box && box.y + box.height, `${id} sits in the band`).toBeLessThanOrEqual(
      start.barBottom,
    );
  }
  // Walk into the middle of the arena for a few seconds, checking every sampled frame.
  const steer = await steering(page, info.project.name === 'phone');
  const until = Date.now() + 5000;
  await steerTo(page, steer, CENTRE, async () => {
    for (const f of await frameFaults(page)) faults.add(f);
    return Date.now() > until;
  });
  await shot('field');
  expect([...faults]).toEqual([]);
});

// The band's text whole at the owner's desktop size and at laptop and phone sizes, upright and
// sideways (owner 2026-11-17: "easonal Sumo", "ou are Team Spring" cut at the left edge): every
// text inside the screen, a margin from its edges, none cut short.
test('the band text is never cut off, at any of four screen sizes', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'the sizes are set here; one browser is enough');
  await page.goto('/');
  await joined(page);
  for (const size of [
    { width: 1918, height: 945 },
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(200);
    const cut = await page.evaluate((w) => {
      const texts = [
        ...document.querySelectorAll<HTMLElement>('#team, #scores .score, #corner button'),
      ];
      return texts
        .filter((e) => e.offsetParent !== null)
        .filter((e) => {
          const b = e.getBoundingClientRect();
          return b.left < 8 || b.right > w - 8 || e.scrollWidth > e.clientWidth;
        })
        .map((e) => e.id || e.textContent || '?');
    }, size.width);
    expect(cut, `${String(size.width)}×${String(size.height)}`).toEqual([]);
  }
});
