/**
 * Month-End Close Automation Service
 * 
 * FloQast-style automated month-end close with:
 * - Close checklist management
 * - Automated reconciliations
 * - Variance analysis
 * - Journal entry suggestions
 */

import {
    type NormalizedTransaction,
} from '../types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface CloseChecklistItem {
    id: string;
    name: string;
    category: 'preparation' | 'reconciliation' | 'adjustments' | 'review' | 'finalization';
    order: number;
    status: 'not_started' | 'in_progress' | 'pending_review' | 'completed' | 'blocked';
    assignee?: string;
    dueDate?: Date;
    completedAt?: Date;
    completedBy?: string;
    estimatedMinutes: number;
    actualMinutes?: number;
    automationLevel: 'manual' | 'semi_auto' | 'fully_auto';
    dependencies?: string[]; // Item IDs that must complete first
    notes?: string;
}

export interface CloseChecklist {
    id: string;
    period: string; // e.g., "2026-01"
    periodEnd: Date;
    status: 'not_started' | 'in_progress' | 'pending_review' | 'closed';
    items: CloseChecklistItem[];
    startedAt?: Date;
    closedAt?: Date;
    targetCloseDate: Date;
    actualCloseDate?: Date;
    daysToClose?: number;
}

export interface ReconciliationResult {
    id: string;
    accountId: string;
    accountName: string;
    periodEnd: Date;
    bookBalance: number;
    statementBalance: number;
    difference: number;
    reconcilingItems: ReconcilingItem[];
    status: 'matched' | 'unreconciled' | 'pending_review';
    autoMatchRate: number;
    createdAt: Date;
}

export interface ReconcilingItem {
    id: string;
    type: 'outstanding_check' | 'deposit_in_transit' | 'bank_fee' | 'interest' | 'error' | 'timing' | 'other';
    description: string;
    amount: number;
    date: Date;
    autoMatched: boolean;
    matched: boolean;
    matchedTransactionId?: string;
}

export interface VarianceAnalysis {
    accountId: string;
    accountName: string;
    currentPeriod: number;
    priorPeriod: number;
    variance: number;
    variancePercent: number;
    isSignificant: boolean;
    explanation?: string;
    suggestedAction?: string;
}

export interface JournalEntrySuggestion {
    id: string;
    type: 'accrual' | 'deferral' | 'reclassification' | 'correction' | 'estimate';
    description: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    confidence: number;
    reasoning: string;
    approved: boolean;
    postedAt?: Date;
}

// ============================================================================
// DEFAULT CHECKLIST TEMPLATE
// ============================================================================

const CLOSE_CHECKLIST_TEMPLATE: Omit<CloseChecklistItem, 'id'>[] = [
    // Preparation
    { name: 'Ensure all transactions posted', category: 'preparation', order: 1, status: 'not_started', estimatedMinutes: 30, automationLevel: 'fully_auto' },
    { name: 'Review open purchase orders', category: 'preparation', order: 2, status: 'not_started', estimatedMinutes: 20, automationLevel: 'semi_auto' },
    { name: 'Post pending invoices', category: 'preparation', order: 3, status: 'not_started', estimatedMinutes: 45, automationLevel: 'semi_auto' },

    // Reconciliations
    { name: 'Bank reconciliation - Operating', category: 'reconciliation', order: 4, status: 'not_started', estimatedMinutes: 30, automationLevel: 'fully_auto' },
    { name: 'Bank reconciliation - Payroll', category: 'reconciliation', order: 5, status: 'not_started', estimatedMinutes: 15, automationLevel: 'fully_auto' },
    { name: 'Credit card reconciliation', category: 'reconciliation', order: 6, status: 'not_started', estimatedMinutes: 20, automationLevel: 'fully_auto' },
    { name: 'Accounts receivable aging', category: 'reconciliation', order: 7, status: 'not_started', estimatedMinutes: 25, automationLevel: 'semi_auto' },
    { name: 'Accounts payable aging', category: 'reconciliation', order: 8, status: 'not_started', estimatedMinutes: 25, automationLevel: 'semi_auto' },
    { name: 'Inventory reconciliation', category: 'reconciliation', order: 9, status: 'not_started', estimatedMinutes: 45, automationLevel: 'manual' },
    { name: 'Fixed assets reconciliation', category: 'reconciliation', order: 10, status: 'not_started', estimatedMinutes: 30, automationLevel: 'semi_auto' },

    // Adjustments
    { name: 'Calculate depreciation', category: 'adjustments', order: 11, status: 'not_started', estimatedMinutes: 15, automationLevel: 'fully_auto' },
    { name: 'Accrue payroll', category: 'adjustments', order: 12, status: 'not_started', estimatedMinutes: 20, automationLevel: 'semi_auto' },
    { name: 'Accrue interest expense', category: 'adjustments', order: 13, status: 'not_started', estimatedMinutes: 10, automationLevel: 'fully_auto' },
    { name: 'Recognize deferred revenue', category: 'adjustments', order: 14, status: 'not_started', estimatedMinutes: 30, automationLevel: 'semi_auto' },
    { name: 'Record prepaid amortization', category: 'adjustments', order: 15, status: 'not_started', estimatedMinutes: 15, automationLevel: 'fully_auto' },

    // Review
    { name: 'Variance analysis', category: 'review', order: 16, status: 'not_started', estimatedMinutes: 45, automationLevel: 'fully_auto' },
    { name: 'Analytical review', category: 'review', order: 17, status: 'not_started', estimatedMinutes: 60, automationLevel: 'semi_auto' },
    { name: 'Management review', category: 'review', order: 18, status: 'not_started', estimatedMinutes: 30, automationLevel: 'manual' },

    // Finalization
    { name: 'Generate financial statements', category: 'finalization', order: 19, status: 'not_started', estimatedMinutes: 15, automationLevel: 'fully_auto' },
    { name: 'Lock period', category: 'finalization', order: 20, status: 'not_started', estimatedMinutes: 5, automationLevel: 'fully_auto' },
];

// ============================================================================
// SERVICE
// ============================================================================

export class MonthEndCloseService {
    private checklists: Map<string, CloseChecklist> = new Map();
    private reconciliations: Map<string, ReconciliationResult[]> = new Map();

    /**
     * Create a new close checklist for a period
     */
    createChecklist(period: string, targetCloseDate: Date): CloseChecklist {
        const periodEnd = new Date(period + '-01');
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(0); // Last day of month

        const checklist: CloseChecklist = {
            id: crypto.randomUUID(),
            period,
            periodEnd,
            status: 'not_started',
            items: CLOSE_CHECKLIST_TEMPLATE.map((item, index) => ({
                ...item,
                id: crypto.randomUUID(),
            })),
            targetCloseDate,
        };

        this.checklists.set(period, checklist);
        return checklist;
    }

    /**
     * Get checklist for a period
     */
    getChecklist(period: string): CloseChecklist | null {
        return this.checklists.get(period) || null;
    }

    /**
     * Update checklist item status
     */
    updateItemStatus(
        period: string,
        itemId: string,
        status: CloseChecklistItem['status'],
        userId?: string
    ): CloseChecklist | null {
        const checklist = this.checklists.get(period);
        if (!checklist) return null;

        const item = checklist.items.find(i => i.id === itemId);
        if (!item) return null;

        item.status = status;

        if (status === 'completed') {
            item.completedAt = new Date();
            item.completedBy = userId;
        }

        // Update checklist status
        this.updateChecklistStatus(checklist);

        return checklist;
    }

    /**
     * Run automated reconciliation for an account
     */
    async runReconciliation(
        accountId: string,
        accountName: string,
        periodEnd: Date,
        transactions: NormalizedTransaction[],
        statementBalance: number
    ): Promise<ReconciliationResult> {
        const bookBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const difference = bookBalance - statementBalance;

        // Identify potential reconciling items
        const reconcilingItems = this.identifyReconcilingItems(transactions, periodEnd);

        // Calculate auto-match rate
        const matchedItems = reconcilingItems.filter(i => i.autoMatched);
        const autoMatchRate = reconcilingItems.length > 0
            ? matchedItems.length / reconcilingItems.length
            : 1;

        const result: ReconciliationResult = {
            id: crypto.randomUUID(),
            accountId,
            accountName,
            periodEnd,
            bookBalance,
            statementBalance,
            difference,
            reconcilingItems,
            status: Math.abs(difference) < 0.01 ? 'matched' : 'unreconciled',
            autoMatchRate,
            createdAt: new Date(),
        };

        // Store result
        const periodKey = periodEnd.toISOString().split('T')[0];
        const periodResults = this.reconciliations.get(periodKey) || [];
        periodResults.push(result);
        this.reconciliations.set(periodKey, periodResults);

        return result;
    }

    /**
     * Perform variance analysis
     */
    analyzeVariances(
        currentPeriodData: Array<{ accountId: string; accountName: string; balance: number }>,
        priorPeriodData: Array<{ accountId: string; balance: number }>,
        significanceThreshold: number = 0.1 // 10%
    ): VarianceAnalysis[] {
        const priorBalances = new Map(priorPeriodData.map(d => [d.accountId, d.balance]));

        return currentPeriodData.map(current => {
            const prior = priorBalances.get(current.accountId) || 0;
            const variance = current.balance - prior;
            const variancePercent = prior !== 0 ? variance / prior : (variance !== 0 ? 1 : 0);

            return {
                accountId: current.accountId,
                accountName: current.accountName,
                currentPeriod: current.balance,
                priorPeriod: prior,
                variance,
                variancePercent,
                isSignificant: Math.abs(variancePercent) >= significanceThreshold,
                suggestedAction: Math.abs(variancePercent) >= significanceThreshold
                    ? 'Review and document explanation'
                    : undefined,
            };
        });
    }

    /**
     * Suggest journal entries based on patterns
     */
    suggestJournalEntries(
        period: string,
        historicalEntries: Array<{ type: string; debitAccount: string; creditAccount: string; amount: number }>
    ): JournalEntrySuggestion[] {
        const suggestions: JournalEntrySuggestion[] = [];

        // Group by type and find recurring patterns
        const byType = new Map<string, typeof historicalEntries>();
        for (const entry of historicalEntries) {
            const existing = byType.get(entry.type) || [];
            existing.push(entry);
            byType.set(entry.type, existing);
        }

        // Generate suggestions for common patterns
        for (const [type, entries] of byType) {
            if (entries.length < 3) continue; // Need at least 3 to establish pattern

            const avgAmount = entries.reduce((sum, e) => sum + e.amount, 0) / entries.length;
            const lastEntry = entries[entries.length - 1];

            suggestions.push({
                id: crypto.randomUUID(),
                type: type as JournalEntrySuggestion['type'],
                description: `Suggested ${type} based on historical pattern`,
                debitAccount: lastEntry.debitAccount,
                creditAccount: lastEntry.creditAccount,
                amount: Math.round(avgAmount * 100) / 100,
                confidence: Math.min(0.95, 0.7 + entries.length * 0.05),
                reasoning: `Based on ${entries.length} prior period entries with average amount $${avgAmount.toFixed(2)}`,
                approved: false,
            });
        }

        return suggestions;
    }

    /**
     * Get close progress metrics
     */
    getCloseProgress(period: string): {
        totalItems: number;
        completedItems: number;
        percentComplete: number;
        estimatedMinutesRemaining: number;
        blockedItems: number;
        automatedItems: number;
        manualItems: number;
    } {
        const checklist = this.checklists.get(period);
        if (!checklist) {
            return {
                totalItems: 0,
                completedItems: 0,
                percentComplete: 0,
                estimatedMinutesRemaining: 0,
                blockedItems: 0,
                automatedItems: 0,
                manualItems: 0,
            };
        }

        const completed = checklist.items.filter(i => i.status === 'completed');
        const remaining = checklist.items.filter(i => i.status !== 'completed');
        const blocked = checklist.items.filter(i => i.status === 'blocked');
        const automated = checklist.items.filter(i => i.automationLevel === 'fully_auto');
        const manual = checklist.items.filter(i => i.automationLevel === 'manual');

        return {
            totalItems: checklist.items.length,
            completedItems: completed.length,
            percentComplete: (completed.length / checklist.items.length) * 100,
            estimatedMinutesRemaining: remaining.reduce((sum, i) => sum + i.estimatedMinutes, 0),
            blockedItems: blocked.length,
            automatedItems: automated.length,
            manualItems: manual.length,
        };
    }

    /**
     * Identify potential reconciling items
     */
    private identifyReconcilingItems(
        transactions: NormalizedTransaction[],
        periodEnd: Date
    ): ReconcilingItem[] {
        const items: ReconcilingItem[] = [];

        for (const tx of transactions) {
            // Check for outstanding checks (payments after period end)
            if (tx.type === 'payment' && tx.date > periodEnd) {
                items.push({
                    id: crypto.randomUUID(),
                    type: 'outstanding_check',
                    description: `Outstanding check: ${tx.description}`,
                    amount: tx.amount,
                    date: tx.date,
                    autoMatched: true,
                    matched: true,
                    matchedTransactionId: tx.id,
                });
            }

            // Check for deposits in transit
            if (tx.type === 'transfer' && tx.amount > 0 && tx.date > periodEnd) {
                items.push({
                    id: crypto.randomUUID(),
                    type: 'deposit_in_transit',
                    description: `Deposit in transit: ${tx.description}`,
                    amount: tx.amount,
                    date: tx.date,
                    autoMatched: true,
                    matched: true,
                    matchedTransactionId: tx.id,
                });
            }
        }

        return items;
    }

    /**
     * Update checklist status based on items
     */
    private updateChecklistStatus(checklist: CloseChecklist): void {
        const allCompleted = checklist.items.every(i => i.status === 'completed');
        const anyInProgress = checklist.items.some(i =>
            i.status === 'in_progress' || i.status === 'pending_review'
        );

        if (allCompleted) {
            checklist.status = 'closed';
            checklist.closedAt = new Date();
            checklist.actualCloseDate = new Date();

            if (checklist.startedAt) {
                const msToClose = checklist.closedAt.getTime() - checklist.startedAt.getTime();
                checklist.daysToClose = msToClose / (1000 * 60 * 60 * 24);
            }
        } else if (anyInProgress) {
            checklist.status = 'in_progress';
            if (!checklist.startedAt) {
                checklist.startedAt = new Date();
            }
        }
    }
}
