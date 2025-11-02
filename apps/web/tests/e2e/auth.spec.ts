import { test } from './fixtures';

const demoEmail = 'finance.lead@example.com';

test.describe('Authentication demo', () => {
  test('allows users to sign in and sign out via Supabase OTP', async ({ authDemoPage }) => {
    await authDemoPage.goto();

    await authDemoPage.signIn(demoEmail);
    await authDemoPage.expectFeedback('Sign-in request sent.');
    await authDemoPage.expectSessionEmail(demoEmail);

    await authDemoPage.signOut();
    await authDemoPage.expectFeedback('Signed out successfully.');
    await authDemoPage.expectNoActiveSession();
  });
});
