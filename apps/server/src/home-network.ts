// Seasonal Sumo — the home network, for the dev admin panel from a phone (owner decision
// 2026-11-21): which callers are in it (RFC 1918 private IPv4, also mapped into IPv6) and which
// page origins it has (this machine's own private addresses on the client's port). Used only in
// the LAN mode of the dev build (`pnpm dev --lan`); the server refuses NODE_ENV=production.

import os from 'node:os';

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

// The four numbers of a dotted IPv4 address (also mapped into IPv6), or null.
function ipv4(address: string): number[] | null {
  const v4 = address.startsWith('::ffff:') ? address.slice('::ffff:'.length) : address;
  const parts = IPV4.exec(v4)?.slice(1).map(Number);
  return parts && parts.every((n) => n <= 255) ? parts : null;
}

// 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 — nothing else (no public, no link-local, no loopback).
export function isHomeNetwork(address: string | undefined): boolean {
  const [a = -1, b = -1] = (address === undefined ? null : ipv4(address)) ?? [];
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

// The admin page's origins on this machine's home-network addresses: exactly these, no pattern.
export function homeOrigins(
  clientPort: number,
  interfaces: ReturnType<typeof os.networkInterfaces> = os.networkInterfaces(),
): string[] {
  return Object.values(interfaces)
    .flat()
    .filter((i) => i !== undefined && i.family === 'IPv4' && isHomeNetwork(i.address))
    .map((i) => `http://${i?.address ?? ''}:${String(clientPort)}`);
}
