// Seasonal Spirits — the small type checks the server message readers share, so a server frame
// is checked the same way in every reader (server-message.ts, recap-message.ts).

export function isIntIn(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
}

// A plain JSON object (not null, not an array).
export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
