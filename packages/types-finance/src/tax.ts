import { roundAmount } from './ledger.js'

export type TaxComputationOptions = {
  precision?: number
}

export type TaxLiability = {
  taxableAmount: number
  rate: number
  taxDue: number
}

export type TaxBracket = {
  upTo?: number
  rate: number
}

export type ProgressiveTaxBreakdown = {
  taxable: number
  rate: number
  tax: number
  upTo?: number
}

export type ProgressiveTaxResult = {
  taxDue: number
  effectiveRate: number
  breakdown: ProgressiveTaxBreakdown[]
}

const DEFAULT_PRECISION = 2

export function normalizeTaxRate(rate: number): number {
  const numericRate = Number(rate)
  if (!Number.isFinite(numericRate)) {
    throw new TypeError('Tax rate must be a finite number')
  }
  if (numericRate < 0) {
    throw new RangeError('Tax rate cannot be negative')
  }
  if (numericRate <= 1) {
    return numericRate
  }
  if (numericRate <= 100) {
    return numericRate / 100
  }
  throw new RangeError('Tax rate must not exceed 100%')
}

export function calculateTaxLiability(
  baseAmount: number,
  rate: number,
  options: TaxComputationOptions = {},
): TaxLiability {
  const precision = Number.isInteger(options.precision) ? Number(options.precision) : DEFAULT_PRECISION
  const taxableAmount = Math.max(Number(baseAmount) || 0, 0)
  const normalizedRate = normalizeTaxRate(rate)

  const taxDue = roundAmount(taxableAmount * normalizedRate, precision)
  return {
    taxableAmount: roundAmount(taxableAmount, precision),
    rate: normalizedRate,
    taxDue,
  }
}

export function calculateProgressiveTax(
  income: number,
  brackets: TaxBracket[],
  options: TaxComputationOptions = {},
): ProgressiveTaxResult {
  if (!Array.isArray(brackets) || brackets.length === 0) {
    return { taxDue: 0, effectiveRate: 0, breakdown: [] }
  }

  const precision = Number.isInteger(options.precision) ? Number(options.precision) : DEFAULT_PRECISION
  const taxableIncome = Math.max(Number(income) || 0, 0)
  let remainingIncome = taxableIncome
  let lowerBound = 0
  let totalTax = 0
  const breakdown: ProgressiveTaxBreakdown[] = []

  for (const bracket of brackets) {
    const upperBound = typeof bracket.upTo === 'number' ? bracket.upTo : Number.POSITIVE_INFINITY
    if (!Number.isFinite(upperBound) && bracket.upTo !== undefined) {
      throw new TypeError('Bracket upper bound must be finite when provided')
    }
    if (upperBound <= lowerBound) {
      throw new RangeError('Tax brackets must be provided in ascending order with unique thresholds')
    }

    if (remainingIncome <= 0) {
      break
    }

    const span = Math.min(remainingIncome, upperBound - lowerBound)
    if (span > 0) {
      const normalizedRate = normalizeTaxRate(bracket.rate)
      const taxForBracket = roundAmount(span * normalizedRate, precision)
      totalTax += taxForBracket
      breakdown.push({
        taxable: roundAmount(span, precision),
        rate: normalizedRate,
        tax: taxForBracket,
        upTo: Number.isFinite(upperBound) ? upperBound : undefined,
      })
      remainingIncome -= span
    }

    lowerBound = upperBound
  }

  if (remainingIncome > 0) {
    const lastBracket = brackets[brackets.length - 1]
    const normalizedRate = normalizeTaxRate(lastBracket.rate)
    const taxForRemainder = roundAmount(remainingIncome * normalizedRate, precision)
    totalTax += taxForRemainder
    breakdown.push({
      taxable: roundAmount(remainingIncome, precision),
      rate: normalizedRate,
      tax: taxForRemainder,
      upTo: undefined,
    })
  }

  const effectiveRate = taxableIncome > 0 ? roundAmount(totalTax / taxableIncome, Math.max(precision, 4)) : 0

  return {
    taxDue: roundAmount(totalTax, precision),
    effectiveRate,
    breakdown,
  }
}

export function applyTaxCredits(
  taxDue: number,
  credits: number | number[],
  options: TaxComputationOptions = {},
): { netTax: number; creditsApplied: number; unusedCredits: number } {
  const precision = Number.isInteger(options.precision) ? Number(options.precision) : DEFAULT_PRECISION
  const numericTaxDue = Math.max(Number(taxDue) || 0, 0)
  const totalCredits = Array.isArray(credits)
    ? credits.reduce((sum, value) => sum + Math.max(Number(value) || 0, 0), 0)
    : Math.max(Number(credits) || 0, 0)

  const netTax = Math.max(numericTaxDue - totalCredits, 0)
  const creditsApplied = Math.min(numericTaxDue, totalCredits)
  const unusedCredits = Math.max(totalCredits - numericTaxDue, 0)

  return {
    netTax: roundAmount(netTax, precision),
    creditsApplied: roundAmount(creditsApplied, precision),
    unusedCredits: roundAmount(unusedCredits, precision),
  }
}
