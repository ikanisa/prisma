/**
 * Rwanda Financial Reporting Agent
 * 
 * Generates IFRS-compliant financial statements:
 * - Statement of Financial Position (Balance Sheet)
 * - Statement of Comprehensive Income (Income Statement)
 * - Statement of Changes in Equity
 * - Statement of Cash Flows (future)
 * 
 * Per ICPAR requirements and IAS 1 Presentation of Financial Statements.
 * 
 * @package @prisma/accounting-rwanda
 */

import type {
    RwandaAccountingAgent,
    AgentType,
    AutonomyLevel,
    AgentContext,
    AgentResponse,
} from '../../core/base-agent.js';
import { determineReviewRequirement } from '../../core/base-agent.js';
import type { RwandaAccountingFramework } from '../../types/index.js';

// ============================================================================
// FINANCIAL STATEMENT TYPES
// ============================================================================

/**
 * Trial balance input for financial statement generation.
 */
export interface TrialBalanceEntry {
    accountCode: string;
    accountName: string;
    accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    debit: number;
    credit: number;
    balance: number;  // Debit positive, Credit negative for assets/expenses
}

/**
 * Balance Sheet (Statement of Financial Position).
 */
export interface BalanceSheet {
    asOfDate: Date;
    entityName: string;
    currency: string;

    // Non-current Assets
    nonCurrentAssets: {
        propertyPlantEquipment: number;
        intangibleAssets: number;
        investments: number;
        deferredTaxAssets: number;
        otherNonCurrentAssets: number;
        total: number;
    };

    // Current Assets
    currentAssets: {
        inventories: number;
        tradeReceivables: number;
        otherReceivables: number;
        prepayments: number;
        cashAndEquivalents: number;
        total: number;
    };

    totalAssets: number;

    // Equity
    equity: {
        shareCapital: number;
        sharePremium: number;
        retainedEarnings: number;
        otherReserves: number;
        total: number;
    };

    // Non-current Liabilities
    nonCurrentLiabilities: {
        longTermBorrowings: number;
        deferredTaxLiabilities: number;
        provisions: number;
        otherNonCurrentLiabilities: number;
        total: number;
    };

    // Current Liabilities
    currentLiabilities: {
        tradePayables: number;
        taxPayables: number;
        rssbPayables: number;
        shortTermBorrowings: number;
        accruedExpenses: number;
        otherCurrentLiabilities: number;
        total: number;
    };

    totalLiabilities: number;
    totalEquityAndLiabilities: number;

    // Validation
    isBalanced: boolean;
}

/**
 * Income Statement (Statement of Comprehensive Income).
 */
export interface IncomeStatement {
    periodStart: Date;
    periodEnd: Date;
    entityName: string;
    currency: string;

    // Revenue
    revenue: {
        salesOfGoods: number;
        servicesRendered: number;
        otherIncome: number;
        total: number;
    };

    // Cost of Sales
    costOfSales: {
        directMaterials: number;
        directLabor: number;
        manufacturingOverhead: number;
        total: number;
    };

    grossProfit: number;
    grossProfitMargin: number;

    // Operating Expenses
    operatingExpenses: {
        salariesAndWages: number;
        rssbContributions: number;
        rentAndUtilities: number;
        depreciation: number;
        amortization: number;
        professionalFees: number;
        marketingAndAdvertising: number;
        officeExpenses: number;
        otherOperatingExpenses: number;
        total: number;
    };

    operatingProfit: number;
    operatingProfitMargin: number;

    // Finance
    financeIncome: number;
    financeCosts: number;
    netFinanceCosts: number;

    profitBeforeTax: number;

    // Tax
    incomeTaxExpense: number;
    effectiveTaxRate: number;

    profitForThePeriod: number;
    netProfitMargin: number;

    // Other Comprehensive Income (OCI)
    otherComprehensiveIncome: {
        foreignCurrencyTranslation: number;
        revaluationSurplus: number;
        actuarialGainsLosses: number;
        total: number;
    };

    totalComprehensiveIncome: number;
}

/**
 * Statement of Changes in Equity.
 */
export interface ChangesInEquity {
    periodStart: Date;
    periodEnd: Date;
    entityName: string;

    openingBalance: {
        shareCapital: number;
        sharePremium: number;
        retainedEarnings: number;
        otherReserves: number;
        total: number;
    };

    movements: {
        profitForPeriod: number;
        otherComprehensiveIncome: number;
        dividendsDeclared: number;
        shareCapitalIssued: number;
        transferToReserves: number;
    };

    closingBalance: {
        shareCapital: number;
        sharePremium: number;
        retainedEarnings: number;
        otherReserves: number;
        total: number;
    };
}

// ============================================================================
// ACCOUNT MAPPINGS
// ============================================================================

/**
 * Account code ranges for classification.
 */
const ACCOUNT_CLASSIFICATIONS = {
    // Assets (1xxx)
    CASH: ['1111', '1112', '1113'],
    RECEIVABLES: ['1121', '1122', '1123', '1124'],
    INVENTORY: ['1131', '1132', '1133'],
    PREPAYMENTS: ['1141', '1142'],
    PPE: ['1211', '1212', '1213', '1214', '1215', '1216'],
    ACCUMULATED_DEPRECIATION: ['1219'],
    INTANGIBLES: ['1221', '1222'],
    INVESTMENTS: ['1231', '1232'],

    // Liabilities (2xxx)
    PAYABLES: ['2111', '2112'],
    ACCRUED_EXPENSES: ['2121', '2122'],
    VAT_PAYABLE: ['2131'],
    TAX_PAYABLE: ['2133', '2134'],
    RSSB_PAYABLE: ['2141', '2142', '2143', '2144'],
    SHORT_TERM_LOANS: ['2211'],
    LONG_TERM_LOANS: ['2311', '2312'],

    // Equity (3xxx)
    SHARE_CAPITAL: ['3110'],
    SHARE_PREMIUM: ['3120'],
    RETAINED_EARNINGS: ['3210'],
    RESERVES: ['3310', '3320'],

    // Revenue (4xxx)
    SALES_GOODS: ['4110', '4120'],
    SERVICES: ['4150'],
    OTHER_INCOME: ['4910', '4920'],

    // Expenses (5xxx)
    COST_OF_SALES: ['5110', '5120', '5130'],
    SALARIES: ['5210', '5211', '5212'],
    RSSB_EXPENSE: ['5220', '5221', '5222'],
    RENT: ['5310'],
    UTILITIES: ['5320'],
    DEPRECIATION: ['5420'],
    AMORTIZATION: ['5430'],
    PROFESSIONAL_FEES: ['5510'],
    MARKETING: ['5610'],
    OFFICE: ['5370', '5380'],
    FINANCE_COSTS: ['5710', '5720'],
} as const;

// ============================================================================
// FINANCIAL REPORTING AGENT
// ============================================================================

/**
 * Rwanda Financial Reporting Agent.
 * 
 * Generates IFRS-compliant financial statements.
 */
export class FinancialReportingAgent implements RwandaAccountingAgent {
    private static instance_: FinancialReportingAgent | null = null;

    readonly agentId = 'rwanda-financial-reporting-agent';
    readonly name = 'Rwanda Financial Reporting Agent';
    readonly version = '1.0.0';
    readonly agentType: AgentType = 'FINANCIAL_REPORTING';
    readonly capabilities = [
        'Generate IFRS-compliant Balance Sheet',
        'Generate Income Statement (Comprehensive Income)',
        'Generate Statement of Changes in Equity',
        'Calculate financial ratios',
        'Validate account balances',
        'IAS 1 presentation compliance',
    ];
    readonly framework: RwandaAccountingFramework | 'ALL' = 'ALL';
    readonly autonomyLevel: AutonomyLevel = 3;
    readonly supportedCurrencies = ['RWF', 'USD', 'EUR'];

    private constructor() { }

    /**
     * Get singleton instance.
     */
    static instance(): FinancialReportingAgent {
        if (!FinancialReportingAgent.instance_) {
            FinancialReportingAgent.instance_ = new FinancialReportingAgent();
        }
        return FinancialReportingAgent.instance_;
    }

    /**
     * Generate Balance Sheet from trial balance.
     */
    async generateBalanceSheet(
        trialBalance: TrialBalanceEntry[],
        asOfDate: Date,
        context: AgentContext
    ): Promise<AgentResponse<BalanceSheet>> {
        const startTime = Date.now();

        try {
            // Classify accounts
            const classified = this.classifyAccounts(trialBalance);

            // Build non-current assets
            const nonCurrentAssets = {
                propertyPlantEquipment: this.sumAccounts(classified, 'PPE') -
                    this.sumAccounts(classified, 'ACCUMULATED_DEPRECIATION'),
                intangibleAssets: this.sumAccounts(classified, 'INTANGIBLES'),
                investments: this.sumAccounts(classified, 'INVESTMENTS'),
                deferredTaxAssets: 0,  // Would need separate classification
                otherNonCurrentAssets: 0,
                total: 0,
            };
            nonCurrentAssets.total = nonCurrentAssets.propertyPlantEquipment +
                nonCurrentAssets.intangibleAssets + nonCurrentAssets.investments +
                nonCurrentAssets.deferredTaxAssets + nonCurrentAssets.otherNonCurrentAssets;

            // Build current assets
            const currentAssets = {
                inventories: this.sumAccounts(classified, 'INVENTORY'),
                tradeReceivables: this.sumAccounts(classified, 'RECEIVABLES'),
                otherReceivables: 0,
                prepayments: this.sumAccounts(classified, 'PREPAYMENTS'),
                cashAndEquivalents: this.sumAccounts(classified, 'CASH'),
                total: 0,
            };
            currentAssets.total = currentAssets.inventories + currentAssets.tradeReceivables +
                currentAssets.otherReceivables + currentAssets.prepayments +
                currentAssets.cashAndEquivalents;

            const totalAssets = nonCurrentAssets.total + currentAssets.total;

            // Build equity
            const equity = {
                shareCapital: Math.abs(this.sumAccounts(classified, 'SHARE_CAPITAL')),
                sharePremium: Math.abs(this.sumAccounts(classified, 'SHARE_PREMIUM')),
                retainedEarnings: this.calculateRetainedEarnings(trialBalance),
                otherReserves: Math.abs(this.sumAccounts(classified, 'RESERVES')),
                total: 0,
            };
            equity.total = equity.shareCapital + equity.sharePremium +
                equity.retainedEarnings + equity.otherReserves;

            // Build non-current liabilities
            const nonCurrentLiabilities = {
                longTermBorrowings: Math.abs(this.sumAccounts(classified, 'LONG_TERM_LOANS')),
                deferredTaxLiabilities: 0,
                provisions: 0,
                otherNonCurrentLiabilities: 0,
                total: 0,
            };
            nonCurrentLiabilities.total = nonCurrentLiabilities.longTermBorrowings +
                nonCurrentLiabilities.deferredTaxLiabilities + nonCurrentLiabilities.provisions +
                nonCurrentLiabilities.otherNonCurrentLiabilities;

            // Build current liabilities
            const currentLiabilities = {
                tradePayables: Math.abs(this.sumAccounts(classified, 'PAYABLES')),
                taxPayables: Math.abs(this.sumAccounts(classified, 'TAX_PAYABLE') +
                    this.sumAccounts(classified, 'VAT_PAYABLE')),
                rssbPayables: Math.abs(this.sumAccounts(classified, 'RSSB_PAYABLE')),
                shortTermBorrowings: Math.abs(this.sumAccounts(classified, 'SHORT_TERM_LOANS')),
                accruedExpenses: Math.abs(this.sumAccounts(classified, 'ACCRUED_EXPENSES')),
                otherCurrentLiabilities: 0,
                total: 0,
            };
            currentLiabilities.total = currentLiabilities.tradePayables +
                currentLiabilities.taxPayables + currentLiabilities.rssbPayables +
                currentLiabilities.shortTermBorrowings + currentLiabilities.accruedExpenses +
                currentLiabilities.otherCurrentLiabilities;

            const totalLiabilities = nonCurrentLiabilities.total + currentLiabilities.total;
            const totalEquityAndLiabilities = equity.total + totalLiabilities;
            const isBalanced = Math.abs(totalAssets - totalEquityAndLiabilities) < 1;

            const balanceSheet: BalanceSheet = {
                asOfDate,
                entityName: context.companyName,
                currency: context.reportingCurrency,
                nonCurrentAssets,
                currentAssets,
                totalAssets,
                equity,
                nonCurrentLiabilities,
                currentLiabilities,
                totalLiabilities,
                totalEquityAndLiabilities,
                isBalanced,
            };

            const reviewGate = determineReviewRequirement(
                isBalanced ? 0.95 : 0.5,
                totalAssets,
                { confidenceMin: 0.90, amountMax: 100_000_000 }
            );

            return {
                success: true,
                data: balanceSheet,
                confidenceScore: isBalanced ? 0.95 : 0.5,
                requiresReview: reviewGate.required || !isBalanced,
                reviewReason: !isBalanced ? 'Balance sheet does not balance' : reviewGate.reason,
                ifrsStandard: 'IAS 1',
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate balance sheet',
                requiresReview: true,
                reviewReason: 'Generation error',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Generate Income Statement from trial balance.
     */
    async generateIncomeStatement(
        trialBalance: TrialBalanceEntry[],
        periodStart: Date,
        periodEnd: Date,
        context: AgentContext
    ): Promise<AgentResponse<IncomeStatement>> {
        const startTime = Date.now();

        try {
            const classified = this.classifyAccounts(trialBalance);

            // Revenue
            const revenue = {
                salesOfGoods: Math.abs(this.sumAccounts(classified, 'SALES_GOODS')),
                servicesRendered: Math.abs(this.sumAccounts(classified, 'SERVICES')),
                otherIncome: Math.abs(this.sumAccounts(classified, 'OTHER_INCOME')),
                total: 0,
            };
            revenue.total = revenue.salesOfGoods + revenue.servicesRendered + revenue.otherIncome;

            // Cost of Sales
            const costOfSales = {
                directMaterials: this.sumAccounts(classified, 'COST_OF_SALES'),
                directLabor: 0,
                manufacturingOverhead: 0,
                total: 0,
            };
            costOfSales.total = costOfSales.directMaterials + costOfSales.directLabor +
                costOfSales.manufacturingOverhead;

            const grossProfit = revenue.total - costOfSales.total;
            const grossProfitMargin = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;

            // Operating Expenses
            const operatingExpenses = {
                salariesAndWages: this.sumAccounts(classified, 'SALARIES'),
                rssbContributions: this.sumAccounts(classified, 'RSSB_EXPENSE'),
                rentAndUtilities: this.sumAccounts(classified, 'RENT') +
                    this.sumAccounts(classified, 'UTILITIES'),
                depreciation: this.sumAccounts(classified, 'DEPRECIATION'),
                amortization: this.sumAccounts(classified, 'AMORTIZATION'),
                professionalFees: this.sumAccounts(classified, 'PROFESSIONAL_FEES'),
                marketingAndAdvertising: this.sumAccounts(classified, 'MARKETING'),
                officeExpenses: this.sumAccounts(classified, 'OFFICE'),
                otherOperatingExpenses: 0,
                total: 0,
            };
            operatingExpenses.total = operatingExpenses.salariesAndWages +
                operatingExpenses.rssbContributions + operatingExpenses.rentAndUtilities +
                operatingExpenses.depreciation + operatingExpenses.amortization +
                operatingExpenses.professionalFees + operatingExpenses.marketingAndAdvertising +
                operatingExpenses.officeExpenses + operatingExpenses.otherOperatingExpenses;

            const operatingProfit = grossProfit - operatingExpenses.total;
            const operatingProfitMargin = revenue.total > 0 ? (operatingProfit / revenue.total) * 100 : 0;

            // Finance
            const financeIncome = 0;
            const financeCosts = this.sumAccounts(classified, 'FINANCE_COSTS');
            const netFinanceCosts = financeCosts - financeIncome;

            const profitBeforeTax = operatingProfit - netFinanceCosts;

            // Tax (estimate at 28%)
            const incomeTaxExpense = profitBeforeTax > 0 ? Math.round(profitBeforeTax * 0.28) : 0;
            const effectiveTaxRate = profitBeforeTax > 0 ? (incomeTaxExpense / profitBeforeTax) * 100 : 0;

            const profitForThePeriod = profitBeforeTax - incomeTaxExpense;
            const netProfitMargin = revenue.total > 0 ? (profitForThePeriod / revenue.total) * 100 : 0;

            const otherComprehensiveIncome = {
                foreignCurrencyTranslation: 0,
                revaluationSurplus: 0,
                actuarialGainsLosses: 0,
                total: 0,
            };

            const totalComprehensiveIncome = profitForThePeriod + otherComprehensiveIncome.total;

            const incomeStatement: IncomeStatement = {
                periodStart,
                periodEnd,
                entityName: context.companyName,
                currency: context.reportingCurrency,
                revenue,
                costOfSales,
                grossProfit,
                grossProfitMargin,
                operatingExpenses,
                operatingProfit,
                operatingProfitMargin,
                financeIncome,
                financeCosts,
                netFinanceCosts,
                profitBeforeTax,
                incomeTaxExpense,
                effectiveTaxRate,
                profitForThePeriod,
                netProfitMargin,
                otherComprehensiveIncome,
                totalComprehensiveIncome,
            };

            const reviewGate = determineReviewRequirement(0.90, profitForThePeriod);

            return {
                success: true,
                data: incomeStatement,
                confidenceScore: 0.90,
                requiresReview: reviewGate.required,
                reviewReason: reviewGate.reason,
                ifrsStandard: 'IAS 1',
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate income statement',
                requiresReview: true,
                reviewReason: 'Generation error',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Generate Statement of Changes in Equity.
     */
    async generateChangesInEquity(
        openingTrialBalance: TrialBalanceEntry[],
        closingTrialBalance: TrialBalanceEntry[],
        profitForPeriod: number,
        dividends: number,
        periodStart: Date,
        periodEnd: Date,
        context: AgentContext
    ): Promise<AgentResponse<ChangesInEquity>> {
        const startTime = Date.now();

        try {
            const openingClassified = this.classifyAccounts(openingTrialBalance);
            const closingClassified = this.classifyAccounts(closingTrialBalance);

            const openingBalance = {
                shareCapital: Math.abs(this.sumAccounts(openingClassified, 'SHARE_CAPITAL')),
                sharePremium: Math.abs(this.sumAccounts(openingClassified, 'SHARE_PREMIUM')),
                retainedEarnings: this.calculateRetainedEarnings(openingTrialBalance),
                otherReserves: Math.abs(this.sumAccounts(openingClassified, 'RESERVES')),
                total: 0,
            };
            openingBalance.total = openingBalance.shareCapital + openingBalance.sharePremium +
                openingBalance.retainedEarnings + openingBalance.otherReserves;

            const closingBalance = {
                shareCapital: Math.abs(this.sumAccounts(closingClassified, 'SHARE_CAPITAL')),
                sharePremium: Math.abs(this.sumAccounts(closingClassified, 'SHARE_PREMIUM')),
                retainedEarnings: this.calculateRetainedEarnings(closingTrialBalance),
                otherReserves: Math.abs(this.sumAccounts(closingClassified, 'RESERVES')),
                total: 0,
            };
            closingBalance.total = closingBalance.shareCapital + closingBalance.sharePremium +
                closingBalance.retainedEarnings + closingBalance.otherReserves;

            const movements = {
                profitForPeriod,
                otherComprehensiveIncome: 0,
                dividendsDeclared: -dividends,
                shareCapitalIssued: closingBalance.shareCapital - openingBalance.shareCapital,
                transferToReserves: closingBalance.otherReserves - openingBalance.otherReserves,
            };

            const statement: ChangesInEquity = {
                periodStart,
                periodEnd,
                entityName: context.companyName,
                openingBalance,
                movements,
                closingBalance,
            };

            return {
                success: true,
                data: statement,
                confidenceScore: 0.88,
                requiresReview: true,
                reviewReason: 'Changes in equity requires review',
                ifrsStandard: 'IAS 1',
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate statement',
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Calculate key financial ratios.
     */
    calculateRatios(balanceSheet: BalanceSheet, incomeStatement: IncomeStatement): {
        liquidity: { currentRatio: number; quickRatio: number; cashRatio: number };
        profitability: { grossMargin: number; operatingMargin: number; netMargin: number; roe: number };
        leverage: { debtToEquity: number; debtRatio: number };
        efficiency: { assetTurnover: number; receivablesDays: number };
    } {
        return {
            liquidity: {
                currentRatio: balanceSheet.currentLiabilities.total > 0
                    ? balanceSheet.currentAssets.total / balanceSheet.currentLiabilities.total
                    : 0,
                quickRatio: balanceSheet.currentLiabilities.total > 0
                    ? (balanceSheet.currentAssets.total - balanceSheet.currentAssets.inventories) /
                    balanceSheet.currentLiabilities.total
                    : 0,
                cashRatio: balanceSheet.currentLiabilities.total > 0
                    ? balanceSheet.currentAssets.cashAndEquivalents / balanceSheet.currentLiabilities.total
                    : 0,
            },
            profitability: {
                grossMargin: incomeStatement.grossProfitMargin,
                operatingMargin: incomeStatement.operatingProfitMargin,
                netMargin: incomeStatement.netProfitMargin,
                roe: balanceSheet.equity.total > 0
                    ? (incomeStatement.profitForThePeriod / balanceSheet.equity.total) * 100
                    : 0,
            },
            leverage: {
                debtToEquity: balanceSheet.equity.total > 0
                    ? balanceSheet.totalLiabilities / balanceSheet.equity.total
                    : 0,
                debtRatio: balanceSheet.totalAssets > 0
                    ? balanceSheet.totalLiabilities / balanceSheet.totalAssets
                    : 0,
            },
            efficiency: {
                assetTurnover: balanceSheet.totalAssets > 0
                    ? incomeStatement.revenue.total / balanceSheet.totalAssets
                    : 0,
                receivablesDays: incomeStatement.revenue.total > 0
                    ? (balanceSheet.currentAssets.tradeReceivables / incomeStatement.revenue.total) * 365
                    : 0,
            },
        };
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Classify accounts by code.
     */
    private classifyAccounts(trialBalance: TrialBalanceEntry[]): Map<string, TrialBalanceEntry[]> {
        const classified = new Map<string, TrialBalanceEntry[]>();

        for (const [category, codes] of Object.entries(ACCOUNT_CLASSIFICATIONS)) {
            classified.set(category, trialBalance.filter(entry =>
                codes.some(code => entry.accountCode.startsWith(code))
            ));
        }

        return classified;
    }

    /**
     * Sum account balances for a category.
     */
    private sumAccounts(classified: Map<string, TrialBalanceEntry[]>, category: string): number {
        const entries = classified.get(category) || [];
        return entries.reduce((sum, entry) => sum + entry.balance, 0);
    }

    /**
     * Calculate retained earnings from trial balance.
     */
    private calculateRetainedEarnings(trialBalance: TrialBalanceEntry[]): number {
        // Retained earnings = beginning balance + income - expenses
        const retainedAccount = trialBalance.find(e =>
            e.accountCode === '3210' || e.accountName.toLowerCase().includes('retained')
        );
        const beginningRE = retainedAccount ? Math.abs(retainedAccount.balance) : 0;

        // Add net income (revenue - expenses)
        const revenue = trialBalance
            .filter(e => e.accountType === 'INCOME')
            .reduce((sum, e) => sum + Math.abs(e.balance), 0);

        const expenses = trialBalance
            .filter(e => e.accountType === 'EXPENSE')
            .reduce((sum, e) => sum + e.balance, 0);

        return beginningRE + revenue - expenses;
    }
}

/**
 * Factory function.
 */
export function createFinancialReportingAgent(): FinancialReportingAgent {
    return FinancialReportingAgent.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const financialReportingAgent = {
    instance: () => FinancialReportingAgent.instance(),
};
