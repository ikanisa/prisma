/**
 * Lightweight ledger utilities for deterministic financial testing.
 *
 * The implementation intentionally focuses on pure functions so unit tests can
 * exercise conversion logic, rounding behaviour, and ledger invariants without
 * requiring database fixtures.
 */

export type CurrencyCode = string

export interface LedgerAmount {
  amount: number
  currency: CurrencyCode
}

export interface LedgerTransaction {
  /** Optional identifier for tracing */
  id?: string
  /** Debit leg of the transaction. Amounts must be positive or zero. */
  debit?: LedgerAmount | null
  /** Credit leg of the transaction. Amounts must be positive or zero. */
  credit?: LedgerAmount | null
  /** Arbitrary metadata preserved for diagnostics */
  meta?: Record<string, unknown>
  /** ISO-8601 timestamp */
  bookedAt?: string
}

export interface ExchangeRateTable {
  /** Currency that represents the base for conversions. */
  baseCurrency: CurrencyCode
  /**
   * Map of currency code to the number of base currency units represented by a
   * single unit of the foreign currency. Example: with base "USD" and
   * EUR:1.1, one EUR is converted to 1.1 USD.
   */
  rates: Record<CurrencyCode, number>
}

export interface LedgerBalanceOptions {
  baseCurrency?: CurrencyCode
  /** Optional exchange rates relative to the chosen base currency. */
  exchangeRates?: Record<CurrencyCode, number>
  /** Precision used when rounding monetary totals. */
  precision?: number
}

export interface LedgerBalanceSummary {
  /** Total debits expressed in the configured base currency. */
  debits: number
  /** Total credits expressed in the configured base currency. */
  credits: number
  /** Net movement (debits - credits). */
  net: number
  /** Currency for the returned totals. */
  baseCurrency: CurrencyCode
}

const DEFAULT_BASE_CURRENCY = 'USD'
const DEFAULT_PRECISION = 2

export class LedgerInvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LedgerInvariantError'
  }
}

export class MissingExchangeRateError extends Error {
  constructor(currency: CurrencyCode) {
    super(`Missing exchange rate for ${currency}`)
    this.name = 'MissingExchangeRateError'
  }
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const toExchangeTable = (
  baseCurrency: CurrencyCode,
  exchangeRates?: Record<CurrencyCode, number>
): ExchangeRateTable => {
  const rates: Record<CurrencyCode, number> = { ...exchangeRates }
  rates[baseCurrency] = 1

  for (const [code, rate] of Object.entries(rates)) {
    if (!isFiniteNumber(rate) || rate <= 0) {
      throw new LedgerInvariantError(`Invalid exchange rate for ${code}`)
    }
  }

  return { baseCurrency, rates }
}

const convertToBase = (
  amount: LedgerAmount | null | undefined,
  table: ExchangeRateTable
): number => {
  if (!amount) {
    return 0
  }

  if (!isFiniteNumber(amount.amount)) {
    throw new LedgerInvariantError('Ledger amounts must be finite numbers')
  }

  if (amount.amount < 0) {
    throw new LedgerInvariantError('Ledger amounts cannot be negative')
  }

  if (amount.amount === 0) {
    return 0
  }

  const rate = table.rates[amount.currency]
  if (!rate) {
    throw new MissingExchangeRateError(amount.currency)
  }

  return amount.amount * rate
}

const round = (value: number, precision: number): number => {
  const factor = 10 ** precision
  return Math.round((value + Number.EPSILON) * factor) / factor
}

const computeTotals = (
  transactions: LedgerTransaction[],
  table: ExchangeRateTable
): { debits: number; credits: number } => {
  let debits = 0
  let credits = 0

  for (const txn of transactions) {
    const hasDebit = txn.debit && txn.debit.amount !== 0
    const hasCredit = txn.credit && txn.credit.amount !== 0

    if (hasDebit && hasCredit) {
      throw new LedgerInvariantError('Transaction cannot contain both debit and credit values')
    }

    debits += convertToBase(txn.debit, table)
    credits += convertToBase(txn.credit, table)
  }

  return { debits, credits }
}

export const calculateLedgerBalance = (
  transactions: LedgerTransaction[],
  options: LedgerBalanceOptions = {}
): LedgerBalanceSummary => {
  const baseCurrency = options.baseCurrency ?? DEFAULT_BASE_CURRENCY
  const precision = options.precision ?? DEFAULT_PRECISION
  const table = toExchangeTable(baseCurrency, options.exchangeRates)
  const { debits, credits } = computeTotals(transactions, table)

  const net = debits - credits

  return {
    debits: round(debits, precision),
    credits: round(credits, precision),
    net: round(net, precision),
    baseCurrency,
  }
}

export interface BalanceAssertionOptions extends LedgerBalanceOptions {
  /** Allowable difference between debits and credits expressed in base currency. */
  tolerance?: number
}

export const assertLedgerBalanced = (
  transactions: LedgerTransaction[],
  options: BalanceAssertionOptions = {}
): void => {
  const tolerance = options.tolerance ?? 0
  const baseCurrency = options.baseCurrency ?? DEFAULT_BASE_CURRENCY
  const table = toExchangeTable(baseCurrency, options.exchangeRates)
  const { debits, credits } = computeTotals(transactions, table)

  const difference = Math.abs(debits - credits)

  if (difference > tolerance) {
    throw new LedgerInvariantError(
      `Ledger is out of balance by ${difference.toFixed(6)} ${baseCurrency}`
    )
  }
}

export const summariseByCurrency = (
  transactions: LedgerTransaction[]
): Map<CurrencyCode, { debits: number; credits: number }> => {
  const summary = new Map<CurrencyCode, { debits: number; credits: number }>()

  for (const txn of transactions) {
    if (txn.debit) {
      const bucket = summary.get(txn.debit.currency) ?? { debits: 0, credits: 0 }
      bucket.debits += txn.debit.amount
      summary.set(txn.debit.currency, bucket)
    }

    if (txn.credit) {
      const bucket = summary.get(txn.credit.currency) ?? { debits: 0, credits: 0 }
      bucket.credits += txn.credit.amount
      summary.set(txn.credit.currency, bucket)
    }
  }

  return summary
}
