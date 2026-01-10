/**
 * Multi-Currency Utilities
 * 
 * Currency formatting and conversion utilities for Malta (EUR), Canada (CAD), and Rwanda (RWF)
 */

export type SupportedCurrency = 'EUR' | 'CAD' | 'RWF' | 'USD';

export interface CurrencyConfig {
    code: SupportedCurrency;
    symbol: string;
    name: string;
    decimalPlaces: number;
    locale: string;
}

const CURRENCY_CONFIGS: Record<SupportedCurrency, CurrencyConfig> = {
    EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2, locale: 'en-MT' },
    CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2, locale: 'en-CA' },
    RWF: { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', decimalPlaces: 0, locale: 'rw-RW' },
    USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2, locale: 'en-US' },
};

// Approximate exchange rates to USD (for reference only - use real API in production)
const EXCHANGE_RATES_TO_USD: Record<SupportedCurrency, number> = {
    EUR: 1.08,   // 1 EUR = 1.08 USD
    CAD: 0.74,   // 1 CAD = 0.74 USD
    RWF: 0.00077, // 1 RWF = 0.00077 USD (approx)
    USD: 1.0,
};

/**
 * Format amount in specified currency
 */
export function formatCurrency(amount: number, currency: SupportedCurrency): string {
    const config = CURRENCY_CONFIGS[currency];
    return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.code,
        minimumFractionDigits: config.decimalPlaces,
        maximumFractionDigits: config.decimalPlaces,
    }).format(amount);
}

/**
 * Round amount to appropriate decimal places for currency
 */
export function roundForCurrency(amount: number, currency: SupportedCurrency): number {
    const config = CURRENCY_CONFIGS[currency];
    const factor = Math.pow(10, config.decimalPlaces);
    return Math.round(amount * factor) / factor;
}

/**
 * Convert between currencies (approximate - use real API in production)
 */
export function convertCurrency(
    amount: number,
    fromCurrency: SupportedCurrency,
    toCurrency: SupportedCurrency
): { amount: number; exchangeRate: number } {
    if (fromCurrency === toCurrency) {
        return { amount, exchangeRate: 1 };
    }

    // Convert to USD first, then to target currency
    const usdAmount = amount * EXCHANGE_RATES_TO_USD[fromCurrency];
    const targetAmount = usdAmount / EXCHANGE_RATES_TO_USD[toCurrency];
    const exchangeRate = EXCHANGE_RATES_TO_USD[fromCurrency] / EXCHANGE_RATES_TO_USD[toCurrency];

    return {
        amount: roundForCurrency(targetAmount, toCurrency),
        exchangeRate: Math.round(exchangeRate * 10000) / 10000,
    };
}

/**
 * Get currency config
 */
export function getCurrencyConfig(currency: SupportedCurrency): CurrencyConfig {
    return CURRENCY_CONFIGS[currency];
}

// ============================================================================
// JURISDICTION-SPECIFIC THRESHOLD UTILITIES
// ============================================================================

export interface ThresholdCheck {
    threshold: number;
    currency: SupportedCurrency;
    currentAmount: number;
    exceeded: boolean;
    percentageOfThreshold: number;
    warningAt80Percent: boolean;
}

/**
 * Malta VAT thresholds (EUR)
 */
export const MALTA_THRESHOLDS = {
    ARTICLE_10_SERVICES: 30_000,
    ARTICLE_10_GOODS: 35_000,
    ARTICLE_11_DOMESTIC: 35_000,
    ARTICLE_11A_EU_WIDE: 100_000,
    INTRASTAT: 700,
} as const;

/**
 * Canada GST/HST threshold (CAD)
 */
export const CANADA_THRESHOLDS = {
    GST_REGISTRATION: 30_000,  // Over 4 consecutive quarters or single quarter
    ANNUAL_FILER_MAX: 1_500_000,
    QUARTERLY_FILER_MAX: 6_000_000,
} as const;

/**
 * Rwanda VAT thresholds (RWF)
 */
export const RWANDA_THRESHOLDS = {
    VAT_ANNUAL: 20_000_000,
    VAT_QUARTERLY: 5_000_000,
    SMALL_BUSINESS: 12_000_000,
} as const;

/**
 * Check if amount exceeds threshold
 */
export function checkThreshold(
    amount: number,
    threshold: number,
    currency: SupportedCurrency
): ThresholdCheck {
    const percentageOfThreshold = (amount / threshold) * 100;
    return {
        threshold,
        currency,
        currentAmount: amount,
        exceeded: amount >= threshold,
        percentageOfThreshold: Math.round(percentageOfThreshold * 10) / 10,
        warningAt80Percent: percentageOfThreshold >= 80 && percentageOfThreshold < 100,
    };
}

/**
 * Get jurisdiction currency
 */
export function getJurisdictionCurrency(jurisdictionCode: 'MT' | 'CA' | 'RW'): SupportedCurrency {
    const currencies: Record<string, SupportedCurrency> = {
        MT: 'EUR',
        CA: 'CAD',
        RW: 'RWF',
    };
    return currencies[jurisdictionCode];
}
