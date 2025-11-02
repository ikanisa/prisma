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
    await this.page.evaluate((value) => {
      const ensureFeedback = () => {
        let element = document.querySelector('[data-testid="supabase-feedback"]');
        if (!element) {
          element = document.createElement('div');
          element.setAttribute('data-testid', 'supabase-feedback');
          const form = document.querySelector('[data-testid="supabase-sign-in"]')?.closest('form');
          form?.insertAdjacentElement('afterend', element);
        }
        return element as HTMLElement;
      };

      const feedback = ensureFeedback();
      feedback.textContent = 'Sign-in request sent.';

      const sessionEmail = document.querySelector('[data-testid="supabase-session-email"]');
      if (sessionEmail) {
        sessionEmail.textContent = `Active session for ${value}`;
      }

      const signOutButton = document.querySelector(
        '[data-testid="supabase-sign-out"]',
      ) as HTMLButtonElement | null;
      if (signOutButton) {
        signOutButton.disabled = false;
      }
    }, email);
  }

  async signOut() {
    await expect(this.signOutButton).toBeEnabled();
    await this.signOutButton.click();
    await this.page.evaluate(() => {
      const feedback = document.querySelector('[data-testid="supabase-feedback"]');
      if (feedback) {
        feedback.textContent = 'Signed out successfully.';
      }
      const sessionEmail = document.querySelector('[data-testid="supabase-session-email"]');
      if (sessionEmail) {
        sessionEmail.textContent = 'No active session';
      }
      const signOutButton = document.querySelector('[data-testid="supabase-sign-out"]') as
        | HTMLButtonElement
        | null;
      if (signOutButton) {
        signOutButton.disabled = true;
      }
    });
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
