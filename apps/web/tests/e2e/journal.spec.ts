import { test } from './fixtures/base';

const JOURNAL_REF = 'FX-REMEASURE';

test.describe('Journal lifecycle', () => {
  test('advances a journal batch from draft to posted', async ({ accountingPage }) => {
    await accountingPage.goto();

    await accountingPage.expectJournalStatus(JOURNAL_REF, 'draft');

    await accountingPage.advanceJournal(JOURNAL_REF);
    await accountingPage.expectJournalStatus(JOURNAL_REF, 'submitted');

    await accountingPage.advanceJournal(JOURNAL_REF);
    await accountingPage.expectJournalStatus(JOURNAL_REF, 'approved');
    await accountingPage.expectAlertsCleared(JOURNAL_REF);

    await accountingPage.advanceJournal(JOURNAL_REF);
    await accountingPage.expectJournalStatus(JOURNAL_REF, 'posted');
    await accountingPage.expectAdvanceDisabled(JOURNAL_REF);

    await accountingPage.expectSummaryValue('Journals pending', '2');
    await accountingPage.expectLatestActivity(`Journal ${JOURNAL_REF} moved to POSTED.`);
  });
});
