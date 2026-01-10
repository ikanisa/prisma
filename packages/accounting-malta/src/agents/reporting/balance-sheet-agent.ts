/**
 * Malta Balance Sheet Agent
 * 
 * Generates GAPSME and IFRS compliant balance sheets.
 * 
 * Features:
 * - Non-current and current assets sections
 * - Equity breakdown
 * - Non-current and current liabilities
 * - Comparative figures
 * - Assets = Equity + Liabilities validation
 */

import {
    type MaltaAccountingAgent,
    type AgentContext,
    type AgentResponse,
} from '../../core/base-agent.js';
import type {
    BalanceSheet,
    NonCurrentAssets,
    CurrentAssets,
    Equity,
    NonCurrentLiabilities,
    CurrentLiabilities,
    Account,
    TrialBalance,
    AccountingFramework,
} from '../../types/index.js';

// ============================================================================
// BALANCE SHEET AGENT
// ============================================================================

/**
 * Balance Sheet Agent for GAPSME and IFRS compliant statements.
 */
export class BalanceSheetAgent implements MaltaAccountingAgent {
    public readonly agentId = 'malta-balance-sheet-001';
    public readonly name = 'Malta Balance Sheet Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'FINANCIAL_REPORTING' as const;
    public readonly capabilities = [
        'balance_sheet_generation',
        'gapsme_format',
        'ifrs_format',
        'comparative',
    ];
    public readonly framework = 'BOTH' as const;
    public readonly autonomyLevel = 4 as const;
    public readonly supportedCurrencies = ['EUR'];

    /**
     * Generate a balance sheet from trial balance.
     */
    async generateBalanceSheet(
        context: AgentContext,
        trialBalance: TrialBalance,
        options: {
            includeComparative?: boolean;
            priorYearTrialBalance?: TrialBalance;
        } = {}
    ): Promise<AgentResponse<BalanceSheet>> {
        const startTime = Date.now();

        try {
            const { includeComparative = false, priorYearTrialBalance } = options;

            // Generate current year balance sheet
            const balanceSheet = this.buildBalanceSheet(
                trialBalance,
                context.framework,
                context.yearEnd
            );

            // Generate comparative if requested
            if (includeComparative && priorYearTrialBalance) {
                const priorYearEnd = new Date(context.yearEnd);
                priorYearEnd.setFullYear(priorYearEnd.getFullYear() - 1);

                balanceSheet.comparative = this.buildBalanceSheet(
                    priorYearTrialBalance,
                    context.framework,
                    priorYearEnd
                );
            }

            // Validate balance sheet equation
            const validation = this.validateBalanceSheet(balanceSheet);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Balance sheet validation failed: ${validation.errors.join(', ')}`,
                    requiresReview: true,
                    reviewReason: 'Balance sheet does not balance',
                    durationMs: Date.now() - startTime,
                };
            }

            return {
                success: true,
                data: balanceSheet,
                confidenceScore: 1.0,
                requiresReview: false,
                warnings: validation.warnings,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Balance sheet generation failed',
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Build balance sheet from trial balance.
     */
    private buildBalanceSheet(
        trialBalance: TrialBalance,
        framework: AccountingFramework,
        yearEnd: Date
    ): BalanceSheet {
        const formatDate = (date: Date) => date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });

        // Extract balances by category
        const nonCurrentAssets = this.calculateNonCurrentAssets(trialBalance);
        const currentAssets = this.calculateCurrentAssets(trialBalance);
        const equity = this.calculateEquity(trialBalance);
        const nonCurrentLiabilities = this.calculateNonCurrentLiabilities(trialBalance);
        const currentLiabilities = this.calculateCurrentLiabilities(trialBalance);

        const totalAssets = nonCurrentAssets.total + currentAssets.total;
        const totalLiabilities = nonCurrentLiabilities.total + currentLiabilities.total;
        const totalEquityAndLiabilities = equity.total + totalLiabilities;

        return {
            header: {
                companyName: trialBalance.companyName,
                period: `As at ${formatDate(yearEnd)}`,
                framework,
                currency: 'EUR',
            },
            nonCurrentAssets,
            currentAssets,
            totalAssets,
            equity,
            nonCurrentLiabilities,
            currentLiabilities,
            totalLiabilities,
            totalEquityAndLiabilities,
        };
    }

    /**
     * Calculate non-current assets section.
     */
    private calculateNonCurrentAssets(tb: TrialBalance): NonCurrentAssets {
        const ppe = this.sumAccountRange(tb, '1000', '1099');
        const intangibles = this.sumAccountRange(tb, '1100', '1149');
        const investmentProperty = this.sumAccountRange(tb, '1150', '1179');
        const financialInvestments = this.sumAccountRange(tb, '1180', '1249');
        const deferredTax = this.sumAccountRange(tb, '1250', '1269');

        return {
            propertyPlantEquipment: ppe,
            intangibleAssets: intangibles,
            investmentProperty,
            financialInvestments,
            deferredTaxAssets: deferredTax,
            total: ppe + intangibles + investmentProperty + financialInvestments + deferredTax,
        };
    }

    /**
     * Calculate current assets section.
     */
    private calculateCurrentAssets(tb: TrialBalance): CurrentAssets {
        const inventories = this.sumAccountRange(tb, '1500', '1549');
        const tradeReceivables = this.sumAccountRange(tb, '1550', '1599');
        const otherReceivables = this.sumAccountRange(tb, '1600', '1649');
        const cash = this.sumAccountRange(tb, '1650', '1699');
        const prepayments = this.sumAccountRange(tb, '1700', '1749');

        return {
            inventories,
            tradeReceivables,
            otherReceivables,
            cashAndCashEquivalents: cash,
            prepayments,
            total: inventories + tradeReceivables + otherReceivables + cash + prepayments,
        };
    }

    /**
     * Calculate equity section.
     */
    private calculateEquity(tb: TrialBalance): Equity {
        // Equity accounts have credit balances
        const shareCapital = Math.abs(this.sumAccountRange(tb, '2000', '2049'));
        const sharePremium = Math.abs(this.sumAccountRange(tb, '2050', '2069'));
        const revaluationReserve = Math.abs(this.sumAccountRange(tb, '2070', '2089'));
        const retainedEarnings = Math.abs(this.sumAccountRange(tb, '2090', '2149'));
        const otherReserves = Math.abs(this.sumAccountRange(tb, '2150', '2199'));

        return {
            issuedCapital: shareCapital,
            sharePremium,
            revaluationReserve,
            retainedEarnings,
            otherReserves,
            total: shareCapital + sharePremium + revaluationReserve + retainedEarnings + otherReserves,
        };
    }

    /**
     * Calculate non-current liabilities section.
     */
    private calculateNonCurrentLiabilities(tb: TrialBalance): NonCurrentLiabilities {
        const borrowings = Math.abs(this.sumAccountRange(tb, '2300', '2349'));
        const deferredTax = Math.abs(this.sumAccountRange(tb, '2350', '2369'));
        const provisions = Math.abs(this.sumAccountRange(tb, '2370', '2399'));
        const leaseLiabilities = Math.abs(this.sumAccountRange(tb, '2400', '2429'));

        return {
            longTermBorrowings: borrowings,
            deferredTaxLiabilities: deferredTax,
            provisions,
            leaseLiabilities,
            total: borrowings + deferredTax + provisions + leaseLiabilities,
        };
    }

    /**
     * Calculate current liabilities section.
     */
    private calculateCurrentLiabilities(tb: TrialBalance): CurrentLiabilities {
        const tradePayables = Math.abs(this.sumAccountRange(tb, '2600', '2649'));
        const otherPayables = Math.abs(this.sumAccountRange(tb, '2650', '2699'));
        const taxLiabilities = Math.abs(this.sumAccountRange(tb, '2700', '2749'));
        const shortTermBorrowings = Math.abs(this.sumAccountRange(tb, '2750', '2799'));
        const accruals = Math.abs(this.sumAccountRange(tb, '2800', '2849'));

        return {
            tradePayables,
            otherPayables,
            currentTaxLiabilities: taxLiabilities,
            shortTermBorrowings,
            accruals,
            provisions: 0, // Current provisions would be separate
            total: tradePayables + otherPayables + taxLiabilities + shortTermBorrowings + accruals,
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
     * Validate balance sheet equation.
     */
    validateBalanceSheet(bs: BalanceSheet): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check Assets = Equity + Liabilities
        const difference = Math.abs(bs.totalAssets - bs.totalEquityAndLiabilities);
        if (difference > 0.01) {
            errors.push(`Balance sheet does not balance: Assets (€${bs.totalAssets.toFixed(2)}) ≠ Equity + Liabilities (€${bs.totalEquityAndLiabilities.toFixed(2)})`);
        }

        // Check totals are calculated correctly
        const expectedNonCurrentTotal =
            bs.nonCurrentAssets.propertyPlantEquipment +
            bs.nonCurrentAssets.intangibleAssets +
            bs.nonCurrentAssets.investmentProperty +
            bs.nonCurrentAssets.financialInvestments +
            bs.nonCurrentAssets.deferredTaxAssets;

        if (Math.abs(bs.nonCurrentAssets.total - expectedNonCurrentTotal) > 0.01) {
            warnings.push('Non-current assets total mismatch');
        }

        // Check for negative balances that shouldn't be negative
        if (bs.currentAssets.cashAndCashEquivalents < 0) {
            warnings.push('Cash and cash equivalents is negative (overdraft should be in current liabilities)');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Format balance sheet as text for display.
     */
    formatBalanceSheet(bs: BalanceSheet): string {
        const lines: string[] = [];
        const fmt = (n: number) => `€${n.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

        lines.push(`${bs.header.companyName}`);
        lines.push(`Balance Sheet`);
        lines.push(`${bs.header.period}`);
        lines.push(`(${bs.header.framework} - ${bs.header.currency})`);
        lines.push('');

        lines.push('NON-CURRENT ASSETS');
        lines.push(`  Property, Plant & Equipment    ${fmt(bs.nonCurrentAssets.propertyPlantEquipment)}`);
        lines.push(`  Intangible Assets              ${fmt(bs.nonCurrentAssets.intangibleAssets)}`);
        lines.push(`  Investment Property            ${fmt(bs.nonCurrentAssets.investmentProperty)}`);
        lines.push(`  Financial Investments          ${fmt(bs.nonCurrentAssets.financialInvestments)}`);
        lines.push(`  Deferred Tax Assets            ${fmt(bs.nonCurrentAssets.deferredTaxAssets)}`);
        lines.push(`                                 ─────────────`);
        lines.push(`  Total Non-Current Assets       ${fmt(bs.nonCurrentAssets.total)}`);
        lines.push('');

        lines.push('CURRENT ASSETS');
        lines.push(`  Inventories                    ${fmt(bs.currentAssets.inventories)}`);
        lines.push(`  Trade Receivables              ${fmt(bs.currentAssets.tradeReceivables)}`);
        lines.push(`  Other Receivables              ${fmt(bs.currentAssets.otherReceivables)}`);
        lines.push(`  Cash and Cash Equivalents      ${fmt(bs.currentAssets.cashAndCashEquivalents)}`);
        lines.push(`  Prepayments                    ${fmt(bs.currentAssets.prepayments)}`);
        lines.push(`                                 ─────────────`);
        lines.push(`  Total Current Assets           ${fmt(bs.currentAssets.total)}`);
        lines.push('');

        lines.push(`TOTAL ASSETS                     ${fmt(bs.totalAssets)}`);
        lines.push('═══════════════════════════════════════════════');
        lines.push('');

        lines.push('EQUITY');
        lines.push(`  Issued Capital                 ${fmt(bs.equity.issuedCapital)}`);
        lines.push(`  Share Premium                  ${fmt(bs.equity.sharePremium)}`);
        lines.push(`  Revaluation Reserve            ${fmt(bs.equity.revaluationReserve)}`);
        lines.push(`  Retained Earnings              ${fmt(bs.equity.retainedEarnings)}`);
        lines.push(`  Other Reserves                 ${fmt(bs.equity.otherReserves)}`);
        lines.push(`                                 ─────────────`);
        lines.push(`  Total Equity                   ${fmt(bs.equity.total)}`);
        lines.push('');

        lines.push('NON-CURRENT LIABILITIES');
        lines.push(`  Long-Term Borrowings           ${fmt(bs.nonCurrentLiabilities.longTermBorrowings)}`);
        lines.push(`  Deferred Tax Liabilities       ${fmt(bs.nonCurrentLiabilities.deferredTaxLiabilities)}`);
        lines.push(`  Provisions                     ${fmt(bs.nonCurrentLiabilities.provisions)}`);
        lines.push(`  Lease Liabilities              ${fmt(bs.nonCurrentLiabilities.leaseLiabilities)}`);
        lines.push(`                                 ─────────────`);
        lines.push(`  Total Non-Current Liabilities  ${fmt(bs.nonCurrentLiabilities.total)}`);
        lines.push('');

        lines.push('CURRENT LIABILITIES');
        lines.push(`  Trade Payables                 ${fmt(bs.currentLiabilities.tradePayables)}`);
        lines.push(`  Other Payables                 ${fmt(bs.currentLiabilities.otherPayables)}`);
        lines.push(`  Tax Liabilities                ${fmt(bs.currentLiabilities.currentTaxLiabilities)}`);
        lines.push(`  Short-Term Borrowings          ${fmt(bs.currentLiabilities.shortTermBorrowings)}`);
        lines.push(`  Accruals                       ${fmt(bs.currentLiabilities.accruals)}`);
        lines.push(`                                 ─────────────`);
        lines.push(`  Total Current Liabilities      ${fmt(bs.currentLiabilities.total)}`);
        lines.push('');

        lines.push(`TOTAL LIABILITIES                ${fmt(bs.totalLiabilities)}`);
        lines.push('');
        lines.push(`TOTAL EQUITY & LIABILITIES       ${fmt(bs.totalEquityAndLiabilities)}`);
        lines.push('═══════════════════════════════════════════════');

        return lines.join('\n');
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Balance Sheet Agent instance.
 */
export function createBalanceSheetAgent(): BalanceSheetAgent {
    return new BalanceSheetAgent();
}

/**
 * Lazy singleton instance.
 */
let _balanceSheetAgent: BalanceSheetAgent | null = null;

export const balanceSheetAgent = {
    instance(): BalanceSheetAgent {
        if (!_balanceSheetAgent) {
            _balanceSheetAgent = new BalanceSheetAgent();
        }
        return _balanceSheetAgent;
    },
};
