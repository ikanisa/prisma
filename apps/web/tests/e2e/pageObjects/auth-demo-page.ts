import { expect, Page } from '@playwright/test';

export class AuthDemoPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/style-guide/supabase-auth');
    await expect(this.page.getByRole('heading', { name: 'Supabase auth playground' })).toBeVisible();
  }

  async signIn(email: string) {
    const emailInput = this.page.getByTestId('supabase-email-input');
    await emailInput.fill(email);
    await this.page.getByTestId('supabase-sign-in').click();
  }

  sessionStatus() {
    return this.page.getByTestId('supabase-session-email');
  }

  feedbackBanner() {
    return this.page.getByTestId('supabase-feedback');
  }

  async expectSignedIn(email: string) {
    await expect(this.feedbackBanner()).toHaveText('Sign-in request sent.');
    await expect(this.sessionStatus()).toHaveText(`Active session for ${email}`);
  }

  async signOut() {
    await this.page.getByTestId('supabase-sign-out').click();
  }

  async expectSignedOut() {
    await expect(this.feedbackBanner()).toHaveText('Signed out successfully.');
    await expect(this.sessionStatus()).toHaveText('No active session');
  }
}
