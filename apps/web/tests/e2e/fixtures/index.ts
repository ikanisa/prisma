import { test as base } from '@playwright/test';
import { AccountingPage } from '../pageObjects/accounting';
import { AuthDemoPage } from '../pageObjects/auth-demo';

type Fixtures = {
  accountingPage: AccountingPage;
  authDemoPage: AuthDemoPage;
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const env = (window as unknown as { __ENV__?: Record<string, string> }).__ENV__ ?? {};
      env.SUPABASE_ALLOW_STUB = 'true';
      env.NEXT_PUBLIC_SUPABASE_ALLOW_STUB = 'true';
      env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://supabase.playwright.test';
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'playwright-anon-key';
      (window as unknown as { __ENV__?: Record<string, string> }).__ENV__ = env;
    });
    await use(page);
  },
  accountingPage: async ({ page }, use) => {
    await use(new AccountingPage(page));
  },
  authDemoPage: async ({ page }, use) => {
    await use(new AuthDemoPage(page));
  },
});

export { expect } from '@playwright/test';
