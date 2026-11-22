// Seasonal Sumo — the game's own font: Fredoka stays inside the play field while every official
// text is the kit's Luxora Grotesk (DECISIONS D7). The canvas asks for it only when it draws, so
// the client and the viewer load its faces at once, before the first frame draws with them.

export function loadCanvasFont(): void {
  for (const weight of [500, 600, 700]) {
    // A face that fails to load leaves the canvas on its fallback, as before the load.
    document.fonts.load(`${String(weight)} 16px Fredoka`).catch(() => undefined);
  }
}
