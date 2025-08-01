// A minimal Vitest configuration for the edge-functions workspace.
// Keeping the file as plain JS avoids the need for Vitest to transpile (and
// therefore write a temporary `.timestamp-*` file) which is not permitted in
// some locked-down CI environments.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text'],
    },
  },
});

