// Seasonal Spirits — which pages may open the game's WebSocket (audit 2026-11-22 P1 M1, owner
// decision 2026-11-22): the upgrade's Origin must be one the game is served from, else 403.
// Stops other pages in a player's browser; a program can send any Origin (docs/SECURITY.md).

// HTTP status of a refused upgrade.
export const ORIGIN_REFUSED = 403;

// Each refused address is logged once; past this many addresses refusals are no longer logged,
// so a stream of callers cannot grow the set or the log without bound.
const MAX_LOGGED_ADDRESSES = 1000;

export class OriginGuard {
  private readonly allowed: ReadonlySet<string>;
  private readonly logged = new Set<string>();
  private readonly log: (line: string) => void;

  constructor(origins: readonly string[], log: (line: string) => void) {
    this.allowed = new Set(origins);
    this.log = log;
  }

  // True for an Origin on the list (exact match, no pattern); a missing one is refused too.
  // The caller's Origin is not written to the log (a client value), only that it failed.
  allows(origin: string | undefined, address: string): boolean {
    if (origin !== undefined && this.allowed.has(origin)) return true;
    if (!this.logged.has(address) && this.logged.size < MAX_LOGGED_ADDRESSES) {
      this.logged.add(address);
      const why = origin === undefined ? 'no Origin' : 'an Origin not served by the game';
      this.log(`refused a WebSocket from ${address}: ${why} (further refusals not logged)`);
    }
    return false;
  }
}
