import { test } from './fixtures';

test.describe('Journal lifecycle', () => {
  test('advances a draft journal through approval and posting', async ({ accountingPage }) => {
    await accountingPage.goto();

    const reference = 'FX-REMEASURE';

    await accountingPage.expectJournalStatus(reference, 'DRAFT');

    await accountingPage.advanceJournal(reference);
    await accountingPage.expectJournalStatus(reference, 'SUBMITTED');
    await accountingPage.expectLatestActivityContains('Journal FX-REMEASURE moved to SUBMITTED.');

    await accountingPage.advanceJournal(reference);
    await accountingPage.expectJournalStatus(reference, 'APPROVED');
    await accountingPage.expectLatestActivityContains('Journal FX-REMEASURE moved to APPROVED.');

    await accountingPage.advanceJournal(reference);
    await accountingPage.expectJournalStatus(reference, 'POSTED');
    await accountingPage.expectJournalAdvanceDisabled(reference);
    await accountingPage.expectLatestActivityContains('Journal FX-REMEASURE moved to POSTED.');
  });
});
