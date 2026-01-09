/**
 * Trial Balance Types
 * 
 * Type definitions for trial balance import, processing, and mapping.
 */

// ============================================================================
// RAW IMPORT TYPES
// ============================================================================

/**
 * Supported import file formats
 */
export type ImportFormat = 'csv' | 'xlsx' | 'xls' | 'json' | 'quickbooks_iif' | 'sage' | 'xero';

/**
 * Currency information
 */
export interface CurrencyInfo {
    code: string;          // ISO 4217 code (e.g., 'USD', 'EUR')
    symbol: string;        // Display symbol (e.g., '$', '€')
    name: string;          // Full name (e.g., 'US Dollar')
    decimalPlaces: number; // Precision (typically 2)
}

/**
 * Raw account row from imported file
 */
export interface RawAccountRow {
    rowNumber: number;
    columns: Record<string, string | number | null>;
    errors?: string[];
}

/**
 * Column mapping configuration
 */
export interface ColumnMapping {
    sourceColumn: string;
    targetField: TrialBalanceField;
    transformation?: 'none' | 'abs' | 'negate' | 'parse_date' | 'trim' | 'uppercase';
    defaultValue?: string | number;
}

export type TrialBalanceField =
    | 'accountNumber'
    | 'accountName'
    | 'accountType'
    | 'debit'
    | 'credit'
    | 'balance'
    | 'openingBalance'
    | 'closingBalance'
    | 'currency'
    | 'department'
    | 'costCenter'
    | 'notes';

// ============================================================================
// TRIAL BALANCE ACCOUNT
// ============================================================================

/**
 * Account type classification
 */
export type AccountType =
    | 'asset'
    | 'liability'
    | 'equity'
    | 'revenue'
    | 'expense'
    | 'other';

/**
 * Financial statement line item category
 */
export type FSLineItem =
    // Assets
    | 'cash_and_equivalents'
    | 'accounts_receivable'
    | 'inventory'
    | 'prepaid_expenses'
    | 'other_current_assets'
    | 'property_plant_equipment'
    | 'intangible_assets'
    | 'investments'
    | 'other_non_current_assets'
    // Liabilities
    | 'accounts_payable'
    | 'accrued_liabilities'
    | 'deferred_revenue'
    | 'short_term_debt'
    | 'other_current_liabilities'
    | 'long_term_debt'
    | 'deferred_tax_liability'
    | 'other_non_current_liabilities'
    // Equity
    | 'common_stock'
    | 'retained_earnings'
    | 'other_equity'
    // Revenue
    | 'operating_revenue'
    | 'other_income'
    // Expenses
    | 'cost_of_goods_sold'
    | 'selling_general_admin'
    | 'depreciation_amortization'
    | 'interest_expense'
    | 'tax_expense'
    | 'other_expenses'
    // Other
    | 'unmapped';

/**
 * Parsed trial balance account
 */
export interface TrialBalanceAccount {
    id: string;
    accountNumber: string;
    accountName: string;
    accountType: AccountType;

    // Balances
    debit: number;
    credit: number;
    balance: number;           // Net balance (debit - credit or credit - debit based on type)
    openingBalance?: number;
    closingBalance?: number;

    // Prior period
    priorYearBalance?: number;
    variance?: number;
    variancePercent?: number;

    // Classification
    fsLineItem?: FSLineItem;
    fsLineItemConfidence?: number;
    isManuallyMapped: boolean;

    // Hierarchy
    parentAccountId?: string;
    level: number;
    isHeader: boolean;

    // Metadata
    currency: string;
    department?: string;
    costCenter?: string;
    notes?: string;

    // Audit flags
    flags: AccountFlag[];
}

/**
 * Account flags for audit attention
 */
export interface AccountFlag {
    type: 'material' | 'variance' | 'unusual' | 'new_account' | 'risk' | 'adjustment';
    severity: 'low' | 'medium' | 'high';
    message: string;
}

// ============================================================================
// TRIAL BALANCE SUMMARY
// ============================================================================

/**
 * Complete trial balance with all accounts
 */
export interface TrialBalance {
    id: string;
    engagementId: string;
    name: string;

    // Period
    periodStart: Date;
    periodEnd: Date;
    periodType: 'month' | 'quarter' | 'year' | 'custom';

    // Accounts
    accounts: TrialBalanceAccount[];
    totalAccounts: number;

    // Totals
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
    balanceDifference: number;

    // Currency
    presentationCurrency: string;
    foreignCurrencies: string[];
    exchangeRates?: Record<string, number>;

    // Import metadata
    sourceFile: string;
    sourceFormat: ImportFormat;
    importedAt: Date;
    importedBy: string;

    // Mapping status
    mappingStatus: 'pending' | 'partial' | 'complete';
    mappedAccountsCount: number;
    unmappedAccountsCount: number;

    // Comparison
    priorPeriodId?: string;
    hasPriorPeriod: boolean;
}

// ============================================================================
// LEAD SCHEDULE TYPES
// ============================================================================

/**
 * Lead schedule grouping accounts by FS line item
 */
export interface LeadSchedule {
    id: string;
    trialBalanceId: string;
    fsLineItem: FSLineItem;
    displayName: string;

    // Accounts in this schedule
    accounts: TrialBalanceAccount[];
    accountCount: number;

    // Balances
    currentPeriodBalance: number;
    priorPeriodBalance?: number;
    variance?: number;
    variancePercent?: number;

    // Adjustments
    adjustments: JournalEntry[];
    adjustedBalance: number;

    // Workpaper link
    workpaperId?: string;
    workpaperRef?: string;

    // Status
    reviewStatus: 'not_started' | 'in_progress' | 'reviewed' | 'approved';
    reviewedBy?: string;
    reviewedAt?: Date;
}

/**
 * Journal entry for adjustments
 */
export interface JournalEntry {
    id: string;
    entryNumber: string;
    date: Date;
    description: string;

    // Lines
    lines: JournalEntryLine[];
    totalDebit: number;
    totalCredit: number;

    // Classification
    type: 'proposed' | 'passed' | 'correcting' | 'reclassifying';
    status: 'pending' | 'approved' | 'rejected' | 'posted';

    // Metadata
    createdBy: string;
    createdAt: Date;
    approvedBy?: string;
    approvedAt?: Date;
}

/**
 * Single line in a journal entry
 */
export interface JournalEntryLine {
    accountId: string;
    accountNumber: string;
    accountName: string;
    debit: number;
    credit: number;
    description?: string;
}

// ============================================================================
// IMPORT RESULT TYPES
// ============================================================================

/**
 * Result of trial balance import
 */
export interface ImportResult {
    success: boolean;
    trialBalance?: TrialBalance;

    // Mapping
    columnMappings: ColumnMapping[];
    mappingConfidence: number;
    suggestedMappings: ColumnMapping[];

    // Validation
    errors: ImportError[];
    warnings: ImportWarning[];

    // Stats
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    processingTimeMs: number;
}

/**
 * Import error
 */
export interface ImportError {
    row?: number;
    column?: string;
    code: string;
    message: string;
    severity: 'error' | 'fatal';
}

/**
 * Import warning
 */
export interface ImportWarning {
    row?: number;
    column?: string;
    code: string;
    message: string;
}

// ============================================================================
// ACCOUNT MAPPING TYPES
// ============================================================================

/**
 * Mapping prediction from ML model
 */
export interface MappingPrediction {
    accountId: string;
    predictions: {
        fsLineItem: FSLineItem;
        confidence: number;
        reasoning: string;
    }[];
    suggestedLineItem: FSLineItem;
    requiresReview: boolean;
}

/**
 * Mapping rule for pattern-based classification
 */
export interface MappingRule {
    id: string;
    name: string;
    priority: number;

    // Matching conditions
    conditions: MappingCondition[];
    matchType: 'all' | 'any';

    // Target mapping
    targetLineItem: FSLineItem;
    targetAccountType: AccountType;

    // Usage stats
    matchCount: number;
    lastUsed?: Date;
    isSystemRule: boolean;
}

/**
 * Single condition in a mapping rule
 */
export interface MappingCondition {
    field: 'accountNumber' | 'accountName' | 'accountType' | 'balance';
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'greaterThan' | 'lessThan';
    value: string | number;
    caseSensitive?: boolean;
}
