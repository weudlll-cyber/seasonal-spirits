// Seasonal Spirits — /metrics-lite is for loopback callers only.

import { describe, expect, it } from 'vitest';
import { isLoopback } from './http-routes.js';

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
