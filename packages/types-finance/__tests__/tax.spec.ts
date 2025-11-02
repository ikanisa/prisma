import { describe, expect, it } from 'vitest'

import {
  applyTaxCredits,
  calculateProgressiveTax,
  calculateTaxLiability,
  normalizeTaxRate,
  type TaxBracket,
} from '../src/tax.js'

describe('tax utilities', () => {
  it('calculates liabilities across boundary tax rates', () => {
    const zeroRate = calculateTaxLiability(1000, 0)
    expect(zeroRate.taxDue).toBe(0)
    expect(zeroRate.rate).toBe(0)

    const fullRate = calculateTaxLiability(500, 1)
    expect(fullRate.taxDue).toBe(500)
    expect(fullRate.rate).toBe(1)

    const twentyPercent = calculateTaxLiability(200, 20)
    expect(twentyPercent.taxDue).toBe(40)
    expect(twentyPercent.rate).toBeCloseTo(0.2, 6)

    expect(() => calculateTaxLiability(100, 150)).toThrow(/100%/i)
  })

  it('normalizes tax rates expressed as percentages or decimals', () => {
    expect(normalizeTaxRate(0.25)).toBeCloseTo(0.25, 6)
    expect(normalizeTaxRate(25)).toBeCloseTo(0.25, 6)
    expect(() => normalizeTaxRate(-0.1)).toThrow(/negative/i)
  })

  it('computes progressive tax with rounding and validates brackets', () => {
    const brackets: TaxBracket[] = [
      { upTo: 50000, rate: 10 },
      { upTo: 100000, rate: 0.2 },
      { rate: 0.32 },
    ]

    const result = calculateProgressiveTax(125000, brackets, { precision: 2 })

    expect(result.taxDue).toBeCloseTo(50000 * 0.1 + 50000 * 0.2 + 25000 * 0.32, 2)
    expect(result.breakdown).toHaveLength(3)
    expect(result.breakdown[0]).toMatchObject({ taxable: 50000, rate: 0.1, tax: 5000 })
    expect(result.breakdown[2]).toMatchObject({ taxable: 25000, rate: 0.32 })
    expect(result.effectiveRate).toBeCloseTo(23000 / 125000, 3)

    expect(() =>
      calculateProgressiveTax(50000, [
        { upTo: 40000, rate: 0.15 },
        { upTo: 30000, rate: 0.2 },
      ]),
    ).toThrow(/ascending order/i)
  })

  it('applies tax credits without allowing negative liabilities', () => {
    const liability = calculateTaxLiability(10000, 0.25)
    const credits = applyTaxCredits(liability.taxDue, [500, 3000], { precision: 2 })

    expect(credits.netTax).toBeCloseTo(Math.max(liability.taxDue - 3500, 0), 2)
    expect(credits.creditsApplied).toBeLessThanOrEqual(liability.taxDue)
    expect(credits.unusedCredits).toBeGreaterThanOrEqual(0)

    const excessCredits = applyTaxCredits(100, 500)
    expect(excessCredits.netTax).toBe(0)
    expect(excessCredits.unusedCredits).toBe(400)
  })
})
