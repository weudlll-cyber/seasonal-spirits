// Seasonal Spirits — reading numbers from the environment, validated at the boundary.
// A value that is not a whole number within its range stops the process with a clear
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

// The probe server, the demo bots and the dev viewer are development tools: no sign-in, fake
// players. They refuse to start in production (CLAUDE.md, "Security").
export function refuseProduction(env: Env, what: string): void {
  if (env.NODE_ENV === 'production') {
    throw new Error(`${what} is a development tool and does not start with NODE_ENV=production`);
  }
}
