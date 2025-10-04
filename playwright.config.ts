import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
const shouldStartWebServer = process.env.PLAYWRIGHT_START_WEB_SERVER === 'true';

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    video: 'on-first-retry',
  },
  fullyParallel: true,
  reporter: process.env.CI ? [['html', { outputFolder: 'playwright-report' }]] : 'list',
  projects: [
    {
      name: 'Chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: shouldStartWebServer
    ? {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: baseURL,
        reuseExistingServer: true,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          VITE_TRACKING_ENABLED: 'true',
          VITE_SUPABASE_URL: 'REPLACE_WITH_SUPABASE_URL',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'REPLACE_WITH_SUPABASE_KEY',
        },
      }
    : undefined,
});
