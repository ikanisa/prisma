/**
 * Financial Statement Types
 * 
 * Type definitions for balance sheet, income statement, cash flow statement,
 * and financial notes per GAPSME and IFRS requirements.
 */

// ============================================================================
// BALANCE SHEET
// ============================================================================

/**
 * Balance sheet header information.
 */
export interface StatementHeader {
    companyName: string;
    registrationNumber?: string;
    period: string;
    framework: 'GAPSME' | 'IFRS';
    currency: string;
}

/**
 * Non-current assets section.
 */
export interface NonCurrentAssets {
    propertyPlantEquipment: number;
    intangibleAssets: number;
    investmentProperty: number;
    financialInvestments: number;
    deferredTaxAssets: number;
    total: number;
}

/**
 * Current assets section.
 */
export interface CurrentAssets {
    inventories: number;
    tradeReceivables: number;
    otherReceivables: number;
    cashAndCashEquivalents: number;
    prepayments: number;
    total: number;
}

/**
 * Equity section.
 */
export interface Equity {
    issuedCapital: number;
    sharePremium: number;
    revaluationReserve: number;
    retainedEarnings: number;
    otherReserves: number;
    total: number;
}

/**
 * Non-current liabilities section.
 */
export interface NonCurrentLiabilities {
    longTermBorrowings: number;
    deferredTaxLiabilities: number;
    provisions: number;
    leaseLiabilities: number;
    total: number;
}

/**
 * Current liabilities section.
 */
export interface CurrentLiabilities {
    tradePayables: number;
    otherPayables: number;
    currentTaxLiabilities: number;
    shortTermBorrowings: number;
    accruals: number;
    provisions: number;
    total: number;
}

/**
 * Complete balance sheet.
 */
export interface BalanceSheet {
    header: StatementHeader;
    nonCurrentAssets: NonCurrentAssets;
    currentAssets: CurrentAssets;
    totalAssets: number;
    equity: Equity;
    nonCurrentLiabilities: NonCurrentLiabilities;
    currentLiabilities: CurrentLiabilities;
    totalLiabilities: number;
    totalEquityAndLiabilities: number;
    /** Prior year comparative figures */
    comparative?: Omit<BalanceSheet, 'header' | 'comparative'>;
}

// ============================================================================
// INCOME STATEMENT (PROFIT & LOSS)
// ============================================================================

/**
 * Complete income statement (cost of sales method per GAPSME).
 */
export interface IncomeStatement {
    header: StatementHeader;
    revenue: number;
    costOfSales: number;
    grossProfit: number;
    distributionCosts: number;
    administrativeExpenses: number;
    otherOperatingIncome?: number;
    otherOperatingExpenses?: number;
    operatingProfit: number;
    financeIncome: number;
    financeCosts: number;
    profitBeforeTax: number;
    taxExpense: number;
    profitForTheYear: number;
    /** Prior year comparative figures */
    comparative?: Omit<IncomeStatement, 'header' | 'comparative'>;
}

// ============================================================================
// CASH FLOW STATEMENT
// ============================================================================

/**
 * Operating activities section (indirect method).
 */
export interface OperatingActivities {
    profitBeforeTax: number;
    adjustments: {
        depreciation: number;
        amortization: number;
        lossOnDisposal: number;
        financeIncome: number;
        financeCosts: number;
        impairment?: number;
        provisions?: number;
    };
    workingCapitalChanges: {
        inventories: number;
        receivables: number;
        payables: number;
    };
    taxPaid: number;
    netCashFromOperations: number;
}

/**
 * Investing activities section.
 */
export interface InvestingActivities {
    purchasePPE: number;
    salePPE: number;
    purchaseInvestments: number;
    saleInvestments: number;
    interestReceived: number;
    dividendsReceived?: number;
    netCashFromInvesting: number;
}

/**
 * Financing activities section.
 */
export interface FinancingActivities {
    proceedsFromBorrowings: number;
    repaymentOfBorrowings: number;
    interestPaid: number;
    dividendsPaid: number;
    leasePayments?: number;
    netCashFromFinancing: number;
}

/**
 * Complete cash flow statement.
 */
export interface CashFlowStatement {
    header: StatementHeader & { method: 'INDIRECT' | 'DIRECT' };
    operatingActivities: OperatingActivities;
    investingActivities: InvestingActivities;
    financingActivities: FinancingActivities;
    netIncreaseInCash: number;
    cashAtBeginning: number;
    cashAtEnd: number;
    /** Prior year comparative */
    comparative?: Omit<CashFlowStatement, 'header' | 'comparative'>;
}

// ============================================================================
// STATEMENT OF CHANGES IN EQUITY
// ============================================================================

/**
 * Equity movement for a single component.
 */
export interface EquityMovement {
    openingBalance: number;
    profitForYear: number;
    dividends: number;
    revaluationSurplus: number;
    otherMovements: number;
    closingBalance: number;
}

/**
 * Complete statement of changes in equity.
 */
export interface StatementOfChangesInEquity {
    header: StatementHeader;
    shareCapital: EquityMovement;
    sharePremium: EquityMovement;
    revaluationReserve: EquityMovement;
    retainedEarnings: EquityMovement;
    otherReserves: EquityMovement;
    totalEquity: EquityMovement;
}

// ============================================================================
// FINANCIAL NOTES
// ============================================================================

/**
 * Individual financial statement note.
 */
export interface FinancialNote {
    noteNumber: number;
    noteTitle: string;
    content: string;
    tables?: NoteTable[];
}

/**
 * Table within a financial note.
 */
export interface NoteTable {
    title: string;
    headers: string[];
    rows: (string | number)[][];
    totals?: (string | number)[];
}

/**
 * PPE movement schedule for notes.
 */
export interface PPEMovement {
    categories: {
        name: string;
        cost: number;
        accumulatedDepreciation: number;
        netBookValue: number;
    }[];
    totalCost: number;
    totalAccumulated: number;
    totalNet: number;
    additions: number;
    disposals: number;
    depreciationCharge: number;
}

// ============================================================================
// COMPLETE FINANCIAL STATEMENTS PACKAGE
// ============================================================================

/**
 * Complete set of financial statements for filing.
 */
export interface FinancialStatements {
    company: {
        id: string;
        name: string;
        registrationNumber: string;
    };
    periodStart: Date;
    periodEnd: Date;
    framework: 'GAPSME' | 'IFRS';
    balanceSheet: BalanceSheet;
    incomeStatement: IncomeStatement;
    cashFlowStatement?: CashFlowStatement;
    equityChangesStatement?: StatementOfChangesInEquity;
    notes: FinancialNote[];
    directorsReport?: string;
    auditRequired: boolean;
    auditorsReport?: string;
    auditExemptionDeclaration?: string;
}
