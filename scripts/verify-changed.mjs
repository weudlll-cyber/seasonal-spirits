// Seasonal Spirits — `pnpm verify:changed`: format, lint, typecheck and tests for what changed.
// Checks only what the change since the merge base with origin/master can have affected;
// the full `pnpm verify` runs in CI (CLAUDE.md, "Checks").

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A change to one of these can alter the answer for every file, not only for itself.
const TOOLCHAIN = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];
const FORMAT_CONFIG = ['prettier.config.js', '.prettierignore'];
const LINT_CONFIG = ['eslint.config.js'];
const CODE = /\.(ts|js|mjs)$/;
const TSCONFIG = /(^|\/)tsconfig[^/]*\.json$/;

/**
 * Paths from `git diff --name-status` output, deleted files dropped, renames to the new path.
 * @param {string} text
 * @returns {string[]}
 */
export function parseNameStatus(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const cols = line.trim().split('\t');
    const status = cols[0] ?? '';
    const file = cols.at(-1);
    if (status === '' || status.startsWith('D') || file === undefined) continue;
    out.push(file);
  }
  return out;
}

/**
 * @typedef {{ name: string, args: string[] | null, reason: string }} Check
 * `args: null` means the check is skipped; `reason` says why it runs or why not.
 */

/**
 * Which checks a set of changed files needs, and on which files.
 * @param {string[]} files repository-relative paths with forward slashes, none deleted
 * @returns {Check[]}
 */
export function planChecks(files) {
  const base = (/** @type {string} */ f) => f.split('/').at(-1) ?? f;
  const code = files.filter((f) => CODE.test(f));
  const facts = {
    files,
    code,
    sources: code.filter((f) => /^(apps|packages|tools|scripts)\//.test(f)),
    toolchain: files.some((f) => TOOLCHAIN.includes(base(f))),
    tsconfig: files.some((f) => TSCONFIG.test(f)),
  };
  return [formatCheck(facts), lintCheck(facts), typecheckCheck(facts), testCheck(facts)];
}

/** @typedef {{ files: string[], code: string[], sources: string[], toolchain: boolean, tsconfig: boolean }} Facts */

/** @param {Facts} f @returns {Check} */
function formatCheck(f) {
  if (f.toolchain || f.files.some((x) => FORMAT_CONFIG.includes(x))) {
    return { name: 'format', args: ['.'], reason: 'format config or toolchain changed: all' };
  }
  if (f.files.length === 0) return { name: 'format', args: null, reason: 'no changed files' };
  return { name: 'format', args: f.files, reason: `${f.files.length} changed file(s)` };
}

/** @param {Facts} f @returns {Check} */
function lintCheck(f) {
  if (f.toolchain || f.tsconfig || f.files.some((x) => LINT_CONFIG.includes(x))) {
    return { name: 'lint', args: ['.'], reason: 'lint config, tsconfig or toolchain changed: all' };
  }
  if (f.code.length === 0) return { name: 'lint', args: null, reason: 'no changed code file' };
  return { name: 'lint', args: f.code, reason: `${f.code.length} changed code file(s)` };
}

/** @param {Facts} f @returns {Check} */
function typecheckCheck(f) {
  if (f.toolchain || f.tsconfig || f.code.length > 0) {
    return { name: 'typecheck', args: [], reason: 'code, tsconfig or toolchain changed' };
  }
  return { name: 'typecheck', args: null, reason: 'no code, tsconfig or toolchain changed' };
}

/** @param {Facts} f @returns {Check} */
function testCheck(f) {
  if (f.toolchain) return { name: 'test', args: [], reason: 'toolchain changed: all tests' };
  if (f.sources.length === 0) {
    return { name: 'test', args: null, reason: 'no source or test file changed' };
  }
  return { name: 'test', args: f.sources, reason: `tests related to ${f.sources.length} file(s)` };
}

/** @param {string[]} args */
function git(args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}

/** Changed since the merge base with origin/master: committed, staged, unstaged, untracked. */
function changedFiles() {
  const mergeBase = git(['merge-base', 'HEAD', 'origin/master']).trim();
  // Diffing a commit against the working tree covers committed, staged and unstaged changes.
  const tracked = parseNameStatus(git(['diff', '--name-status', mergeBase]));
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n');
  return [...new Set([...tracked, ...untracked].filter((f) => f !== ''))].sort();
}

/**
 * The command line of one check; tools run from their package files, no shell involved.
 * @param {Check & { args: string[] }} c
 */
function commandFor(c) {
  const bin = (/** @type {string} */ p) => path.join(ROOT, 'node_modules', p);
  switch (c.name) {
    case 'format':
      return [bin('prettier/bin/prettier.cjs'), '--check', '--ignore-unknown', ...c.args];
    case 'lint':
      return [bin('eslint/bin/eslint.js'), '--max-warnings', '0', '--no-warn-ignored', ...c.args];
    case 'typecheck': {
      const projects = git(['ls-files', 'tsconfig.json', '*/tsconfig.json']).split('\n');
      return [bin('typescript/bin/tsc'), '-b', '--noEmit', ...projects.filter((p) => p !== '')];
    }
    default:
      return c.args.length === 0
        ? [bin('vitest/vitest.mjs'), 'run']
        : [bin('vitest/vitest.mjs'), 'related', '--run', '--passWithNoTests', ...c.args];
  }
}

function main() {
  const files = changedFiles();
  console.log(`[verify:changed] ${files.length} changed file(s) since origin/master`);
  let failed = false;
  for (const c of planChecks(files)) {
    if (c.args === null) {
      console.log(`[verify:changed] skip ${c.name}: ${c.reason}`);
      continue;
    }
    console.log(`[verify:changed] run  ${c.name}: ${c.reason}`);
    const r = spawnSync(process.execPath, commandFor({ ...c, args: c.args }), {
      cwd: ROOT,
      stdio: 'inherit',
    });
    if (r.status !== 0) {
      console.log(`[verify:changed] FAIL ${c.name}`);
      failed = true;
    }
  }
  console.log(`[verify:changed] ${failed ? 'FAILED' : 'all run checks passed'}`);
  process.exit(failed ? 1 : 0);
}

// Run only as a script; the test imports the pure functions without touching git.
if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
