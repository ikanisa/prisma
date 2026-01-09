/**
 * Lead Schedule Generator
 * 
 * Generates lead schedules from trial balance by grouping accounts
 * by financial statement line item, calculating variances, and
 * linking to workpapers.
 * 
 * @example
 * ```typescript
 * const generator = new LeadScheduleGenerator();
 * const schedules = generator.generate(trialBalance, priorTrialBalance);
 * 
 * // Get schedule for specific line item
 * const arSchedule = generator.getScheduleByLineItem(schedules, 'accounts_receivable');
 * ```
 */

import type {
    TrialBalance,
    TrialBalanceAccount,
    LeadSchedule,
    FSLineItem,
    JournalEntry,
} from '../types/trial-balance.js';
import { calculateStatistics } from '../utils/statistical-analysis.js';

// ============================================================================
// GENERATOR OPTIONS
// ============================================================================

export interface GeneratorOptions {
    includeZeroBalanceAccounts?: boolean;
    groupByDepartment?: boolean;
    significantVarianceThreshold?: number;  // Percentage
    priorPeriodTrialBalance?: TrialBalance;
}

// ============================================================================
// FS LINE ITEM DISPLAY NAMES
// ============================================================================

const LINE_ITEM_DISPLAY_NAMES: Record<FSLineItem, string> = {
    // Assets
    cash_and_equivalents: 'Cash and Cash Equivalents',
    accounts_receivable: 'Accounts Receivable',
    inventory: 'Inventory',
    prepaid_expenses: 'Prepaid Expenses',
    other_current_assets: 'Other Current Assets',
    property_plant_equipment: 'Property, Plant & Equipment',
    intangible_assets: 'Intangible Assets',
    investments: 'Investments',
    other_non_current_assets: 'Other Non-Current Assets',
    // Liabilities
    accounts_payable: 'Accounts Payable',
    accrued_liabilities: 'Accrued Liabilities',
    deferred_revenue: 'Deferred Revenue',
    short_term_debt: 'Short-Term Debt',
    other_current_liabilities: 'Other Current Liabilities',
    long_term_debt: 'Long-Term Debt',
    deferred_tax_liability: 'Deferred Tax Liability',
    other_non_current_liabilities: 'Other Non-Current Liabilities',
    // Equity
    common_stock: 'Common Stock',
    retained_earnings: 'Retained Earnings',
    other_equity: 'Other Equity',
    // Revenue
    operating_revenue: 'Operating Revenue',
    other_income: 'Other Income',
    // Expenses
    cost_of_goods_sold: 'Cost of Goods Sold',
    selling_general_admin: 'Selling, General & Administrative',
    depreciation_amortization: 'Depreciation & Amortization',
    interest_expense: 'Interest Expense',
    tax_expense: 'Income Tax Expense',
    other_expenses: 'Other Expenses',
    // Other
    unmapped: 'Unmapped Accounts',
};

// ============================================================================
// FS LINE ITEM ORDER (for presentation)
// ============================================================================

const LINE_ITEM_ORDER: FSLineItem[] = [
    // Assets
    'cash_and_equivalents',
    'accounts_receivable',
    'inventory',
    'prepaid_expenses',
    'other_current_assets',
    'property_plant_equipment',
    'intangible_assets',
    'investments',
    'other_non_current_assets',
    // Liabilities
    'accounts_payable',
    'accrued_liabilities',
    'deferred_revenue',
    'short_term_debt',
    'other_current_liabilities',
    'long_term_debt',
    'deferred_tax_liability',
    'other_non_current_liabilities',
    // Equity
    'common_stock',
    'retained_earnings',
    'other_equity',
    // Revenue
    'operating_revenue',
    'other_income',
    // Expenses
    'cost_of_goods_sold',
    'selling_general_admin',
    'depreciation_amortization',
    'interest_expense',
    'tax_expense',
    'other_expenses',
    // Other
    'unmapped',
];

// ============================================================================
// LEAD SCHEDULE GENERATOR
// ============================================================================

export class LeadScheduleGenerator {
    /**
     * Generate lead schedules from trial balance
     */
    generate(
        trialBalance: TrialBalance,
        options: GeneratorOptions = {}
    ): LeadSchedule[] {
        const {
            includeZeroBalanceAccounts = false,
            groupByDepartment = false,
            significantVarianceThreshold = 10,
            priorPeriodTrialBalance,
        } = options;

        // Build prior period lookup
        const priorBalances = new Map<string, number>();
        if (priorPeriodTrialBalance) {
            for (const account of priorPeriodTrialBalance.accounts) {
                priorBalances.set(account.accountNumber, account.balance);
            }
        }

        // Group accounts by FS line item
        const groups = new Map<FSLineItem, TrialBalanceAccount[]>();

        for (const account of trialBalance.accounts) {
            // Skip zero balance accounts if configured
            if (!includeZeroBalanceAccounts && account.balance === 0) {
                continue;
            }

            const lineItem = account.fsLineItem ?? 'unmapped';

            if (!groups.has(lineItem)) {
                groups.set(lineItem, []);
            }

            // Enrich with prior period data
            if (priorBalances.has(account.accountNumber)) {
                account.priorYearBalance = priorBalances.get(account.accountNumber);
                account.variance = account.balance - (account.priorYearBalance ?? 0);
                account.variancePercent = account.priorYearBalance && account.priorYearBalance !== 0
                    ? (account.variance / Math.abs(account.priorYearBalance)) * 100
                    : 0;
            }

            groups.get(lineItem)!.push(account);
        }

        // Generate schedules
        const schedules: LeadSchedule[] = [];

        for (const lineItem of LINE_ITEM_ORDER) {
            const accounts = groups.get(lineItem);
            if (!accounts || accounts.length === 0) continue;

            // Sort accounts by balance (descending)
            accounts.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

            // Calculate totals
            const currentPeriodBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
            const priorPeriodBalance = accounts.reduce((sum, a) => sum + (a.priorYearBalance ?? 0), 0);
            const variance = currentPeriodBalance - priorPeriodBalance;
            const variancePercent = priorPeriodBalance !== 0
                ? (variance / Math.abs(priorPeriodBalance)) * 100
                : 0;

            const schedule: LeadSchedule = {
                id: crypto.randomUUID(),
                trialBalanceId: trialBalance.id,
                fsLineItem: lineItem,
                displayName: LINE_ITEM_DISPLAY_NAMES[lineItem],
                accounts,
                accountCount: accounts.length,
                currentPeriodBalance,
                priorPeriodBalance: priorPeriodTrialBalance ? priorPeriodBalance : undefined,
                variance: priorPeriodTrialBalance ? variance : undefined,
                variancePercent: priorPeriodTrialBalance ? variancePercent : undefined,
                adjustments: [],
                adjustedBalance: currentPeriodBalance,
                reviewStatus: 'not_started',
            };

            // Generate workpaper reference
            schedule.workpaperRef = this.generateWorkpaperRef(lineItem, schedules.length + 1);

            schedules.push(schedule);
        }

        return schedules;
    }

    /**
     * Get schedule by FS line item
     */
    getScheduleByLineItem(schedules: LeadSchedule[], lineItem: FSLineItem): LeadSchedule | undefined {
        return schedules.find(s => s.fsLineItem === lineItem);
    }

    /**
     * Apply adjustment to a schedule
     */
    applyAdjustment(schedule: LeadSchedule, adjustment: JournalEntry): void {
        // Add to adjustments list
        schedule.adjustments.push(adjustment);

        // Recalculate adjusted balance
        let totalAdjustment = 0;
        for (const adj of schedule.adjustments) {
            if (adj.status === 'approved' || adj.status === 'posted') {
                for (const line of adj.lines) {
                    const account = schedule.accounts.find(a => a.id === line.accountId);
                    if (account) {
                        totalAdjustment += line.debit - line.credit;
                    }
                }
            }
        }

        schedule.adjustedBalance = schedule.currentPeriodBalance + totalAdjustment;
    }

    /**
     * Get summary statistics for all schedules
     */
    getSummary(schedules: LeadSchedule[]): {
        totalAssets: number;
        totalLiabilities: number;
        totalEquity: number;
        totalRevenue: number;
        totalExpenses: number;
        netIncome: number;
        scheduleCount: number;
        accountCount: number;
        reviewedCount: number;
    } {
        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalEquity = 0;
        let totalRevenue = 0;
        let totalExpenses = 0;
        let accountCount = 0;
        let reviewedCount = 0;

        const assetLineItems: FSLineItem[] = [
            'cash_and_equivalents', 'accounts_receivable', 'inventory',
            'prepaid_expenses', 'other_current_assets', 'property_plant_equipment',
            'intangible_assets', 'investments', 'other_non_current_assets',
        ];

        const liabilityLineItems: FSLineItem[] = [
            'accounts_payable', 'accrued_liabilities', 'deferred_revenue',
            'short_term_debt', 'other_current_liabilities', 'long_term_debt',
            'deferred_tax_liability', 'other_non_current_liabilities',
        ];

        const equityLineItems: FSLineItem[] = [
            'common_stock', 'retained_earnings', 'other_equity',
        ];

        const revenueLineItems: FSLineItem[] = [
            'operating_revenue', 'other_income',
        ];

        const expenseLineItems: FSLineItem[] = [
            'cost_of_goods_sold', 'selling_general_admin', 'depreciation_amortization',
            'interest_expense', 'tax_expense', 'other_expenses',
        ];

        for (const schedule of schedules) {
            accountCount += schedule.accountCount;

            if (schedule.reviewStatus === 'reviewed' || schedule.reviewStatus === 'approved') {
                reviewedCount++;
            }

            if (assetLineItems.includes(schedule.fsLineItem)) {
                totalAssets += schedule.adjustedBalance;
            } else if (liabilityLineItems.includes(schedule.fsLineItem)) {
                totalLiabilities += schedule.adjustedBalance;
            } else if (equityLineItems.includes(schedule.fsLineItem)) {
                totalEquity += schedule.adjustedBalance;
            } else if (revenueLineItems.includes(schedule.fsLineItem)) {
                totalRevenue += schedule.adjustedBalance;
            } else if (expenseLineItems.includes(schedule.fsLineItem)) {
                totalExpenses += schedule.adjustedBalance;
            }
        }

        return {
            totalAssets,
            totalLiabilities,
            totalEquity,
            totalRevenue,
            totalExpenses,
            netIncome: totalRevenue - totalExpenses,
            scheduleCount: schedules.length,
            accountCount,
            reviewedCount,
        };
    }

    /**
     * Get accounts with significant variances
     */
    getSignificantVariances(
        schedules: LeadSchedule[],
        threshold: number = 25
    ): { schedule: LeadSchedule; account: TrialBalanceAccount }[] {
        const results: { schedule: LeadSchedule; account: TrialBalanceAccount }[] = [];

        for (const schedule of schedules) {
            for (const account of schedule.accounts) {
                if (account.variancePercent !== undefined &&
                    Math.abs(account.variancePercent) >= threshold) {
                    results.push({ schedule, account });
                }
            }
        }

        // Sort by variance (descending)
        return results.sort((a, b) =>
            Math.abs(b.account.variancePercent ?? 0) - Math.abs(a.account.variancePercent ?? 0)
        );
    }

    /**
     * Export schedules to structured format
     */
    exportToJSON(schedules: LeadSchedule[]): {
        summary: ReturnType<typeof this.getSummary>;
        schedules: Array<{
            reference: string;
            lineItem: string;
            currentBalance: number;
            priorBalance?: number;
            variance?: number;
            variancePercent?: number;
            accountCount: number;
            status: string;
        }>;
    } {
        return {
            summary: this.getSummary(schedules),
            schedules: schedules.map(s => ({
                reference: s.workpaperRef ?? '',
                lineItem: s.displayName,
                currentBalance: s.adjustedBalance,
                priorBalance: s.priorPeriodBalance,
                variance: s.variance,
                variancePercent: s.variancePercent,
                accountCount: s.accountCount,
                status: s.reviewStatus,
            })),
        };
    }

    /**
     * Generate workpaper reference code
     */
    private generateWorkpaperRef(lineItem: FSLineItem, index: number): string {
        const prefixes: Record<string, string> = {
            'cash': 'A',
            'receivable': 'B',
            'inventory': 'C',
            'prepaid': 'D',
            'property': 'E',
            'intangible': 'F',
            'investment': 'G',
            'payable': 'AA',
            'accrued': 'BB',
            'deferred_revenue': 'CC',
            'debt': 'DD',
            'equity': 'EE',
            'revenue': 'PL1',
            'income': 'PL2',
            'cost': 'PL3',
            'selling': 'PL4',
            'depreciation': 'PL5',
            'interest': 'PL6',
            'tax': 'PL7',
        };

        for (const [key, prefix] of Object.entries(prefixes)) {
            if (lineItem.includes(key)) {
                return `${prefix}-${index.toString().padStart(2, '0')}`;
            }
        }

        return `XX-${index.toString().padStart(2, '0')}`;
    }
}

// Export default instance
export const leadScheduleGenerator = new LeadScheduleGenerator();
