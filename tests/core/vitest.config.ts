/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

/**
 * Minimal vitest config for core tests.
 * Core tests should NOT depend on React or browser APIs.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules/**'],
    testTimeout: 30000,
  },
});

