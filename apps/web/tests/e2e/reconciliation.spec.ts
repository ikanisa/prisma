import { test } from './fixtures/base';

test.describe('Reconciliation workbench', () => {
  test('creates, matches, and closes a reconciliation with confirmations', async ({ reconciliationPage }) => {
    const reconciliationName = `Bank rec ${Date.now()}`;

    await reconciliationPage.goto();

    await reconciliationPage.createReconciliation({
      name: reconciliationName,
      periodStart: '2025-03-01',
      periodEnd: '2025-03-31',
      currency: 'USD',
      controlReference: 'REC-2025-03',
    });
    await reconciliationPage.expectStatusMessage('Reconciliation created successfully');
    await reconciliationPage.expectDetailStatus('OPEN');

    const ledgerRows = [
      ['2025-03-01', 'Opening balance', '1000.00', 'GL-001'],
      ['2025-03-15', 'Customer receipt', '500.00', 'GL-002'],
    ];
    await reconciliationPage.importStatement('LEDGER', {
      sourceName: 'General Ledger',
      statementDate: '2025-03-31',
      importedBy: 'Alex Rivera',
      rows: ledgerRows,
    });
    await reconciliationPage.expectStatusMessage('Imported 2 rows from General Ledger');

    const externalRows = [
      ['2025-03-01', 'Opening balance', '1000.00', 'BANK-001'],
      ['2025-03-15', 'Customer receipt', '500.00', 'BANK-002'],
    ];
    await reconciliationPage.importStatement('EXTERNAL', {
      sourceName: 'Bank Feed',
      statementDate: '2025-03-31',
      importedBy: 'Alex Rivera',
      rows: externalRows,
    });
    await reconciliationPage.expectStatusMessage('Imported 2 rows from Bank Feed');

    await reconciliationPage.runDeterministicMatch();
    await reconciliationPage.expectStatusMessage('Matched 2 items with 0 remaining outstanding');
    await reconciliationPage.expectMatchedLines();

    await reconciliationPage.closeReconciliation({
      closedBy: 'Pat Auditor',
      summary: 'All reconciling items cleared after deterministic matching.',
      reviewNotes: 'Automation confirmed evidence bundle.',
      controlReference: 'REC-2025-03',
    });
    await reconciliationPage.expectStatusMessage('Reconciliation closed and evidence generated');
    await reconciliationPage.expectDetailStatus('CLOSED');
  });
});
