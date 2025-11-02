import { describe, expect, it } from 'vitest'

import {
  convertToBase,
  normalizeLedgerEntry,
  roundAmount,
  summarizeLedger,
  type LedgerEntry,
} from '../src/ledger.js'
import { sampleLedgerEntries } from './__fixtures__/ledger.js'

describe('ledger utilities', () => {
  it('summarizes balances across currencies with rounding and FX conversion', () => {
    const summary = summarizeLedger(sampleLedgerEntries, {
      baseCurrency: 'USD',
      fxRates: {
        EUR: 1.1,
      },
      precision: 2,
    })

    expect(summary.baseCurrency).toBe('USD')
    expect(summary.totalsByCurrency).toMatchObject({
      USD: { debit: 1000, credit: 1000, net: 0 },
      EUR: { debit: 500, credit: 200, net: 300 },
    })
    expect(summary.baseTotals).toEqual({
      debit: 1000 + roundAmount(500 * 1.1, 2),
      credit: 1000 + roundAmount(200 * 1.1, 2),
      net: roundAmount((500 - 200) * 1.1, 2),
    })
    expect(summary.imbalance).toBe(roundAmount(summary.baseTotals.debit - summary.baseTotals.credit, 2))
  })

  it('tracks zero-amount transactions without impacting balances', () => {
    const summary = summarizeLedger(sampleLedgerEntries, {
      baseCurrency: 'USD',
      fxRates: { EUR: 1.2 },
      precision: 2,
      zeroTolerance: 1e-9,
    })

    expect(summary.zeroEntries).toHaveLength(1)
    expect(summary.zeroEntries[0]?.id).toBe('txn-005')
    expect(summary.baseTotals.net).toBeGreaterThan(0)
  })

  it('throws when FX rate for a currency is missing', () => {
    const entries: LedgerEntry[] = [
      {
        id: 'missing-rate',
        account: '9999',
        side: 'debit',
        amount: 42,
        currency: 'JPY',
      },
    ]

    expect(() =>
      summarizeLedger(entries, {
        baseCurrency: 'USD',
        fxRates: {},
      }),
    ).toThrow(/missing fx rate/i)
  })

  it('normalises ledger entries and rejects invalid inputs', () => {
    const normalized = normalizeLedgerEntry({
      id: 'norm-1',
      account: '2000',
      side: 'credit',
      amount: '15.50' as unknown as number,
      currency: 'gbp',
    })

    expect(normalized.currency).toBe('GBP')
    expect(normalized.amount).toBe(15.5)

    expect(() =>
      normalizeLedgerEntry({
        id: 'bad-side',
        account: '1000',
        side: 'increase' as LedgerEntry['side'],
        amount: 10,
        currency: 'USD',
      }),
    ).toThrow(/debit|credit/i)
  })

  it('converts values to the base currency with rounding helpers', () => {
    expect(roundAmount(12.3456, 3)).toBe(12.346)
    expect(convertToBase(100, 'EUR', { baseCurrency: 'USD', fxRates: { EUR: 1.07 } })).toBeCloseTo(107, 6)
    expect(() => convertToBase(10, 'CHF', { baseCurrency: 'USD', fxRates: {} })).toThrow()
  })
})
