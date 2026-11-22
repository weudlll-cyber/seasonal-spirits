// Seasonal Spirits — the WebSocket's Origin allow-list (THREATS row 21b).
// Why: the list is the only thing between another page in a player's browser and a seat.

import { describe, expect, it } from 'vitest';
import { OriginGuard } from './origin-guard.js';

function guard(): { g: OriginGuard; lines: string[] } {
  const lines: string[] = [];
  const g = new OriginGuard(['http://localhost:5930'], (line) => lines.push(line));
  return { g, lines };
}

describe('OriginGuard', () => {
  it('lets in only an Origin on the list, exactly as written', () => {
    const { g } = guard();
    expect(g.allows('http://localhost:5930', '127.0.0.1')).toBe(true);
    for (const near of [
      'http://localhost:5931',
      'https://localhost:5930',
      'http://localhost:5930/',
      'http://LOCALHOST:5930',
      'http://localhost:59300',
      'null',
    ]) {
      expect(g.allows(near, '127.0.0.1')).toBe(false);
    }
    expect(g.allows(undefined, '127.0.0.1')).toBe(false);
  });

  it('logs a refused address once, without the Origin it sent', () => {
    const { g, lines } = guard();
    g.allows('http://evil.example', '192.168.1.20');
    g.allows(undefined, '192.168.1.20');
    g.allows('http://evil.example', '192.168.1.21');
    expect(lines).toHaveLength(2);
    expect(lines.join('\n')).not.toContain('evil.example');
  });

  it('stops logging after 1000 addresses, so the log and its memory stay bounded', () => {
    const { g, lines } = guard();
    for (let i = 0; i < 1500; i++) g.allows(undefined, `10.0.${String(i >> 8)}.${String(i & 255)}`);
    expect(lines).toHaveLength(1000);
  });
});
