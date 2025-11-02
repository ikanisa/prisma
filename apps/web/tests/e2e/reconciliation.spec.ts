import { test } from './fixtures';

test.describe('Reconciliation workflow', () => {
  test('closes and reopens a reconciliation with activity confirmation', async ({ accountingPage }) => {
    await accountingPage.goto();

    const reconciliationType = 'AR';

    await accountingPage.expectReconciliationStatus(reconciliationType, 'IN_PROGRESS');

    await accountingPage.closeReconciliation(reconciliationType);
    await accountingPage.expectReconciliationStatus(reconciliationType, 'CLOSED');
    await accountingPage.expectReconciliationDifference(reconciliationType, 'Balanced');
    await accountingPage.expectLatestActivityContains('Reconciliation AR updated to CLOSED.');

    await accountingPage.reopenReconciliation(reconciliationType);
    await accountingPage.expectReconciliationStatus(reconciliationType, 'REVIEW');
    await accountingPage.expectLatestActivityContains('Reconciliation AR updated to REVIEW.');
  });
});
