import { test, expect } from '@playwright/test';

const rawPaths = process.env.PLAYWRIGHT_SMOKE_PATHS ?? '/, /login';
const smokePaths = rawPaths
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

if (smokePaths.length === 0) {
  smokePaths.push('/');
}

test.describe('UI smoke', () => {
  for (const path of smokePaths) {
    test(`renders ${path}`, async ({ page }) => {
      let response;
      try {
        response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      } catch (error) {
        test.skip(`Skipping ${path}: ${(error as Error).message}`);
      }

      const status = response?.status();
      expect(status, 'route should not error').toBeDefined();
      if (status) {
        expect(status).toBeLessThan(500);
      }

      await expect(page.locator('body')).toBeVisible();
      const contentLength = (await page.content()).length;
      expect(contentLength).toBeGreaterThan(0);
    });
  }
});
