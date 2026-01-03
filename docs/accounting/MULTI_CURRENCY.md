# Multi-Currency Support Documentation

> **P2-3 FIX: Document multi-currency handling and rounding rules**

---

## Overview

The Prisma Glow platform supports multi-currency operations for international accounting and tax compliance.

---

## Supported Currencies

| Currency | Code | Decimal Places | Rounding Rule |
|----------|------|----------------|---------------|
| Euro | EUR | 2 | Half-up |
| US Dollar | USD | 2 | Half-up |
| British Pound | GBP | 2 | Half-up |
| Rwandan Franc | RWF | 0 | Nearest integer |
| Swiss Franc | CHF | 2 | 0.05 rounding (Banker's) |

---

## Rounding Rules

### Standard Half-Up Rounding (EUR, USD, GBP)

```typescript
// Round to 2 decimal places, .5 rounds up
function roundHalfUp(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

// Examples:
// 10.245 → 10.25
// 10.244 → 10.24
// 10.255 → 10.26
```

### Zero Decimal Rounding (RWF)

```typescript
// Rwandan Franc has no decimal places
function roundRWF(value: number): number {
  return Math.round(value);
}

// Examples:
// 1500.4 → 1500
// 1500.5 → 1501
```

### Swiss Rounding (CHF)

```typescript
// Swiss Franc rounds to nearest 0.05
function roundCHF(value: number): number {
  return Math.round(value * 20) / 20;
}

// Examples:
// 10.42 → 10.40
// 10.43 → 10.45
// 10.47 → 10.45
// 10.48 → 10.50
```

---

## Exchange Rates

### Rate Sources

| Priority | Source | Update Frequency |
|----------|--------|------------------|
| 1 | European Central Bank (ECB) | Daily |
| 2 | National Bank of Rwanda (BNR) | Daily |
| 3 | Fallback: Open Exchange Rates | Hourly |

### Rate Storage

Exchange rates are stored in the `exchange_rates` table:

```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY,
  base_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(18, 8) NOT NULL,
  rate_date DATE NOT NULL,
  source VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_currency, target_currency, rate_date)
);
```

---

## Currency Conversion

### Conversion Formula

```
target_amount = source_amount × exchange_rate
```

### Triangulation (Cross-Rates)

When direct rate unavailable:
```
EUR/RWF = EUR/USD × USD/RWF
```

### Conversion Timing

| Transaction Type | Rate Timing |
|-----------------|-------------|
| Invoice | Issue date rate |
| Payment | Payment date rate |
| Month-end | Last business day rate |
| Year-end | Dec 31 rate |

---

## Database Schema

### Monetary Columns

All monetary amounts stored with:
- **DECIMAL(19, 4)** - Provides sufficient precision
- **Currency code** - 3-letter ISO code
- **Original amount** (optional) - For audit trail

```sql
-- Example: journal_entries table
amount_local DECIMAL(19, 4) NOT NULL,
currency_code VARCHAR(3) NOT NULL DEFAULT 'EUR',
amount_original DECIMAL(19, 4), -- in foreign currency
exchange_rate DECIMAL(18, 8),   -- rate used
```

---

## Display Formatting

### Locale-Aware Formatting

```typescript
function formatCurrency(
  amount: number,
  currency: string,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Examples:
// formatCurrency(1234.56, 'EUR', 'de-DE') → "1.234,56 €"
// formatCurrency(1234.56, 'USD', 'en-US') → "$1,234.56"
// formatCurrency(1500, 'RWF', 'rw-RW')    → "RWF 1,500"
```

---

## Rounding Error Handling

### Tolerance Threshold

- Amount tolerance: ±0.01 (1 cent equivalent)
- Percentage tolerance: ±0.001% for large amounts

### Discrepancy Resolution

```typescript
const TOLERANCE = 0.01;

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE;
}
```

---

## Testing

### Currency Test Cases

```typescript
describe('Currency Rounding', () => {
  test('EUR rounds half-up', () => {
    expect(roundCurrency(10.245, 'EUR')).toBe(10.25);
  });
  
  test('RWF rounds to integer', () => {
    expect(roundCurrency(1500.6, 'RWF')).toBe(1501);
  });
  
  test('CHF rounds to 0.05', () => {
    expect(roundCurrency(10.42, 'CHF')).toBe(10.40);
  });
});
```

---

## Related Documents

- `ARCHITECTURE.md` - System architecture
- `docs/accounting/CHART_OF_ACCOUNTS.md` - Account structure
- `docs/tax/VAT_RULES.md` - VAT calculations
