import { defineConfig, devices } from '@playwright/test';

const appTarget = process.env.PLAYWRIGHT_APP_TARGET ?? 'vite';
const defaultBaseUrl = appTarget === 'next' ? 'http://127.0.0.1:3000' : 'http://127.0.0.1:5173';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? defaultBaseUrl;
const startServerEnv = process.env.PLAYWRIGHT_START_WEB_SERVER;
const shouldStartWebServer =
  startServerEnv === 'true' || (appTarget === 'next' && startServerEnv !== 'false');

const webServerConfig = (() => {
  if (!shouldStartWebServer) return undefined;
  if (appTarget === 'next') {
    return {
      command: 'pnpm --filter web dev --hostname 127.0.0.1 --port 3000',
      url: baseURL,
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe',
      // Server-only env vars for test environment (these are only used in server-side Next.js code)
      env: {
        NEXT_TELEMETRY_DISABLED: '1',
        AUTH_CLIENT_ID: process.env.AUTH_CLIENT_ID ?? 'playwright-client-id',
        AUTH_CLIENT_SECRET: process.env.AUTH_CLIENT_SECRET ?? 'playwright-client-secret',
        AUTH_ISSUER: process.env.AUTH_ISSUER ?? 'https://auth.playwright.test',
        SUPABASE_URL: process.env.SUPABASE_URL ?? 'https://supabase.playwright.test',
        // Server-only key: prefer CI/secret manager. Use placeholder to avoid accidental checking into client bundles.
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '<REMOVED_SERVER_SECRET>',
        SUPABASE_ALLOW_STUB: process.env.SUPABASE_ALLOW_STUB ?? 'true',
        SKIP_HEALTHCHECK_DB: process.env.SKIP_HEALTHCHECK_DB ?? 'true',
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'REPLACE_WITH_SUPABASE_URL',
        VITE_SUPABASE_PUBLISHABLE_KEY:
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'REPLACE_WITH_SUPABASE_KEY',
        NEXT_PUBLIC_SUPABASE_URL:
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://supabase.playwright.test',
        NEXT_PUBLIC_SUPABASE_ANON_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'playwright-anon-key',
        NEXT_PUBLIC_SUPABASE_ALLOW_STUB:
          process.env.NEXT_PUBLIC_SUPABASE_ALLOW_STUB ?? 'true',
        NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? baseURL,
        NEXT_PUBLIC_ACCOUNTING_MODE: process.env.NEXT_PUBLIC_ACCOUNTING_MODE ?? 'close',
        NEXT_PUBLIC_RECONCILIATION_MODE:
          process.env.NEXT_PUBLIC_RECONCILIATION_MODE ?? 'db',
        NEXT_PUBLIC_GROUP_AUDIT_MODE:
          process.env.NEXT_PUBLIC_GROUP_AUDIT_MODE ?? 'workspace',
      },
    } as const;
  }

  return {
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
  } as const;
})();

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
  webServer: webServerConfig,
});
