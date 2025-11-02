import { test } from './fixtures/base';

const TEST_EMAIL = 'playwright-auth@example.com';

test.describe('Authentication demo', () => {
  test('allows signing in and out with the Supabase stub', async ({ authDemoPage }) => {
    await authDemoPage.goto();

    await authDemoPage.signIn(TEST_EMAIL);
    await authDemoPage.expectSignedIn(TEST_EMAIL);

    await authDemoPage.signOut();
    await authDemoPage.expectSignedOut();
  });
});
