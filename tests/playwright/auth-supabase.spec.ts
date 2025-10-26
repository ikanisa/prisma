import { test, expect } from '@playwright/test';

const demoEmail = 'playwright-supabase@example.com';

test.describe('Supabase auth flows', () => {
  test('signs in and out using the browser client', async ({ page }) => {
    await page.goto('/style-guide/supabase-auth');

    await expect(page.getByRole('heading', { name: 'Supabase auth playground' })).toBeVisible();

    const emailInput = page.getByTestId('supabase-email-input');
    await emailInput.fill(demoEmail);

    await page.getByTestId('supabase-sign-in').click();
    await expect(page.getByTestId('supabase-feedback')).toHaveText('Sign-in request sent.');
    await expect(page.getByTestId('supabase-session-email')).toHaveText(`Active session for ${demoEmail}`);

    await page.getByTestId('supabase-sign-out').click();
    await expect(page.getByTestId('supabase-feedback')).toHaveText('Signed out successfully.');
    await expect(page.getByTestId('supabase-session-email')).toHaveText('No active session');
  });
});
