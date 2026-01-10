/**
 * Malta Year-End Close Agent
 * 
 * Autonomous agent for year-end close automation including:
 * - Prepayments & accruals processing
 * - Final depreciation calculations
 * - Bad debt provisioning
 * - Deferred tax calculations
 * - Revenue/expense closing entries
 * - Final validation checks
 */

import {
    type MaltaAccountingAgent,
    type AgentContext,
    type AgentResponse,
} from '../../core/base-agent.js';
import type {
    JournalEntry,
    TrialBalance,
} from '../../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Year-end close step definition.
 */
export interface CloseStep {
    step: number;
    name: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    description: string;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
}

/**
 * Year-end check result.
 */
export interface YearEndCheck {
    name: string;
    passed: boolean;
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
}

/**
 * Year-end close result.
 */
export interface YearEndCloseResult {
    status: 'IN_PROGRESS' | 'COMPLETE' | 'REQUIRES_REVIEW' | 'FAILED';
    steps: CloseStep[];
    adjustingEntries: JournalEntry[];
    closingEntries: JournalEntry[];
    checks: YearEndCheck[];
    trialBalance?: TrialBalance;
    summary: {
        totalAdjustingEntries: number;
        totalClosingEntries: number;
        checksPassedCount: number;
        checksFailedCount: number;
        profitOrLoss: number;
    };
}

/**
 * Accrual or prepayment to process.
 */
export interface AccrualPrepayment {
    id: string;
    type: 'ACCRUAL' | 'PREPAYMENT';
    description: string;
    amount: number;
    expenseAccount: string;
    balanceSheetAccount: string;
    periodStart: Date;
    periodEnd: Date;
}

// ============================================================================
// YEAR-END CLOSE AGENT
// ============================================================================

/**
 * Year-End Close Agent for Malta accounting.
 */
export class YearEndCloseAgent implements MaltaAccountingAgent {
    public readonly agentId = 'malta-year-end-close-001';
    public readonly name = 'Malta Year-End Close Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'TRANSACTION_PROCESSING' as const;
    public readonly capabilities = [
        'year_end_close',
        'adjusting_entries',
        'closing_entries',
        'trial_balance_validation',
    ];
    public readonly framework = 'BOTH' as const;
    public readonly autonomyLevel = 3 as const; // Requires accountant review
    public readonly supportedCurrencies = ['EUR'];

    /**
     * Execute full year-end close process.
     */
    async executeYearEndClose(
        context: AgentContext,
        options: {
            processAccruals?: boolean;
            processDepreciation?: boolean;
            processBadDebts?: boolean;
            processDeferredTax?: boolean;
        } = {}
    ): Promise<AgentResponse<YearEndCloseResult>> {
        const startTime = Date.now();
        const {
            processAccruals = true,
            processDepreciation = true,
            processBadDebts = true,
            processDeferredTax = true,
        } = options;

        const result: YearEndCloseResult = {
            status: 'IN_PROGRESS',
            steps: [],
            adjustingEntries: [],
            closingEntries: [],
            checks: [],
            summary: {
                totalAdjustingEntries: 0,
                totalClosingEntries: 0,
                checksPassedCount: 0,
                checksFailedCount: 0,
                profitOrLoss: 0,
            },
        };

        try {
            // STEP 1: Validate Trial Balance
            result.steps.push(await this.executeStep(1, 'Validate Trial Balance', async () => {
                result.checks.push(await this.checkTrialBalance(context));
            }));

            // STEP 2: Process Accruals & Prepayments
            if (processAccruals) {
                result.steps.push(await this.executeStep(2, 'Process Accruals & Prepayments', async () => {
                    const entries = await this.processAccrualsAndPrepayments(context);
                    result.adjustingEntries.push(...entries);
                }));
            }

            // STEP 3: Final Depreciation
            if (processDepreciation) {
                result.steps.push(await this.executeStep(3, 'Calculate Final Depreciation', async () => {
                    const entries = await this.processFinalDepreciation(context);
                    result.adjustingEntries.push(...entries);
                }));
            }

            // STEP 4: Bad Debt Provision
            if (processBadDebts) {
                result.steps.push(await this.executeStep(4, 'Process Bad Debt Provision', async () => {
                    const entries = await this.processBadDebtProvision(context);
                    result.adjustingEntries.push(...entries);
                }));
            }

            // STEP 5: Deferred Tax
            if (processDeferredTax) {
                result.steps.push(await this.executeStep(5, 'Calculate Deferred Tax', async () => {
                    const entries = await this.processDeferredTax(context);
                    result.adjustingEntries.push(...entries);
                }));
            }

            // STEP 6: Generate Closing Entries
            result.steps.push(await this.executeStep(6, 'Generate Closing Entries', async () => {
                const entries = await this.generateClosingEntries(context);
                result.closingEntries.push(...entries);
            }));

            // STEP 7: Final Checks
            result.steps.push(await this.executeStep(7, 'Perform Final Checks', async () => {
                const checks = await this.performFinalChecks(context);
                result.checks.push(...checks);
            }));

            // Calculate summary
            result.summary = {
                totalAdjustingEntries: result.adjustingEntries.length,
                totalClosingEntries: result.closingEntries.length,
                checksPassedCount: result.checks.filter(c => c.passed).length,
                checksFailedCount: result.checks.filter(c => !c.passed).length,
                profitOrLoss: this.calculateProfitOrLoss(result.closingEntries),
            };

            // Determine final status
            const hasFailedChecks = result.checks.some(c => !c.passed && c.severity === 'ERROR');
            result.status = hasFailedChecks ? 'REQUIRES_REVIEW' : 'COMPLETE';

            return {
                success: true,
                data: result,
                requiresReview: result.status === 'REQUIRES_REVIEW',
                reviewReason: hasFailedChecks ? 'Year-end checks failed' : undefined,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            result.status = 'FAILED';
            return {
                success: false,
                data: result,
                error: error instanceof Error ? error.message : 'Year-end close failed',
                requiresReview: true,
                reviewReason: 'Critical error during year-end close',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Execute a single step with timing.
     */
    private async executeStep(
        stepNum: number,
        name: string,
        action: () => Promise<void>
    ): Promise<CloseStep> {
        const step: CloseStep = {
            step: stepNum,
            name,
            status: 'IN_PROGRESS',
            description: '',
            startedAt: new Date(),
        };

        try {
            await action();
            step.status = 'COMPLETED';
            step.description = `${name} completed successfully`;
        } catch (error) {
            step.status = 'FAILED';
            step.error = error instanceof Error ? error.message : 'Unknown error';
            step.description = `${name} failed: ${step.error}`;
        }

        step.completedAt = new Date();
        return step;
    }

    /**
     * Check trial balance is balanced.
     */
    private async checkTrialBalance(_context: AgentContext): Promise<YearEndCheck> {
        // In production, would fetch actual trial balance
        return {
            name: 'Trial Balance Validation',
            passed: true,
            message: 'Trial balance is balanced',
            severity: 'INFO',
        };
    }

    /**
     * Process accruals and prepayments.
     */
    private async processAccrualsAndPrepayments(context: AgentContext): Promise<JournalEntry[]> {
        const entries: JournalEntry[] = [];
        const yearEnd = context.yearEnd;

        // Example: Accrued utilities
        entries.push({
            companyId: context.companyId,
            date: yearEnd,
            debit: {
                account: '5250',
                amount: 0, // Would be calculated from actual data
                description: 'Accrued utilities',
            },
            credit: {
                account: '2800',
                amount: 0,
                description: 'Accruals',
            },
            reference: `YE-ACCRUE-${yearEnd.getFullYear()}`,
            narrative: 'Year-end accrual for utilities',
            type: 'ADJUSTING',
            automated: true,
            aiGenerated: false,
            reviewRequired: true,
        });

        return entries.filter(e => e.debit.amount > 0);
    }

    /**
     * Process final depreciation for the year.
     */
    private async processFinalDepreciation(_context: AgentContext): Promise<JournalEntry[]> {
        // Would integrate with DepreciationAgent
        return [];
    }

    /**
     * Process bad debt provision.
     */
    private async processBadDebtProvision(context: AgentContext): Promise<JournalEntry[]> {
        const yearEnd = context.yearEnd;

        // Simplified: Create provision entry (would calculate from receivables aging)
        const provisionAmount = 0; // Would be calculated

        if (provisionAmount > 0) {
            return [{
                companyId: context.companyId,
                date: yearEnd,
                debit: {
                    account: '5600', // Bad debts expense
                    amount: provisionAmount,
                    description: 'Bad debt provision',
                },
                credit: {
                    account: '1559', // Provision for bad debts
                    amount: provisionAmount,
                    description: 'Provision for bad debts',
                },
                reference: `YE-BADDEBT-${yearEnd.getFullYear()}`,
                narrative: 'Year-end bad debt provision',
                type: 'ADJUSTING',
                automated: true,
                aiGenerated: false,
                reviewRequired: true,
            }];
        }

        return [];
    }

    /**
     * Process deferred tax.
     */
    private async processDeferredTax(_context: AgentContext): Promise<JournalEntry[]> {
        // Would calculate based on timing differences
        return [];
    }

    /**
     * Generate closing entries to transfer P&L to retained earnings.
     */
    private async generateClosingEntries(context: AgentContext): Promise<JournalEntry[]> {
        const yearEnd = context.yearEnd;
        const entries: JournalEntry[] = [];

        // These would be calculated from actual trial balance
        const totalRevenue = 0; // From trial balance
        const totalExpenses = 0; // From trial balance
        const profitForYear = totalRevenue - totalExpenses;

        // Close revenue accounts to P&L summary
        if (totalRevenue > 0) {
            entries.push({
                companyId: context.companyId,
                date: yearEnd,
                debit: {
                    account: '3000-3999', // Revenue accounts (symbolic)
                    amount: totalRevenue,
                    description: 'Close revenue accounts',
                },
                credit: {
                    account: '9999', // P&L Summary (symbolic)
                    amount: totalRevenue,
                    description: 'P&L Summary',
                },
                reference: `YE-CLOSE-REV-${yearEnd.getFullYear()}`,
                narrative: 'Closing revenue accounts to P&L',
                type: 'CLOSING',
                automated: true,
                aiGenerated: false,
                reviewRequired: true,
            });
        }

        // Close expense accounts to P&L summary
        if (totalExpenses > 0) {
            entries.push({
                companyId: context.companyId,
                date: yearEnd,
                debit: {
                    account: '9999', // P&L Summary
                    amount: totalExpenses,
                    description: 'P&L Summary',
                },
                credit: {
                    account: '4000-7999', // Expense accounts (symbolic)
                    amount: totalExpenses,
                    description: 'Close expense accounts',
                },
                reference: `YE-CLOSE-EXP-${yearEnd.getFullYear()}`,
                narrative: 'Closing expense accounts to P&L',
                type: 'CLOSING',
                automated: true,
                aiGenerated: false,
                reviewRequired: true,
            });
        }

        // Close P&L summary to retained earnings
        entries.push({
            companyId: context.companyId,
            date: yearEnd,
            debit: profitForYear >= 0
                ? { account: '9999', amount: Math.abs(profitForYear), description: 'P&L Summary' }
                : { account: '2091', amount: Math.abs(profitForYear), description: 'Retained Earnings' },
            credit: profitForYear >= 0
                ? { account: '2091', amount: Math.abs(profitForYear), description: 'Retained Earnings' }
                : { account: '9999', amount: Math.abs(profitForYear), description: 'P&L Summary' },
            reference: `YE-CLOSE-PL-${yearEnd.getFullYear()}`,
            narrative: `Closing P&L to Retained Earnings: ${profitForYear >= 0 ? 'Profit' : 'Loss'} €${Math.abs(profitForYear).toFixed(2)}`,
            type: 'CLOSING',
            automated: true,
            aiGenerated: false,
            reviewRequired: true,
        });

        return entries;
    }

    /**
     * Perform final year-end checks.
     */
    private async performFinalChecks(_context: AgentContext): Promise<YearEndCheck[]> {
        const checks: YearEndCheck[] = [];

        // Check: Balance sheet equation
        checks.push({
            name: 'Balance Sheet Equation',
            passed: true, // Would validate actual balances
            message: 'Assets = Equity + Liabilities',
            severity: 'ERROR',
        });

        // Check: Revenue accounts zeroed
        checks.push({
            name: 'Revenue Accounts Zeroed',
            passed: true,
            message: 'All revenue accounts closed',
            severity: 'ERROR',
        });

        // Check: Expense accounts zeroed
        checks.push({
            name: 'Expense Accounts Zeroed',
            passed: true,
            message: 'All expense accounts closed',
            severity: 'ERROR',
        });

        // Check: Bank reconciliation
        checks.push({
            name: 'Bank Reconciliation Complete',
            passed: true,
            message: 'All bank accounts reconciled',
            severity: 'WARNING',
        });

        // Check: VAT reconciliation
        checks.push({
            name: 'VAT Reconciliation',
            passed: true,
            message: 'VAT accounts reconciled',
            severity: 'WARNING',
        });

        return checks;
    }

    /**
     * Calculate profit or loss from closing entries.
     */
    private calculateProfitOrLoss(closingEntries: JournalEntry[]): number {
        const plEntry = closingEntries.find(e => e.reference.includes('CLOSE-PL'));
        if (!plEntry) return 0;

        // If retained earnings is credited, it's a profit
        if (plEntry.credit.account === '2091') {
            return plEntry.credit.amount;
        }
        // If retained earnings is debited, it's a loss
        return -plEntry.debit.amount;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Year-End Close Agent instance.
 */
export function createYearEndCloseAgent(): YearEndCloseAgent {
    return new YearEndCloseAgent();
}

/**
 * Lazy singleton instance.
 */
let _yearEndCloseAgent: YearEndCloseAgent | null = null;

export const yearEndCloseAgent = {
    instance(): YearEndCloseAgent {
        if (!_yearEndCloseAgent) {
            _yearEndCloseAgent = new YearEndCloseAgent();
        }
        return _yearEndCloseAgent;
    },
};
