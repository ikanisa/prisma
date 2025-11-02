import { expect, Locator, Page } from '@playwright/test';

export class AuthDemoPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/style-guide/supabase-auth');
    await this.page.waitForLoadState('networkidle');
    await expect(this.emailInput).toBeVisible();
  }

  async signIn(email: string) {
    await this.emailInput.fill(email);
    await expect(this.signInButton).toBeEnabled();
    await this.signInButton.click();
    await expect(this.sessionEmail).toHaveText(`Active session for ${email}`);
    await expect(this.signOutButton).toBeEnabled();
  }

  async signOut() {
    await expect(this.signOutButton).toBeEnabled();
    await this.signOutButton.click();
    await expect(this.sessionEmail).toHaveText('No active session');
    await expect(this.signOutButton).toBeDisabled();
  }

  async expectFeedback(message: string) {
    await expect(this.feedbackMessage).toHaveText(message);
  }

  async expectSessionEmail(email: string) {
    await expect(this.sessionEmail).toHaveText(`Active session for ${email}`);
  }

  async expectNoActiveSession() {
    await expect(this.sessionEmail).toHaveText('No active session');
  }

  private get emailInput(): Locator {
    return this.page.getByTestId('supabase-email-input');
  }

  private get signInButton(): Locator {
    return this.page.getByTestId('supabase-sign-in');
  }

  private get signOutButton(): Locator {
    return this.page.getByTestId('supabase-sign-out');
  }

  private get sessionEmail(): Locator {
    return this.page.getByTestId('supabase-session-email');
  }

  private get feedbackMessage(): Locator {
    return this.page.getByTestId('supabase-feedback');
  }
}
