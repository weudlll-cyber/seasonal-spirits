// Seasonal Sumo — the home network for the dev admin panel from a phone: private IPv4 callers
// only, and the page origins exactly this machine's private addresses.

import type { NetworkInterfaceInfo } from 'node:os';
import { describe, expect, it } from 'vitest';
import { homeOrigins, isHomeNetwork } from './home-network.js';

describe('isHomeNetwork', () => {
  it('takes RFC 1918 addresses, also mapped into IPv6', () => {
    for (const a of [
      '10.0.0.1',
      '172.16.5.4',
      '172.31.255.255',
      '192.168.0.66',
      '::ffff:192.168.1.2',
    ])
      expect(isHomeNetwork(a), a).toBe(true);
  });

  it('refuses public, loopback, link-local, the edges of 172.16/12, IPv6 and malformed ones', () => {
    for (const a of [
      '8.8.8.8',
      '127.0.0.1',
      '169.254.1.1',
      '172.15.0.1',
      '172.32.0.1',
      '192.169.0.1',
      '::1',
      'fd00::1',
      '192.168.0.256',
      '192.168.0',
      '1192.168.0.1',
      '',
    ])
      expect(isHomeNetwork(a), a).toBe(false);
    expect(isHomeNetwork(undefined)).toBe(false);
  });
});

describe('homeOrigins', () => {
  it("names this machine's private IPv4 addresses on the client's port, nothing else", () => {
    const nic = (address: string, family: 'IPv4' | 'IPv6') =>
      ({
        address,
        family,
        netmask: '',
        mac: '',
        internal: false,
        cidr: null,
        scopeid: 0,
      }) as NetworkInterfaceInfo;
    const origins = homeOrigins(5930, {
      wifi: [nic('192.168.0.66', 'IPv4'), nic('fe80::1', 'IPv6')],
      vpn: [nic('100.64.0.2', 'IPv4')],
      loop: [nic('127.0.0.1', 'IPv4')],
    });
    expect(origins).toEqual(['http://192.168.0.66:5930']);
  });
});
