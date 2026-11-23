// Seasonal Sumo — the halving banner fitted to a narrow screen: never wider than the screen minus
// 16 px (index.html #announce), its text shrinks to BANNER_LINES lines, not below BANNER_MIN_PX.

export const BANNER_MIN_PX = 14;
const BANNER_LINES = 2;
const LINE_HEIGHT = 1.2; // styles/hud.css #announce line-height

// The largest whole font size from `startPx` down to BANNER_MIN_PX at which `linesAt` reports at
// most BANNER_LINES lines; BANNER_MIN_PX when none does.
export function bannerFont(startPx: number, linesAt: (px: number) => number): number {
  for (let px = Math.floor(startPx); px > BANNER_MIN_PX; px--)
    if (linesAt(px) <= BANNER_LINES) return px;
  return BANNER_MIN_PX;
}

// Fits `el`'s text after it was set and shown: its stylesheet size first, smaller while it wraps
// onto more lines (the lines counted from its height, which the tilt does not change).
export function fitBanner(el: HTMLElement): void {
  el.style.fontSize = '';
  const style = getComputedStyle(el);
  const frame =
    parseFloat(style.paddingTop) +
    parseFloat(style.paddingBottom) +
    parseFloat(style.borderTopWidth) +
    parseFloat(style.borderBottomWidth);
  const px = bannerFont(parseFloat(style.fontSize), (size) => {
    el.style.fontSize = `${String(size)}px`;
    return Math.round((el.offsetHeight - frame) / (size * LINE_HEIGHT));
  });
  el.style.fontSize = `${String(px)}px`;
}
