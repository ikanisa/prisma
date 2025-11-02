import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: [resolve(__dirname, 'tests/setup.ts')],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@/': resolve(__dirname, '../../apps/web/') + '/',
    },
  },
});
