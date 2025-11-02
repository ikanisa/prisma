import { calculateProgressiveTax, TaxComputationError, validateTaxBrackets } from '../src/tax'

describe('tax utilities', () => {
  const baseBrackets = [
    { upTo: 50_000, rate: 0.1 },
    { upTo: 100_000, rate: 0.2 },
    { rate: 0.3 },
  ] as const

  it('returns zero tax for zero or fully deducted income', () => {
    const zeroIncome = calculateProgressiveTax(0, baseBrackets)
    expect(zeroIncome.tax).toBe(0)
    expect(zeroIncome.effectiveRate).toBe(0)

    const fullyDeducted = calculateProgressiveTax(40_000, baseBrackets, { deductions: 40_000 })
    expect(fullyDeducted.tax).toBe(0)
    expect(fullyDeducted.taxableIncome).toBe(0)
  })

  it('applies bracket boundaries without double-counting income', () => {
    const fiftyK = calculateProgressiveTax(50_000, baseBrackets)
    expect(fiftyK.tax).toBe(5_000)
    expect(fiftyK.effectiveRate).toBeCloseTo(0.1, 4)
    expect(fiftyK.breakdown).toHaveLength(1)

    const oneHundredK = calculateProgressiveTax(100_000, baseBrackets)
    expect(oneHundredK.tax).toBe(15_000)
    expect(oneHundredK.breakdown).toHaveLength(2)

    const twoHundredK = calculateProgressiveTax(200_000, baseBrackets)
    const expectedTax = 50_000 * 0.1 + 50_000 * 0.2 + 100_000 * 0.3
    expect(twoHundredK.tax).toBe(expectedTax)
    expect(twoHundredK.marginalRate).toBe(0.3)
  })

  it('respects rounding precision for tax and breakdown entries', () => {
    const result = calculateProgressiveTax(
      87_654.321,
      [
        { upTo: 10_000, rate: 0.12 },
        { upTo: 80_000, rate: 0.22 },
        { rate: 0.33 },
      ],
      { precision: 3 }
    )

    expect(result.tax).toBeCloseTo(19_125.926, 3)
    for (const entry of result.breakdown) {
      expect(entry.taxableAmount * 1000).toBeCloseTo(Math.round(entry.taxableAmount * 1000), 6)
      expect(entry.tax * 1000).toBeCloseTo(Math.round(entry.tax * 1000), 6)
    }
  })

  it('validates tax bracket inputs before computation', () => {
    expect(() => validateTaxBrackets([])).toThrow(TaxComputationError)
    expect(() =>
      calculateProgressiveTax(10_000, [
        { upTo: 20_000, rate: -0.1 },
      ])
    ).toThrow(TaxComputationError)

    expect(() =>
      calculateProgressiveTax(10_000, [
        { upTo: 20_000, rate: 0.1 },
        { upTo: 10_000, rate: 0.2 },
      ])
    ).toThrow(TaxComputationError)
  })

  it('rejects invalid deduction inputs', () => {
    expect(() => calculateProgressiveTax(50_000, baseBrackets, { deductions: -1 })).toThrow(
      TaxComputationError
    )
  })
})
