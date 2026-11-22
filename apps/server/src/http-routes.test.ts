// Seasonal Spirits — /metrics-lite is for loopback callers only.

import type http from 'node:http';
import { describe, expect, it } from 'vitest';
import { handleHttp, isLoopback } from './http-routes.js';

describe('isLoopback', () => {
  it('accepts IPv4, IPv6 and IPv4-mapped loopback', () => {
    expect(isLoopback('127.0.0.1')).toBe(true);
    expect(isLoopback('::1')).toBe(true);
    expect(isLoopback('::ffff:127.0.0.1')).toBe(true);
  });

  it('refuses any other or missing address', () => {
    expect(isLoopback('192.168.1.20')).toBe(false);
    expect(isLoopback('::ffff:10.0.0.1')).toBe(false);
    expect(isLoopback('1270.0.0.1')).toBe(false);
    expect(isLoopback(undefined)).toBe(false);
  });
});

// The status handleHttp answers a GET of `url` from `remote` with (audit 2026-11-22, P2: the
// route's own loopback check had no test).
function statusFor(url: string, remote: string): number {
  let status = 0;
  const req = { url, method: 'GET', socket: { remoteAddress: remote } } as http.IncomingMessage;
  const res = {
    writeHead: (code: number) => {
      status = code;
      return res;
    },
    end: () => res,
  } as unknown as http.ServerResponse;
  handleHttp(req, res, () => ({ clients: 0 }), false);
  return status;
}

describe('handleHttp', () => {
  it('answers /metrics-lite to a loopback caller and 404 to a home-network one', () => {
    expect(statusFor('/metrics-lite', '127.0.0.1')).toBe(200);
    expect(statusFor('/metrics-lite', '192.168.1.20')).toBe(404);
  });

  it('answers 404 to any other path, also from loopback', () => {
    expect(statusFor('/', '127.0.0.1')).toBe(404);
  });
});
