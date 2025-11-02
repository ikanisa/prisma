import { expect, Locator, Page } from '@playwright/test';

export class AccountingClosePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/accounting');
    await expect(this.page.getByRole('heading', { name: 'Accounting Close Workspace' })).toBeVisible();
  }

  private journalRow(ref: string): Locator {
    const table = this.page.locator('table[aria-label="Journal batches"] tbody tr');
    return table.filter({ has: this.page.getByRole('cell', { name: ref, exact: true }) });
  }

  async advanceJournal(ref: string) {
    await this.journalRow(ref).getByRole('button', { name: 'Advance' }).click();
  }

  async expectJournalStatus(ref: string, status: 'draft' | 'submitted' | 'approved' | 'posted') {
    await expect(this.journalRow(ref).getByText(status, { exact: true })).toBeVisible();
  }

  async expectAdvanceDisabled(ref: string) {
    await expect(this.journalRow(ref).getByRole('button', { name: 'Advance' })).toBeDisabled();
  }

  async expectAlertsCleared(ref: string) {
    await expect(this.journalRow(ref).getByText('None', { exact: true })).toBeVisible();
  }

  private summaryCard(label: string): Locator {
    const summarySection = this.page.locator('section[aria-labelledby="summary-heading"]');
    return summarySection.locator('[role="listitem"]').filter({
      has: this.page.getByText(label, { exact: true }),
    });
  }

  async expectSummaryValue(label: string, value: string) {
    const card = this.summaryCard(label);
    await expect(card.locator('div').nth(1)).toHaveText(value);
  }

  async expectLatestActivity(message: string) {
    const activitySection = this.page.locator('section[aria-labelledby="activity-heading"]');
    const latestEntry = activitySection.locator('li').first();
    await expect(latestEntry).toContainText(message);
  }
}
