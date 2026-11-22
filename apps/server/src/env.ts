// Seasonal Spirits — reading numbers, choices and a page origin from the environment, validated
// at the boundary. A value that is not of its kind or out of its range stops the process with a clear
// message instead of running with NaN or an absurd setting. Shared by server and probe.

export type Env = Readonly<Record<string, string | undefined>>;

export function envInt(env: Env, name: string, fallback: number, range: [number, number]): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  const [min, max] = range;
  if (!/^-?\d+$/.test(raw.trim()) || !Number.isSafeInteger(n) || n < min || n > max) {
    throw new Error(`${name} must be a whole number from ${min} to ${max}, got "${raw}"`);
  }
  return n;
}

// One of a fixed list of strings; anything else stops the process.
export function envChoice<T extends string>(
  env: Env,
  name: string,
  fallback: T,
  allowed: readonly T[],
): T {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const hit = allowed.find((a) => a === raw);
  if (hit === undefined)
    throw new Error(`${name} must be one of ${allowed.join(', ')}, got "${raw}"`);
  return hit;
}

// A page origin (`https://host[:port]`, nothing after it) or null when unset; anything else —
// a path, a trailing slash, another scheme — stops the process (the WebSocket's allow-list).
export function envOrigin(env: Env, name: string): string | null {
  const raw = env[name];
  if (raw === undefined || raw === '') return null;
  let url: URL | null = null;
  try {
    url = new URL(raw);
  } catch {
    // not a URL: refused below
  }
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:') || url.origin !== raw) {
    throw new Error(`${name} must be a page origin such as https://example.org, got "${raw}"`);
  }
  return raw;
}

// The dev server and the probe are development tools: no sign-in, fake
// players. They refuse to start in production (CLAUDE.md, "Security").
export function refuseProduction(env: Env, what: string): void {
  if (env.NODE_ENV === 'production') {
    throw new Error(`${what} is a development tool and does not start with NODE_ENV=production`);
  }
}
