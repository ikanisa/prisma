/**
 * Deterministic tax calculation helpers.
 *
 * Functions provided here avoid I/O so unit tests can exercise tax boundary
 * conditions and rounding behaviour with predictable results.
 */

export interface TaxBracket {
  /** Upper bound for the bracket. Undefined implies no upper limit. */
  upTo?: number
  /** Rate applied to the taxable income within this bracket (0-1 inclusive). */
  rate: number
}

export interface ProgressiveTaxOptions {
  /** Amount removed from income before applying brackets. */
  deductions?: number
  /** Decimal precision for returned values. */
  precision?: number
}

export interface ProgressiveTaxBreakdownEntry {
  bracket: TaxBracket
  taxableAmount: number
  tax: number
}

export interface ProgressiveTaxResult {
  tax: number
  taxableIncome: number
  effectiveRate: number
  marginalRate: number
  breakdown: ProgressiveTaxBreakdownEntry[]
}

const DEFAULT_PRECISION = 2

export class TaxComputationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TaxComputationError'
  }
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const validateTaxBrackets = (brackets: TaxBracket[]): void => {
  if (brackets.length === 0) {
    throw new TaxComputationError('At least one tax bracket is required')
  }

  let lastLimit = 0
  for (const bracket of brackets) {
    if (!isFiniteNumber(bracket.rate)) {
      throw new TaxComputationError('Tax rates must be finite numbers')
    }

    if (bracket.rate < 0 || bracket.rate > 1) {
      throw new TaxComputationError('Tax rates must fall within [0, 1]')
    }

    if (bracket.upTo !== undefined) {
      if (!isFiniteNumber(bracket.upTo)) {
        throw new TaxComputationError('Bracket thresholds must be finite numbers')
      }

      if (bracket.upTo <= lastLimit) {
        throw new TaxComputationError('Bracket thresholds must be strictly increasing')
      }

      lastLimit = bracket.upTo
    } else {
      lastLimit = Number.POSITIVE_INFINITY
    }
  }
}

const round = (value: number, precision: number): number => {
  const factor = 10 ** precision
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export const calculateProgressiveTax = (
  income: number,
  brackets: TaxBracket[],
  options: ProgressiveTaxOptions = {}
): ProgressiveTaxResult => {
  if (!isFiniteNumber(income)) {
    throw new TaxComputationError('Income must be a finite number')
  }

  validateTaxBrackets(brackets)

  const precision = options.precision ?? DEFAULT_PRECISION
  const deductions = options.deductions ?? 0

  if (!isFiniteNumber(deductions) || deductions < 0) {
    throw new TaxComputationError('Deductions must be a non-negative finite number')
  }

  const taxableIncome = Math.max(0, income - deductions)
  const breakdown: ProgressiveTaxBreakdownEntry[] = []

  let tax = 0
  let remaining = taxableIncome
  let previousLimit = 0
  let marginalRate = 0

  for (const bracket of brackets) {
    if (remaining <= 0) {
      break
    }

    const bracketLimit = bracket.upTo ?? Number.POSITIVE_INFINITY
    const span = Math.min(remaining, bracketLimit - previousLimit)

    if (span < 0) {
      continue
    }

    const taxForBracket = span * bracket.rate
    breakdown.push({ bracket, taxableAmount: span, tax: taxForBracket })
    tax += taxForBracket
    remaining -= span
    previousLimit = bracket.upTo ?? previousLimit + span
    if (span > 0) {
      marginalRate = bracket.rate
    }
  }

  const roundedTax = round(tax, precision)
  const roundedTaxableIncome = round(taxableIncome, precision)
  const effectiveRate = taxableIncome === 0 ? 0 : round(tax / taxableIncome, precision + 2)

  return {
    tax: roundedTax,
    taxableIncome: roundedTaxableIncome,
    effectiveRate,
    marginalRate,
    breakdown: breakdown.map((entry) => ({
      bracket: entry.bracket,
      taxableAmount: round(entry.taxableAmount, precision),
      tax: round(entry.tax, precision),
    })),
  }
}
