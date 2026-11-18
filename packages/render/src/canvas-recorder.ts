// Seasonal Sumo — a canvas for the render unit tests that draws nothing and records what was
// drawn where, in screen pixels: circles, ellipses (with the fill colour at the time), the paths
// closed (where they began) and the texts filled. It follows translate and scale (the sprites'
// mirroring), not rotate; text measures 6 px per character. Used by the tests only.

export interface Recorded {
  ctx: CanvasRenderingContext2D;
  arcs: { x: number; y: number; r: number }[];
  ellipses: { x: number; y: number; rx: number; ry: number; fill: string }[];
  closed: { x: number; y: number }[];
  texts: string[];
}

export function recorder(width = 1280, height = 800): Recorded {
  const rec: Omit<Recorded, 'ctx'> = { arcs: [], ellipses: [], closed: [], texts: [] };
  let t = { x: 0, y: 0, k: 1, ky: 1 };
  const stack: (typeof t)[] = [];
  let start = { x: 0, y: 0 };
  const at = (x: number, y: number): { x: number; y: number } => ({
    x: t.x + x * t.k,
    y: t.y + y * t.ky,
  });
  const state: Record<string, unknown> = { canvas: { width, height }, fillStyle: '' };
  const calls: Record<string, (...a: never[]) => unknown> = {
    save: () => stack.push({ ...t }),
    restore: () => (t = stack.pop() ?? t),
    translate: (x: number, y: number) => (t = { ...t, ...at(x, y) }),
    scale: (k: number, ky: number) => (t = { ...t, k: t.k * k, ky: t.ky * ky }),
    arc: (x: number, y: number, r: number) => rec.arcs.push({ ...at(x, y), r: r * Math.abs(t.k) }),
    ellipse: (x: number, y: number, rx: number, ry: number) =>
      rec.ellipses.push({
        ...at(x, y),
        rx: rx * Math.abs(t.k),
        ry: ry * Math.abs(t.ky),
        fill: String(state.fillStyle),
      }),
    moveTo: (x: number, y: number) => (start = at(x, y)),
    closePath: () => rec.closed.push(start),
    fillText: (s: string) => rec.texts.push(s),
    measureText: (s: string) => ({ width: 6 * s.length }),
  };
  const ctx = new Proxy(state, {
    get: (o, k) => {
      if (typeof k !== 'string') return undefined;
      return k in calls ? calls[k] : k in o ? o[k] : () => undefined;
    },
    set: (o, k, v) => {
      if (k !== 'canvas') o[k as string] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, ...rec };
}

// The characters' bodies among the ellipses: slightly taller than wide (character.ts).
export function bodies(r: Recorded): { x: number; y: number; r: number }[] {
  return r.ellipses
    .filter((e) => Math.abs(e.ry / e.rx - 1.04) < 0.001)
    .map((e) => ({ x: e.x, y: e.y, r: e.rx }));
}
