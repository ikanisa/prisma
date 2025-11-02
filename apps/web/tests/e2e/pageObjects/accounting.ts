import { expect, Locator, Page } from '@playwright/test';

type JournalStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'POSTED';
type ReconciliationStatus = 'IN_PROGRESS' | 'REVIEW' | 'CLOSED';

export class AccountingPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/accounting');
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.getByRole('table', { name: 'Journal batches' })).toBeVisible();
  }

  async expectJournalStatus(reference: string, status: JournalStatus) {
    const row = this.journalRow(reference);
    await expect(row.locator('td').nth(2)).toContainText(status.toLowerCase());
  }

  async advanceJournal(reference: string) {
    const row = this.journalRow(reference);
    const advanceButton = row.getByRole('button', { name: 'Advance' });
    await expect(advanceButton).toBeEnabled();
    await advanceButton.click();
  }

  async expectJournalAdvanceDisabled(reference: string) {
    const row = this.journalRow(reference);
    const advanceButton = row.getByRole('button', { name: 'Advance' });
    await expect(advanceButton).toBeDisabled();
  }

  async expectLatestActivityContains(message: string) {
    const activity = this.activitySection.getByRole('listitem').first();
    await expect(activity).toContainText(message);
  }

  async expectReconciliationStatus(type: string, status: ReconciliationStatus) {
    const row = this.reconciliationRow(type);
    await expect(row.locator('td').nth(3)).toContainText(status.toLowerCase());
  }

  async expectReconciliationDifference(type: string, text: string) {
    const row = this.reconciliationRow(type);
    await expect(row.locator('td').nth(2)).toContainText(text);
  }

  async closeReconciliation(type: string) {
    const row = this.reconciliationRow(type);
    const closeButton = row.getByRole('button', { name: 'Close' });
    await closeButton.click();
  }

  async reopenReconciliation(type: string) {
    const row = this.reconciliationRow(type);
    const reopenButton = row.getByRole('button', { name: 'Reopen' });
    await reopenButton.click();
  }

  private journalRow(reference: string): Locator {
    const table = this.page.getByRole('table', { name: 'Journal batches' });
    return table.getByRole('row', { name: new RegExp(reference, 'i') });
  }

  private reconciliationRow(type: string): Locator {
    const table = this.page.getByRole('table', { name: 'Reconciliations' });
    return table.getByRole('row', { name: new RegExp(type, 'i') });
  }

  private get activitySection(): Locator {
    return this.page.locator('section').filter({
      has: this.page.getByRole('heading', { name: 'Activity log' }),
    });
  }
}
