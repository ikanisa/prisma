import {
  assertLedgerBalanced,
  calculateLedgerBalance,
  LedgerInvariantError,
  MissingExchangeRateError,
  summariseByCurrency,
} from '../src/ledger'
import {
  imbalanceLedger,
  multiCurrencyLedger,
  simpleLedger,
  zeroAmountLedger,
} from './__fixtures__/ledger-fixtures'

describe('ledger utilities', () => {
  it('ignores zero-amount transactions when computing totals', () => {
    const result = calculateLedgerBalance(zeroAmountLedger, {
      baseCurrency: 'USD',
    })

    expect(result.baseCurrency).toBe('USD')
    expect(result.debits).toBe(0)
    expect(result.credits).toBe(0)
    expect(result.net).toBe(0)
  })

  it('converts multi-currency transactions using exchange rates', () => {
    const result = calculateLedgerBalance(multiCurrencyLedger, {
      baseCurrency: 'USD',
      exchangeRates: {
        EUR: 1.1,
        GBP: 1.3,
        JPY: 0.009,
      },
      precision: 2,
    })

    const expectedDebit = 250 * 1.1
    const expectedCredit = 150 * 1.3
    expect(result.debits).toBeCloseTo(expectedDebit, 2)
    expect(result.credits).toBeCloseTo(expectedCredit, 2)
    expect(result.net).toBeCloseTo(expectedDebit - expectedCredit, 2)
  })

  it('rounds ledger totals using the requested precision', () => {
    const result = calculateLedgerBalance(
      [
        { debit: { amount: 10.005, currency: 'USD' } },
        { credit: { amount: 0.9949, currency: 'USD' } },
      ],
      { precision: 2 }
    )

    expect(result.debits).toBe(10.01)
    expect(result.credits).toBe(0.99)
    expect(result.net).toBe(9.01)
  })

  it('throws if a transaction provides both debit and credit legs', () => {
    expect(() =>
      calculateLedgerBalance([
        {
          debit: { amount: 10, currency: 'USD' },
          credit: { amount: 10, currency: 'USD' },
        },
      ])
    ).toThrow(LedgerInvariantError)
  })

  it('throws when an exchange rate is missing for a foreign currency', () => {
    expect(() =>
      calculateLedgerBalance(multiCurrencyLedger, {
        baseCurrency: 'USD',
        exchangeRates: {
          EUR: 1.1,
        },
      })
    ).toThrow(MissingExchangeRateError)
  })

  it('asserts that total debits equal credits within tolerance', () => {
    expect(() => assertLedgerBalanced(simpleLedger, { tolerance: 0 })).not.toThrow()

    expect(() => assertLedgerBalanced(imbalanceLedger, { tolerance: 0.1 })).toThrow(
      LedgerInvariantError
    )
    expect(() => assertLedgerBalanced(imbalanceLedger, { tolerance: 41 })).not.toThrow()
  })

  it('summarises activity grouped by native currency without conversion', () => {
    const summary = summariseByCurrency(multiCurrencyLedger)
    expect(summary.get('EUR')).toEqual({ debits: 250, credits: 0 })
    expect(summary.get('GBP')).toEqual({ debits: 0, credits: 150 })
    expect(summary.get('JPY')).toEqual({ debits: 0, credits: 0 })
  })
})
