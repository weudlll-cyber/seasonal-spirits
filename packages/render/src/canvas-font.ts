// Seasonal Sumo — the canvas's own font: Fredoka stays inside the play field while the frame's
// text is the kit's Luxora Grotesk (owner decision 2026-11-20). No page text asks for Fredoka any
// more, so the client and the viewer load its faces at once, before the canvas draws with them.

export function loadCanvasFont(): void {
  for (const weight of [500, 600, 700]) {
    // A face that fails to load leaves the canvas on its fallback, as before the load.
    document.fonts.load(`${String(weight)} 16px Fredoka`).catch(() => undefined);
  }
}
