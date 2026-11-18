// Seasonal Sumo — a deep assign for the running match's config (moved out of match-host.ts in the
// admin panel rebuild): a settings change reaches the match, its rules and its bots, which all
// keep reading the same config object.

// `target` takes `source`'s values in place, nested objects and arrays included.
export function refresh(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(source)) {
    const t = target[k];
    if (typeof v === 'object' && v !== null && typeof t === 'object' && t !== null) {
      refresh(t as Record<string, unknown>, v as Record<string, unknown>);
    } else target[k] = v;
  }
}
