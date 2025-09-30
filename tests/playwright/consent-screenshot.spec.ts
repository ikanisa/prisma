import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';

const artifactsDir = 'GO-LIVE/artifacts';

test.describe('Cookie consent banner', () => {
  test.beforeAll(() => {
    if (!existsSync(artifactsDir)) {
      mkdirSync(artifactsDir, { recursive: true });
    }
  });

  test('captures screenshots before and after consent', async ({ page }) => {
    // Ensure fresh state
    await page.context().clearCookies();
    await page.goto('/');

    // Expect banner
    const banner = page.getByRole('dialog', { name: 'Cookie consent' });
    await expect(banner).toBeVisible();
    await page.screenshot({ path: `${artifactsDir}/cookie-consent.png`, fullPage: true });

    // Accept
    await page.getByRole('button', { name: 'Accept non-essential cookies' }).click();
    await expect(banner).toBeHidden();
    await page.screenshot({ path: `${artifactsDir}/cookie-consent-accepted.png`, fullPage: true });
  });
});

