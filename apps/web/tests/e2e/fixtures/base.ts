import { test as base, expect as playwrightExpect } from '@playwright/test';
import { AuthDemoPage } from '../pageObjects/auth-demo-page';
import { AccountingClosePage } from '../pageObjects/accounting-close-page';
import { ReconciliationWorkbenchPage } from '../pageObjects/reconciliation-workbench-page';

type Fixtures = {
  authDemoPage: AuthDemoPage;
  accountingPage: AccountingClosePage;
  reconciliationPage: ReconciliationWorkbenchPage;
};

export const test = base.extend<Fixtures>({
  authDemoPage: async ({ page }, use) => {
    await use(new AuthDemoPage(page));
  },
  accountingPage: async ({ page }, use) => {
    await use(new AccountingClosePage(page));
  },
  reconciliationPage: async ({ page }, use) => {
    await use(new ReconciliationWorkbenchPage(page));
  },
});

export const expect = playwrightExpect;

export type TestFixtures = Fixtures;
