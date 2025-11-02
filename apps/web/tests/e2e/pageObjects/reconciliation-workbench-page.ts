import { expect, Page } from '@playwright/test';

export class ReconciliationWorkbenchPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/audit/reconciliations');
    await expect(this.page.getByRole('heading', { name: 'Audit Reconciliation Workbench' })).toBeVisible();
    await expect(this.page.getByText('Mode: memory')).toBeVisible();
  }

  async expectStatusMessage(text: string) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async createReconciliation(options: {
    name: string;
    periodStart: string;
    periodEnd: string;
    currency?: string;
    controlReference?: string;
  }) {
    await this.page.fill('#name', options.name);
    await this.page.fill('#periodStart', options.periodStart);
    await this.page.fill('#periodEnd', options.periodEnd);
    if (options.currency) {
      await this.page.fill('#currency', options.currency);
    }
    if (options.controlReference) {
      await this.page.fill('#controlReference', options.controlReference);
    }
    await this.page.getByRole('button', { name: 'Launch reconciliation' }).click();
  }

  async expectDetailStatus(status: string) {
    await expect(this.page.getByText(`Status: ${status}`)).toBeVisible();
  }

  async importStatement(side: 'LEDGER' | 'EXTERNAL', options: {
    sourceName: string;
    rows: string[][];
    statementDate?: string;
    importedBy?: string;
  }) {
    await this.page.selectOption('#side', side);
    await this.page.fill('#sourceName', options.sourceName);
    if (options.statementDate) {
      await this.page.fill('#statementDate', options.statementDate);
    }
    if (options.importedBy) {
      await this.page.fill('#importedBy', options.importedBy);
    }
    const raw = options.rows.map((row) => row.join(',')).join('\n');
    await this.page.fill('#raw', raw);
    await this.page.getByRole('button', { name: 'Import statement' }).click();
  }

  async runDeterministicMatch() {
    await this.page.getByRole('button', { name: 'Run deterministic match' }).click();
  }

  async closeReconciliation(options: {
    closedBy: string;
    summary: string;
    reviewNotes?: string;
    controlReference?: string;
  }) {
    await this.page.fill('#closedBy', options.closedBy);
    await this.page.fill('#summary', options.summary);
    if (options.reviewNotes) {
      await this.page.fill('#reviewNotes', options.reviewNotes);
    }
    if (options.controlReference) {
      await this.page.fill('#controlReferenceClose', options.controlReference);
    }
    await this.page.getByRole('button', { name: 'Close reconciliation' }).click();
  }

  async expectMatchedLines() {
    await expect(this.page.getByText('✔︎').first()).toBeVisible();
  }
}
