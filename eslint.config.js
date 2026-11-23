// Seasonal Spirits — root ESLint configuration (flat config, typed linting).
// One configuration for the whole workspace, aligned with seasonal-mini-games; packages add
// nothing of their own. Formatting is left to Prettier.

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Default exports are banned so every import names what it uses.
const NO_DEFAULT_EXPORT = [
  { selector: 'ExportDefaultDeclaration', message: 'Use a named export.' },
  { selector: 'ExportSpecifier[exported.name="default"]', message: 'Use a named export.' },
];

export default defineConfig(
  {
    ignores: ['**/node_modules/', '**/dist/', 'logs/', 'tmp/', 'reports/', 'test-results/'],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-restricted-syntax': ['error', ...NO_DEFAULT_EXPORT],
      'max-lines': ['error', { max: 300 }],
      'max-lines-per-function': ['error', { max: 60 }],
      complexity: ['error', 12],
      'max-params': ['error', 4],
      // Underscore-prefix is the TS convention for a deliberately unused parameter.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Deviation from seasonal-mini-games: the probe report, the HUD and the logs print
      // numbers all over; a number in a template string is always safe to stringify.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    // Plain Node scripts: TypeScript's own checks do not cover their globals here.
    files: ['scripts/**/*.mjs', 'apps/viewer/build-check.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
  {
    files: ['**/*.test.ts'],
    rules: { 'max-lines': ['error', { max: 400 }] },
  },
  {
    // Tool config files must default-export their configuration (ESLint, Prettier, Vite).
    files: ['*.config.js', '**/*.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  prettier,
);
