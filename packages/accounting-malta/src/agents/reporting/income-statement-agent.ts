/**
 * Malta Income Statement Agent
 * 
 * Generates GAPSME and IFRS compliant income statements (Profit & Loss).
 * Uses cost of sales method per GAPSME requirements.
 */

import {
    type MaltaAccountingAgent,
    type AgentContext,
    type AgentResponse,
} from '../../core/base-agent.js';
import type {
    IncomeStatement,
    TrialBalance,
    AccountingFramework,
} from '../../types/index.js';

// ============================================================================
// INCOME STATEMENT AGENT
// ============================================================================

/**
 * Income Statement Agent for GAPSME and IFRS compliant P&L statements.
 */
export class IncomeStatementAgent implements MaltaAccountingAgent {
    public readonly agentId = 'malta-income-statement-001';
    public readonly name = 'Malta Income Statement Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'FINANCIAL_REPORTING' as const;
    public readonly capabilities = [
        'income_statement_generation',
        'gapsme_format',
        'ifrs_format',
        'cost_of_sales_method',
    ];
    public readonly framework = 'BOTH' as const;
    public readonly autonomyLevel = 4 as const;
    public readonly supportedCurrencies = ['EUR'];

    /**
     * Generate an income statement from trial balance.
     */
    async generateIncomeStatement(
        context: AgentContext,
        trialBalance: TrialBalance,
        options: {
            periodStart: Date;
            includeComparative?: boolean;
            priorYearTrialBalance?: TrialBalance;
        }
    ): Promise<AgentResponse<IncomeStatement>> {
        const startTime = Date.now();

        try {
            const { periodStart, includeComparative = false, priorYearTrialBalance } = options;

            // Generate current year income statement
            const incomeStatement = this.buildIncomeStatement(
                trialBalance,
                context.framework,
                periodStart,
                context.yearEnd
            );

            // Generate comparative if requested
            if (includeComparative && priorYearTrialBalance) {
                const priorYearEnd = new Date(context.yearEnd);
                priorYearEnd.setFullYear(priorYearEnd.getFullYear() - 1);
                const priorYearStart = new Date(periodStart);
                priorYearStart.setFullYear(priorYearStart.getFullYear() - 1);

                incomeStatement.comparative = this.buildIncomeStatement(
                    priorYearTrialBalance,
                    context.framework,
                    priorYearStart,
                    priorYearEnd
                );
            }

            // Validate
            const validation = this.validateIncomeStatement(incomeStatement);

            return {
                success: true,
                data: incomeStatement,
                confidenceScore: 1.0,
                requiresReview: false,
                warnings: validation.warnings,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Income statement generation failed',
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Build income statement from trial balance.
     */
    private buildIncomeStatement(
        trialBalance: TrialBalance,
        framework: AccountingFramework,
        periodStart: Date,
        periodEnd: Date
    ): IncomeStatement {
        const formatPeriod = (start: Date, end: Date) => {
            const endStr = end.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });
            return `For the year ended ${endStr}`;
        };

        // Revenue (credit balances, so negate)
        const revenue = Math.abs(this.sumAccountRange(trialBalance, '3000', '3199')) +
            Math.abs(this.sumAccountRange(trialBalance, '3200', '3399'));

        // Cost of Sales
        const costOfSales = this.sumAccountRange(trialBalance, '4000', '4999');

        // Gross Profit
        const grossProfit = revenue - costOfSales;

        // Distribution Costs
        const distributionCosts = this.sumAccountRange(trialBalance, '6000', '6999');

        // Administrative Expenses
        const administrativeExpenses = this.sumAccountRange(trialBalance, '5000', '5999');

        // Other Operating Income
        const otherOperatingIncome = Math.abs(this.sumAccountRange(trialBalance, '3400', '3599'));

        // Operating Profit
        const operatingProfit = grossProfit - distributionCosts - administrativeExpenses + otherOperatingIncome;

        // Finance Income
        const financeIncome = Math.abs(this.sumAccountRange(trialBalance, '3600', '3699'));

        // Finance Costs
        const financeCosts = this.sumAccountRange(trialBalance, '7000', '7499');

        // Profit Before Tax
        const profitBeforeTax = operatingProfit + financeIncome - financeCosts;

        // Tax Expense
        const taxExpense = this.sumAccountRange(trialBalance, '7500', '7999');

        // Profit for the Year
        const profitForTheYear = profitBeforeTax - taxExpense;

        return {
            header: {
                companyName: trialBalance.companyName,
                period: formatPeriod(periodStart, periodEnd),
                framework,
                currency: 'EUR',
            },
            revenue,
            costOfSales,
            grossProfit,
            distributionCosts,
            administrativeExpenses,
            otherOperatingIncome,
            operatingProfit,
            financeIncome,
            financeCosts,
            profitBeforeTax,
            taxExpense,
            profitForTheYear,
        };
    }

    /**
     * Sum account balances within a range.
     */
    private sumAccountRange(tb: TrialBalance, start: string, end: string): number {
        return tb.entries
            .filter(e => e.accountNumber >= start && e.accountNumber <= end)
            .reduce((sum, e) => sum + e.netBalance, 0);
    }

    /**
     * Validate income statement calculations.
     */
    validateIncomeStatement(is: IncomeStatement): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate gross profit calculation
        const expectedGrossProfit = is.revenue - is.costOfSales;
        if (Math.abs(is.grossProfit - expectedGrossProfit) > 0.01) {
            errors.push('Gross profit calculation mismatch');
        }

        // Validate operating profit calculation
        const expectedOperatingProfit = is.grossProfit - is.distributionCosts - is.administrativeExpenses + (is.otherOperatingIncome || 0);
        if (Math.abs(is.operatingProfit - expectedOperatingProfit) > 0.01) {
            errors.push('Operating profit calculation mismatch');
        }

        // Validate profit before tax
        const expectedPBT = is.operatingProfit + is.financeIncome - is.financeCosts;
        if (Math.abs(is.profitBeforeTax - expectedPBT) > 0.01) {
            errors.push('Profit before tax calculation mismatch');
        }

        // Warnings
        if (is.grossProfit < 0) {
            warnings.push('Gross profit is negative (gross loss)');
        }

        if (is.profitForTheYear < 0) {
            warnings.push('Net result is a loss');
        }

        const grossMargin = is.revenue > 0 ? (is.grossProfit / is.revenue) * 100 : 0;
        if (grossMargin < 10) {
            warnings.push(`Low gross margin (${grossMargin.toFixed(1)}%)`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Format income statement as text for display.
     */
    formatIncomeStatement(is: IncomeStatement): string {
        const lines: string[] = [];
        const fmt = (n: number) => `€${n.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

        lines.push(`${is.header.companyName}`);
        lines.push(`Income Statement`);
        lines.push(`${is.header.period}`);
        lines.push(`(${is.header.framework} - ${is.header.currency})`);
        lines.push('');

        lines.push(`Revenue                          ${fmt(is.revenue)}`);
        lines.push(`Cost of Sales                   (${fmt(is.costOfSales)})`);
        lines.push(`                                 ─────────────`);
        lines.push(`GROSS PROFIT                     ${fmt(is.grossProfit)}`);
        lines.push('');

        lines.push(`Distribution Costs              (${fmt(is.distributionCosts)})`);
        lines.push(`Administrative Expenses         (${fmt(is.administrativeExpenses)})`);
        if (is.otherOperatingIncome && is.otherOperatingIncome > 0) {
            lines.push(`Other Operating Income           ${fmt(is.otherOperatingIncome)}`);
        }
        lines.push(`                                 ─────────────`);
        lines.push(`OPERATING PROFIT                 ${fmt(is.operatingProfit)}`);
        lines.push('');

        lines.push(`Finance Income                   ${fmt(is.financeIncome)}`);
        lines.push(`Finance Costs                   (${fmt(is.financeCosts)})`);
        lines.push(`                                 ─────────────`);
        lines.push(`PROFIT BEFORE TAX                ${fmt(is.profitBeforeTax)}`);
        lines.push('');

        lines.push(`Tax Expense                     (${fmt(is.taxExpense)})`);
        lines.push(`                                 ─────────────`);
        lines.push(`PROFIT FOR THE YEAR              ${fmt(is.profitForTheYear)}`);
        lines.push('═══════════════════════════════════════════════');

        return lines.join('\n');
    }

    /**
     * Calculate key profitability ratios.
     */
    calculateRatios(is: IncomeStatement): {
        grossMargin: number;
        operatingMargin: number;
        netMargin: number;
    } {
        const revenue = is.revenue || 1; // Avoid division by zero

        return {
            grossMargin: (is.grossProfit / revenue) * 100,
            operatingMargin: (is.operatingProfit / revenue) * 100,
            netMargin: (is.profitForTheYear / revenue) * 100,
        };
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create an Income Statement Agent instance.
 */
export function createIncomeStatementAgent(): IncomeStatementAgent {
    return new IncomeStatementAgent();
}

/**
 * Lazy singleton instance.
 */
let _incomeStatementAgent: IncomeStatementAgent | null = null;

export const incomeStatementAgent = {
    instance(): IncomeStatementAgent {
        if (!_incomeStatementAgent) {
            _incomeStatementAgent = new IncomeStatementAgent();
        }
        return _incomeStatementAgent;
    },
};
