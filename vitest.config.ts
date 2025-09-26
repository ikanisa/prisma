/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    testTimeout: 120000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'apps/web/app/api/group/**',
        'apps/web/app/lib/**',
        'apps/web/lib/audit/**',
        'tests/**',
      ],
      thresholds: {
        statements: Number(process.env.VITEST_COVERAGE_STATEMENTS ?? '45'),
        branches: Number(process.env.VITEST_COVERAGE_BRANCHES ?? '40'),
        functions: Number(process.env.VITEST_COVERAGE_FUNCTIONS ?? '45'),
        lines: Number(process.env.VITEST_COVERAGE_LINES ?? '45'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/server': path.resolve(__dirname, './tests/stubs/next-server.ts'),
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
})
