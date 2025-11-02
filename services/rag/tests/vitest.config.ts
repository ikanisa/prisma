import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/integration/**/*.spec.ts'],
    restoreMocks: true,
    clearMocks: true,
    hookTimeout: 60000,
    testTimeout: 60000,
  },
});

