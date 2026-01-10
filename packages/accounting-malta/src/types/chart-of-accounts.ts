/**
 * Chart of Accounts Types
 * 
 * Type definitions for Malta Chart of Accounts structure.
 * Malta has no mandatory COA format, but must support GAPSME/IFRS mapping.
 */

// ============================================================================
// ACCOUNT TYPES
// ============================================================================

/**
 * Standard account types following double-entry principles.
 */
export type AccountType =
    | 'ASSET'
    | 'LIABILITY'
    | 'EQUITY'
    | 'REVENUE'
    | 'EXPENSE';

/**
 * Account subcategories for detailed classification.
 */
export type AccountCategory =
    // Assets
    | 'NON_CURRENT_ASSETS'
    | 'CURRENT_ASSETS'
    | 'PROPERTY_PLANT_EQUIPMENT'
    | 'INTANGIBLE_ASSETS'
    | 'INVESTMENT_PROPERTY'
    | 'FINANCIAL_INVESTMENTS'
    | 'DEFERRED_TAX_ASSETS'
    | 'INVENTORY'
    | 'TRADE_RECEIVABLES'
    | 'OTHER_RECEIVABLES'
    | 'CASH_AND_BANK'
    | 'PREPAYMENTS'
    // Equity
    | 'SHARE_CAPITAL'
    | 'SHARE_PREMIUM'
    | 'REVALUATION_RESERVE'
    | 'RETAINED_EARNINGS'
    | 'OTHER_RESERVES'
    // Liabilities
    | 'NON_CURRENT_LIABILITIES'
    | 'CURRENT_LIABILITIES'
    | 'LONG_TERM_BORROWINGS'
    | 'DEFERRED_TAX_LIABILITIES'
    | 'PROVISIONS'
    | 'LEASE_LIABILITIES'
    | 'TRADE_PAYABLES'
    | 'OTHER_PAYABLES'
    | 'TAX_LIABILITIES'
    | 'SHORT_TERM_BORROWINGS'
    | 'ACCRUALS'
    // Revenue
    | 'SALES_REVENUE'
    | 'SERVICE_REVENUE'
    | 'OTHER_INCOME'
    | 'FINANCE_INCOME'
    // Expenses
    | 'COST_OF_SALES'
    | 'DIRECT_MATERIALS'
    | 'DIRECT_LABOR'
    | 'PRODUCTION_OVERHEADS'
    | 'ADMINISTRATIVE_EXPENSES'
    | 'DISTRIBUTION_EXPENSES'
    | 'FINANCE_COSTS'
    | 'TAX_EXPENSE';

// ============================================================================
// CHART OF ACCOUNTS STRUCTURE
// ============================================================================

/**
 * Individual account in the Chart of Accounts.
 */
export interface Account {
    /** Unique identifier */
    id: string;
    /** Company this account belongs to */
    companyId: string;
    /** Account number (4-8 digits, flexible format) */
    accountNumber: string;
    /** Account name */
    accountName: string;
    /** Primary account type */
    accountType: AccountType;
    /** Account category for grouping */
    category: AccountCategory;
    /** Optional subcategory */
    subcategory?: string;
    /** GAPSME balance sheet/P&L line item mapping */
    gapsmeMapping: string;
    /** IFRS standard mapping (e.g., IAS 16, IFRS 9) */
    ifrsMapping: string;
    /** Current debit balance */
    debitBalance: number;
    /** Current credit balance */
    creditBalance: number;
    /** Whether account is active */
    isActive: boolean;
    /** Parent account for hierarchical COA */
    parentAccountId?: string;
    /** Normal balance side */
    normalBalance: 'DEBIT' | 'CREDIT';
}

/**
 * Account range definition for COA structure.
 */
export interface AccountRange {
    start: string;
    end: string;
    description: string;
}

/**
 * Chart of Accounts template structure.
 */
export interface ChartOfAccountsTemplate {
    name: string;
    description: string;
    version: string;
    framework: 'GAPSME' | 'IFRS' | 'BOTH';
    accounts: Omit<Account, 'id' | 'companyId' | 'debitBalance' | 'creditBalance'>[];
}

// ============================================================================
// MALTA STANDARD COA RANGES
// ============================================================================

/**
 * Standard Malta COA account number ranges.
 * Follows EU best practices with flexible structure.
 */
export const MALTA_COA_RANGES = {
    // Assets (1000-1999)
    NON_CURRENT_ASSETS: { start: '1000', end: '1499' },
    PROPERTY_PLANT_EQUIPMENT: { start: '1000', end: '1099' },
    INTANGIBLE_ASSETS: { start: '1100', end: '1149' },
    INVESTMENT_PROPERTY: { start: '1150', end: '1179' },
    FINANCIAL_INVESTMENTS: { start: '1180', end: '1249' },
    DEFERRED_TAX_ASSETS: { start: '1250', end: '1269' },
    CURRENT_ASSETS: { start: '1500', end: '1999' },
    INVENTORY: { start: '1500', end: '1549' },
    TRADE_RECEIVABLES: { start: '1550', end: '1599' },
    OTHER_RECEIVABLES: { start: '1600', end: '1649' },
    CASH_AND_BANK: { start: '1650', end: '1699' },
    PREPAYMENTS: { start: '1700', end: '1749' },

    // Equity & Liabilities (2000-2999)
    EQUITY: { start: '2000', end: '2299' },
    SHARE_CAPITAL: { start: '2000', end: '2049' },
    SHARE_PREMIUM: { start: '2050', end: '2069' },
    REVALUATION_RESERVE: { start: '2070', end: '2089' },
    RETAINED_EARNINGS: { start: '2090', end: '2149' },
    OTHER_RESERVES: { start: '2150', end: '2199' },
    NON_CURRENT_LIABILITIES: { start: '2300', end: '2599' },
    LONG_TERM_BORROWINGS: { start: '2300', end: '2349' },
    DEFERRED_TAX_LIABILITIES: { start: '2350', end: '2369' },
    PROVISIONS: { start: '2370', end: '2399' },
    LEASE_LIABILITIES: { start: '2400', end: '2429' },
    CURRENT_LIABILITIES: { start: '2600', end: '2999' },
    TRADE_PAYABLES: { start: '2600', end: '2649' },
    OTHER_PAYABLES: { start: '2650', end: '2699' },
    TAX_LIABILITIES: { start: '2700', end: '2749' },
    SHORT_TERM_BORROWINGS: { start: '2750', end: '2799' },
    ACCRUALS: { start: '2800', end: '2849' },

    // Revenue (3000-3999)
    SALES_REVENUE: { start: '3000', end: '3199' },
    SERVICE_REVENUE: { start: '3200', end: '3399' },
    OTHER_INCOME: { start: '3400', end: '3599' },
    FINANCE_INCOME: { start: '3600', end: '3699' },

    // Expenses (4000-9999)
    COST_OF_SALES: { start: '4000', end: '4999' },
    DIRECT_MATERIALS: { start: '4000', end: '4199' },
    DIRECT_LABOR: { start: '4200', end: '4399' },
    PRODUCTION_OVERHEADS: { start: '4400', end: '4599' },
    ADMINISTRATIVE_EXPENSES: { start: '5000', end: '5999' },
    DISTRIBUTION_EXPENSES: { start: '6000', end: '6999' },
    FINANCE_COSTS: { start: '7000', end: '7499' },
    TAX_EXPENSE: { start: '7500', end: '7999' },
} as const;

/**
 * GAPSME balance sheet line item mappings.
 */
export const GAPSME_MAPPINGS: Record<AccountCategory, string> = {
    // Assets
    NON_CURRENT_ASSETS: 'Non-current assets',
    CURRENT_ASSETS: 'Current assets',
    PROPERTY_PLANT_EQUIPMENT: 'Non-current assets - Property, plant and equipment',
    INTANGIBLE_ASSETS: 'Non-current assets - Intangible assets',
    INVESTMENT_PROPERTY: 'Non-current assets - Investment property',
    FINANCIAL_INVESTMENTS: 'Non-current assets - Financial investments',
    DEFERRED_TAX_ASSETS: 'Non-current assets - Deferred tax assets',
    INVENTORY: 'Current assets - Inventories',
    TRADE_RECEIVABLES: 'Current assets - Trade and other receivables',
    OTHER_RECEIVABLES: 'Current assets - Other receivables',
    CASH_AND_BANK: 'Current assets - Cash and cash equivalents',
    PREPAYMENTS: 'Current assets - Prepayments',
    // Equity
    SHARE_CAPITAL: 'Equity - Issued capital',
    SHARE_PREMIUM: 'Equity - Share premium',
    REVALUATION_RESERVE: 'Equity - Revaluation reserve',
    RETAINED_EARNINGS: 'Equity - Retained earnings',
    OTHER_RESERVES: 'Equity - Other reserves',
    // Liabilities
    NON_CURRENT_LIABILITIES: 'Non-current liabilities',
    CURRENT_LIABILITIES: 'Current liabilities',
    LONG_TERM_BORROWINGS: 'Non-current liabilities - Borrowings',
    DEFERRED_TAX_LIABILITIES: 'Non-current liabilities - Deferred tax liabilities',
    PROVISIONS: 'Non-current liabilities - Provisions',
    LEASE_LIABILITIES: 'Non-current liabilities - Lease liabilities',
    TRADE_PAYABLES: 'Current liabilities - Trade and other payables',
    OTHER_PAYABLES: 'Current liabilities - Other payables',
    TAX_LIABILITIES: 'Current liabilities - Tax liabilities',
    SHORT_TERM_BORROWINGS: 'Current liabilities - Short-term borrowings',
    ACCRUALS: 'Current liabilities - Accruals',
    // Revenue & Expenses
    SALES_REVENUE: 'Revenue',
    SERVICE_REVENUE: 'Revenue',
    OTHER_INCOME: 'Other income',
    FINANCE_INCOME: 'Finance income',
    COST_OF_SALES: 'Cost of sales',
    DIRECT_MATERIALS: 'Cost of sales - Materials',
    DIRECT_LABOR: 'Cost of sales - Labour',
    PRODUCTION_OVERHEADS: 'Cost of sales - Overheads',
    ADMINISTRATIVE_EXPENSES: 'Administrative expenses',
    DISTRIBUTION_EXPENSES: 'Distribution costs',
    FINANCE_COSTS: 'Finance costs',
    TAX_EXPENSE: 'Tax expense',
};

/**
 * IFRS standard mappings.
 */
export const IFRS_MAPPINGS: Record<AccountCategory, string> = {
    // Assets
    NON_CURRENT_ASSETS: 'IAS 1 - Non-current assets',
    CURRENT_ASSETS: 'IAS 1 - Current assets',
    PROPERTY_PLANT_EQUIPMENT: 'IAS 16 - Property, Plant and Equipment',
    INTANGIBLE_ASSETS: 'IAS 38 - Intangible Assets',
    INVESTMENT_PROPERTY: 'IAS 40 - Investment Property',
    FINANCIAL_INVESTMENTS: 'IFRS 9 - Financial Assets',
    DEFERRED_TAX_ASSETS: 'IAS 12 - Deferred Tax Assets',
    INVENTORY: 'IAS 2 - Inventories',
    TRADE_RECEIVABLES: 'IFRS 9 - Financial Assets',
    OTHER_RECEIVABLES: 'IFRS 9 - Financial Assets',
    CASH_AND_BANK: 'IAS 7 - Cash and Cash Equivalents',
    PREPAYMENTS: 'IAS 1 - Prepayments',
    // Equity
    SHARE_CAPITAL: 'IAS 1 - Share Capital',
    SHARE_PREMIUM: 'IAS 1 - Share Premium',
    REVALUATION_RESERVE: 'IAS 16 - Revaluation Surplus',
    RETAINED_EARNINGS: 'IAS 1 - Retained Earnings',
    OTHER_RESERVES: 'IAS 1 - Other Reserves',
    // Liabilities
    NON_CURRENT_LIABILITIES: 'IAS 1 - Non-current liabilities',
    CURRENT_LIABILITIES: 'IAS 1 - Current liabilities',
    LONG_TERM_BORROWINGS: 'IFRS 9 - Financial Liabilities',
    DEFERRED_TAX_LIABILITIES: 'IAS 12 - Deferred Tax Liabilities',
    PROVISIONS: 'IAS 37 - Provisions',
    LEASE_LIABILITIES: 'IFRS 16 - Lease Liabilities',
    TRADE_PAYABLES: 'IFRS 9 - Financial Liabilities',
    OTHER_PAYABLES: 'IFRS 9 - Financial Liabilities',
    TAX_LIABILITIES: 'IAS 12 - Current Tax',
    SHORT_TERM_BORROWINGS: 'IFRS 9 - Financial Liabilities',
    ACCRUALS: 'IAS 37 - Accruals',
    // Revenue & Expenses
    SALES_REVENUE: 'IFRS 15 - Revenue from Contracts with Customers',
    SERVICE_REVENUE: 'IFRS 15 - Revenue from Contracts with Customers',
    OTHER_INCOME: 'IAS 1 - Other Income',
    FINANCE_INCOME: 'IFRS 9 - Finance Income',
    COST_OF_SALES: 'IAS 2 - Cost of Sales',
    DIRECT_MATERIALS: 'IAS 2 - Cost of Sales',
    DIRECT_LABOR: 'IAS 19 - Employee Benefits',
    PRODUCTION_OVERHEADS: 'IAS 2 - Production Overheads',
    ADMINISTRATIVE_EXPENSES: 'IAS 1 - Administrative Expenses',
    DISTRIBUTION_EXPENSES: 'IAS 1 - Distribution Costs',
    FINANCE_COSTS: 'IFRS 9 - Finance Costs',
    TAX_EXPENSE: 'IAS 12 - Income Tax Expense',
};
