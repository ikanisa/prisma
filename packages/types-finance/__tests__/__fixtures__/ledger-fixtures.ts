import type { LedgerTransaction } from '../../src/ledger'

export const simpleLedger: LedgerTransaction[] = [
  {
    id: 'txn-1',
    debit: { amount: 100, currency: 'USD' },
    bookedAt: '2024-12-01T00:00:00.000Z',
  },
  {
    id: 'txn-2',
    credit: { amount: 100, currency: 'USD' },
    bookedAt: '2024-12-01T00:05:00.000Z',
  },
]

export const multiCurrencyLedger: LedgerTransaction[] = [
  {
    id: 'txn-3',
    debit: { amount: 250, currency: 'EUR' },
    bookedAt: '2024-12-02T00:00:00.000Z',
  },
  {
    id: 'txn-4',
    credit: { amount: 150, currency: 'GBP' },
    bookedAt: '2024-12-02T00:05:00.000Z',
  },
  {
    id: 'txn-5',
    debit: { amount: 0, currency: 'JPY' },
    bookedAt: '2024-12-02T00:10:00.000Z',
  },
]

export const zeroAmountLedger: LedgerTransaction[] = [
  {
    id: 'txn-zero-debit',
    debit: { amount: 0, currency: 'USD' },
  },
  {
    id: 'txn-zero-credit',
    credit: { amount: 0, currency: 'USD' },
  },
]

export const imbalanceLedger: LedgerTransaction[] = [
  {
    id: 'txn-debit',
    debit: { amount: 50.25, currency: 'USD' },
  },
  {
    id: 'txn-credit',
    credit: { amount: 10, currency: 'USD' },
  },
]
