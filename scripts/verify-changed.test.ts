// Seasonal Spirits — tests for the file selection of `pnpm verify:changed`.
// Pure functions only; no test runs git or a tool.

import { describe, expect, it } from 'vitest';
import { parseNameStatus, planChecks } from './verify-changed.mjs';

function plan(files: string[]): Record<string, string[] | null> {
  return Object.fromEntries(planChecks(files).map((c) => [c.name, c.args]));
}

describe('parseNameStatus', () => {
  it('drops deleted files and keeps the new path of a rename', () => {
    const text = 'M\tREADME.md\nD\told.ts\nR087\tsrc/a.ts\tsrc/b.ts\nA\tnew.md\n';
    expect(parseNameStatus(text)).toEqual(['README.md', 'src/b.ts', 'new.md']);
  });
});

describe('planChecks', () => {
  it('runs only the format check for documentation and reports', () => {
    expect(plan(['docs/PHASE0.md', 'reports/night.md'])).toEqual({
      format: ['docs/PHASE0.md', 'reports/night.md'],
      lint: null,
      typecheck: null,
      test: null,
    });
  });

  it('lints the changed code file and runs only its related tests', () => {
    expect(plan(['tools/probe/src/report.ts', 'docs/PHASE0.md'])).toEqual({
      format: ['tools/probe/src/report.ts', 'docs/PHASE0.md'],
      lint: ['tools/probe/src/report.ts'],
      typecheck: [],
      test: ['tools/probe/src/report.ts'],
    });
  });

  it('lints every file when the ESLint config changes, without running tests', () => {
    const p = plan(['eslint.config.js']);
    expect(p.lint).toEqual(['.']);
    expect(p.test).toBeNull();
  });

  it('checks everything when a package manifest or the lockfile changes', () => {
    expect(plan(['apps/server/package.json'])).toEqual({
      format: ['.'],
      lint: ['.'],
      typecheck: [],
      test: [],
    });
  });

  it('typechecks and lints everything when a tsconfig changes', () => {
    const p = plan(['apps/viewer/tsconfig.json']);
    expect(p.typecheck).toEqual([]);
    expect(p.lint).toEqual(['.']);
  });

  it('skips every check on an empty change', () => {
    expect(plan([])).toEqual({ format: null, lint: null, typecheck: null, test: null });
  });
});
