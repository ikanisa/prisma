import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
  projects: [
    // Frontend
    {
      displayName: 'frontend',
      root: '.',
      plugins: [react()],
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          exclude: [
            'node_modules/',
            'src/test/',
            '**/*.d.ts',
            '**/*.config.*',
            '**/dist/',
            '**/build/',
            'supabase/functions/**',
            'src/integrations/supabase/types.ts',
          ],
          thresholds: {
            global: { branches: 85, functions: 85, lines: 85, statements: 85 },
          },
        },
      },
      resolve: { alias: { '@': resolve(__dirname, './src') } },
    },
    // Server
    {
      displayName: 'server',
      root: resolve(__dirname, 'server'),
      test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.spec.ts'],
        coverage: { provider: 'v8', reporter: ['text'] },
      },
    },
  ],
});
