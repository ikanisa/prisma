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
        statements: 40,
        branches: 35,
        functions: 40,
        lines: 40,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/server': path.resolve(__dirname, './tests/stubs/next-server.ts'),
    },
  },
})
