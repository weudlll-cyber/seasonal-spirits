// Seasonal Spirits — the supply-chain settings of the repository (DECISIONS D4, audit 2026-11-22
// P5). Why: each is one line that a later edit can lose without any build failing.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

interface CustomManager {
  customType: string;
  managerFilePatterns: string[];
  matchStrings: string[];
  datasourceTemplate: string;
}
const renovate = JSON.parse(read('renovate.json')) as { customManagers: CustomManager[] };
const ci = read('.github/workflows/ci.yml');
const codeql = read('.github/workflows/codeql.yml');
const setup = read('.github/actions/setup/action.yml');
const pkg = JSON.parse(read('package.json')) as { packageManager: string };
const workspace = read('pnpm-workspace.yaml');

describe('Renovate and the scanner image', () => {
  const [images] = renovate.customManagers;
  const match = new RegExp(images?.matchStrings[0] ?? 'missing');

  it("reads ci.yml's *_IMAGE lines with the docker datasource", () => {
    expect(images?.customType).toBe('regex');
    expect(images?.datasourceTemplate).toBe('docker');
    const file = new RegExp(images?.managerFilePatterns[0]?.slice(1, -1) ?? 'missing');
    expect(file.test('.github/workflows/ci.yml')).toBe(true);
  });

  it('matches every *_IMAGE line of ci.yml with its image, tag and digest, none without a digest', () => {
    const lines = ci.split('\n').filter((l) => /^\s+[A-Z_]+_IMAGE:/.test(l));
    expect(lines.length).toBeGreaterThanOrEqual(1);
    for (const line of lines) {
      const g = match.exec(line)?.groups;
      expect(g?.['currentValue'], line).toMatch(/^v?\d+\.\d+\.\d+$/);
      expect(g?.['currentDigest'], line).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
    expect(match.test('  X_IMAGE: ghcr.io/a/b:v1.0.0')).toBe(false);
  });
});

describe('the workflows', () => {
  it('pin every action to a full commit SHA', () => {
    const uses = [ci, codeql, setup].flatMap((f) =>
      [...f.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1] ?? ''),
    );
    const remote = uses.filter((u) => !u.startsWith('./'));
    expect(remote.length).toBeGreaterThan(0);
    for (const u of remote) expect(u).toMatch(/@[a-f0-9]{40}$/);
  });

  it('run on a named runner image, read-only unless a job needs more', () => {
    for (const f of [ci, codeql]) {
      expect(f).not.toMatch(/runs-on:\s*\S*latest/);
      expect(f).toMatch(/^permissions:\n {2}contents: read$/m);
    }
    // The one write: CodeQL's upload to code scanning.
    expect(ci).not.toMatch(/: write/);
    expect([...codeql.matchAll(/: write/g)]).toHaveLength(1);
  });

  it('scan the lockfile every week, without the other jobs', () => {
    expect(ci).toMatch(/schedule:\n\s+# .*\n\s+- cron: '\d+ \d+ \* \* \d'/);
    expect(ci.match(/if: github\.event_name != 'schedule'/g)).toHaveLength(2);
    expect(ci).toMatch(/ {2}dependencies:\n {4}runs-on:/);
  });
});

describe('the toolchain', () => {
  it('names pnpm with its sha512 hash and Node at an exact version', () => {
    expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+\+sha512\.[a-f0-9]{128}$/);
    expect(read('.nvmrc').trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('refuses unlisted install scripts and dependencies of dependencies from outside the registry', () => {
    expect(workspace).toMatch(/^strictDepBuilds: true$/m);
    expect(workspace).toMatch(/^blockExoticSubdeps: true$/m);
  });
});
