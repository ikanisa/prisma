import type { LedgerEntry } from '../../src/ledger.js'

export const sampleLedgerEntries: LedgerEntry[] = [
  {
    id: 'txn-001',
    account: '1000',
    side: 'debit',
    amount: 1000,
    currency: 'usd',
    description: 'Cash receipt',
  },
  {
    id: 'txn-002',
    account: '1000',
    side: 'credit',
    amount: 1000,
    currency: 'USD',
    description: 'Offsetting entry',
  },
  {
    id: 'txn-003',
    account: '2000',
    side: 'debit',
    amount: 500,
    currency: 'eur',
    description: 'Revenue accrual',
  },
  {
    id: 'txn-004',
    account: '2000',
    side: 'credit',
    amount: 200,
    currency: 'EUR',
    description: 'Partial reversal',
  },
  {
    id: 'txn-005',
    account: '9999',
    side: 'credit',
    amount: 0,
    currency: 'USD',
    description: 'Zero amount placeholder',
  },
]
