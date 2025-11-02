export type LedgerSide = 'debit' | 'credit'

export type LedgerEntry = {
  id: string
  account: string
  amount: number
  currency: string
  side: LedgerSide
  postedAt?: string
  description?: string
  metadata?: Record<string, unknown>
}

export type NormalizedLedgerEntry = LedgerEntry & {
  currency: string
  amount: number
}

export type LedgerSummary = {
  baseCurrency: string
  totalsByCurrency: Record<string, { debit: number; credit: number; net: number }>
  baseTotals: { debit: number; credit: number; net: number }
  imbalance: number
  zeroEntries: NormalizedLedgerEntry[]
}

export type LedgerSummaryOptions = {
  baseCurrency: string
  fxRates: Record<string, number>
  precision?: number
  zeroTolerance?: number
  balanceTolerance?: number
  enforceBalance?: boolean
}

const ZERO_TOLERANCE = 1e-9

const normalizeCurrency = (currency: string): string => {
  if (typeof currency !== 'string' || currency.trim() === '') {
    throw new TypeError('Ledger entry currency must be a non-empty string')
  }
  return currency.trim().toUpperCase()
}

export const roundAmount = (value: number, precision = 2): number => {
  if (!Number.isFinite(value)) {
    throw new TypeError('Cannot round a non-finite value')
  }
  const factor = 10 ** precision
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function normalizeLedgerEntry(
  entry: LedgerEntry,
  options: { zeroTolerance?: number } = {},
): NormalizedLedgerEntry {
  if (!entry || typeof entry !== 'object') {
    throw new TypeError('Ledger entry must be an object')
  }

  if (entry.side !== 'debit' && entry.side !== 'credit') {
    throw new TypeError(`Ledger entry side must be "debit" or "credit", received "${entry.side}"`)
  }

  const amount = Number(entry.amount)
  if (!Number.isFinite(amount)) {
    throw new TypeError(`Ledger entry amount for ${entry.id} must be a finite number`)
  }
  if (amount < 0) {
    throw new RangeError(`Ledger entry amount for ${entry.id} must be non-negative`)
  }

  const zeroTolerance = options.zeroTolerance ?? ZERO_TOLERANCE
  const normalizedCurrency = normalizeCurrency(entry.currency)

  return {
    ...entry,
    amount,
    currency: normalizedCurrency,
  }
}

export function convertToBase(
  amount: number,
  currency: string,
  { baseCurrency, fxRates }: { baseCurrency: string; fxRates: Record<string, number> },
): number {
  const normalizedCurrency = normalizeCurrency(currency)
  const normalizedBase = normalizeCurrency(baseCurrency)

  if (!Number.isFinite(amount)) {
    throw new TypeError('Amount must be finite to convert currency')
  }

  if (normalizedCurrency === normalizedBase) {
    return amount
  }

  const rate = fxRates[normalizedCurrency]
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new RangeError(`Missing FX rate for currency ${normalizedCurrency}`)
  }

  return amount * rate
}

export function summarizeLedger(entries: LedgerEntry[], options: LedgerSummaryOptions): LedgerSummary {
  if (!Array.isArray(entries)) {
    throw new TypeError('Entries must be an array')
  }
  if (!options || typeof options !== 'object') {
    throw new TypeError('Options are required to summarise the ledger')
  }

  const precision = Number.isInteger(options.precision) ? Number(options.precision) : 2
  const zeroTolerance = Number.isFinite(options.zeroTolerance) ? Math.abs(Number(options.zeroTolerance)) : ZERO_TOLERANCE
  const balanceTolerance = Number.isFinite(options.balanceTolerance)
    ? Math.abs(Number(options.balanceTolerance))
    : zeroTolerance

  const baseCurrency = normalizeCurrency(options.baseCurrency)
  const fxRates: Record<string, number> = { ...options.fxRates, [baseCurrency]: 1 }

  const totalsByCurrency = new Map<string, { debit: number; credit: number }>()
  let baseDebit = 0
  let baseCredit = 0
  const zeroEntries: NormalizedLedgerEntry[] = []

  for (const entry of entries) {
    const normalized = normalizeLedgerEntry(entry, { zeroTolerance })
    if (Math.abs(normalized.amount) <= zeroTolerance) {
      zeroEntries.push(normalized)
      continue
    }

    const currencyTotals = totalsByCurrency.get(normalized.currency) ?? { debit: 0, credit: 0 }
    if (normalized.side === 'debit') {
      currencyTotals.debit += normalized.amount
      baseDebit += convertToBase(normalized.amount, normalized.currency, { baseCurrency, fxRates })
    } else {
      currencyTotals.credit += normalized.amount
      baseCredit += convertToBase(normalized.amount, normalized.currency, { baseCurrency, fxRates })
    }
    totalsByCurrency.set(normalized.currency, currencyTotals)
  }

  const formattedTotalsByCurrency: LedgerSummary['totalsByCurrency'] = {}
  for (const [currency, totals] of totalsByCurrency.entries()) {
    formattedTotalsByCurrency[currency] = {
      debit: roundAmount(totals.debit, precision),
      credit: roundAmount(totals.credit, precision),
      net: roundAmount(totals.debit - totals.credit, precision),
    }
  }

  const roundedDebit = roundAmount(baseDebit, precision)
  const roundedCredit = roundAmount(baseCredit, precision)
  const imbalance = roundAmount(roundedDebit - roundedCredit, precision)

  if (options.enforceBalance && Math.abs(imbalance) > balanceTolerance) {
    throw new RangeError(`Ledger out of balance by ${imbalance} ${baseCurrency}`)
  }

  return {
    baseCurrency,
    totalsByCurrency: formattedTotalsByCurrency,
    baseTotals: {
      debit: roundedDebit,
      credit: roundedCredit,
      net: roundAmount(roundedDebit - roundedCredit, precision),
    },
    imbalance,
    zeroEntries,
  }
}
