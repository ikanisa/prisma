/**
 * Rwanda Bank Reconciliation Agent
 * 
 * Automates bank reconciliation per IFRS requirements.
 * Features:
 * - Auto-matching of bank to book transactions
 * - Identification of timing differences
 * - Outstanding items tracking
 * - Reconciliation statement generation
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
// BANK RECONCILIATION TYPES
// ============================================================================

/**
 * Bank statement transaction.
 */
export interface BankTransaction {
    id: string;
    date: Date;
    description: string;
    reference?: string;
    amount: number;  // Positive = credit, Negative = debit
    balance: number;
    valueDate?: Date;
}

/**
 * Book (ledger) transaction.
 */
export interface BookTransaction {
    id: string;
    date: Date;
    description: string;
    reference?: string;
    debit: number;
    credit: number;
    accountCode: string;
    documentNumber?: string;
    vendorCustomer?: string;
}

/**
 * Match between bank and book transactions.
 */
export interface TransactionMatch {
    bankTransactionId: string;
    bookTransactionId: string;
    matchType: 'EXACT' | 'AMOUNT' | 'REFERENCE' | 'DATE_AMOUNT' | 'AI_SUGGESTED';
    confidence: number;
    variance?: number;
}

/**
 * Reconciliation item (unmatched or timing difference).
 */
export interface ReconciliationItem {
    id: string;
    type: 'OUTSTANDING_DEPOSIT' | 'OUTSTANDING_CHECK' | 'BANK_CHARGE' |
    'INTEREST_EARNED' | 'ERROR_BANK' | 'ERROR_BOOK' | 'UNIDENTIFIED';
    source: 'BANK' | 'BOOK';
    date: Date;
    description: string;
    amount: number;
    transactionId?: string;
    suggestedAction?: string;
    requiresJournalEntry: boolean;
}

/**
 * Bank reconciliation result.
 */
export interface BankReconciliation {
    accountCode: string;
    accountName: string;
    periodEnd: Date;
    currency: string;

    // Opening balances
    bankStatementBalance: number;
    bookBalance: number;

    // Matched transactions
    matchedTransactions: TransactionMatch[];
    matchedCount: number;
    matchedAmount: number;

    // Outstanding items
    outstandingDeposits: ReconciliationItem[];
    outstandingChecks: ReconciliationItem[];

    // Bank adjustments (to add to book)
    bankCharges: ReconciliationItem[];
    interestEarned: ReconciliationItem[];
    otherBankAdjustments: ReconciliationItem[];

    // Book errors (to correct)
    bookErrors: ReconciliationItem[];

    // Unidentified items requiring investigation
    unidentifiedItems: ReconciliationItem[];

    // Adjusted balances
    adjustedBankBalance: number;
    adjustedBookBalance: number;

    // Result
    isReconciled: boolean;
    variance: number;

    // Journal entries needed
    adjustingEntries: Array<{
        date: Date;
        description: string;
        debitAccount: string;
        creditAccount: string;
        amount: number;
    }>;

    // Metadata
    autoMatchedPercent: number;
    aiConfidence: number;
    requiresReview: boolean;
}

// ============================================================================
// BANK RECONCILIATION AGENT
// ============================================================================

/**
 * Rwanda Bank Reconciliation Agent.
 * 
 * Automates the bank reconciliation process with AI-powered matching.
 */
export class BankReconciliationAgent implements RwandaAccountingAgent {
    private static instance_: BankReconciliationAgent | null = null;

    readonly agentId = 'rwanda-bank-recon-agent';
    readonly name = 'Rwanda Bank Reconciliation Agent';
    readonly version = '1.0.0';
    readonly agentType: AgentType = 'TRANSACTION_PROCESSING';
    readonly capabilities = [
        'Auto-match bank and book transactions',
        'Identify outstanding deposits and checks',
        'Detect bank charges and interest',
        'Generate reconciliation statements',
        'Create adjusting journal entries',
        'Flag unidentified transactions for review',
    ];
    readonly framework: RwandaAccountingFramework | 'ALL' = 'ALL';
    readonly autonomyLevel: AutonomyLevel = 4;
    readonly supportedCurrencies = ['RWF', 'USD', 'EUR'];

    private constructor() { }

    /**
     * Get singleton instance.
     */
    static instance(): BankReconciliationAgent {
        if (!BankReconciliationAgent.instance_) {
            BankReconciliationAgent.instance_ = new BankReconciliationAgent();
        }
        return BankReconciliationAgent.instance_;
    }

    /**
     * Perform full bank reconciliation.
     */
    async reconcile(
        bankTransactions: BankTransaction[],
        bookTransactions: BookTransaction[],
        bankStatementBalance: number,
        bookBalance: number,
        accountCode: string,
        accountName: string,
        periodEnd: Date,
        context: AgentContext
    ): Promise<AgentResponse<BankReconciliation>> {
        const startTime = Date.now();

        try {
            // Step 1: Auto-match transactions
            const matches = await this.autoMatchTransactions(bankTransactions, bookTransactions);

            // Step 2: Identify unmatched bank transactions
            const unmatchedBank = bankTransactions.filter(
                bt => !matches.some(m => m.bankTransactionId === bt.id)
            );

            // Step 3: Identify unmatched book transactions
            const unmatchedBook = bookTransactions.filter(
                bt => !matches.some(m => m.bookTransactionId === bt.id)
            );

            // Step 4: Categorize unmatched items
            const categorized = this.categorizeUnmatchedItems(unmatchedBank, unmatchedBook, periodEnd);

            // Step 5: Calculate adjusted balances
            const outstandingDepositsTotal = categorized.outstandingDeposits.reduce(
                (sum, item) => sum + item.amount, 0
            );
            const outstandingChecksTotal = categorized.outstandingChecks.reduce(
                (sum, item) => sum + Math.abs(item.amount), 0
            );
            const bankChargesTotal = categorized.bankCharges.reduce(
                (sum, item) => sum + Math.abs(item.amount), 0
            );
            const interestTotal = categorized.interestEarned.reduce(
                (sum, item) => sum + item.amount, 0
            );

            // Adjusted bank balance
            const adjustedBankBalance = bankStatementBalance
                - outstandingDepositsTotal  // Deposits not yet on bank
                + outstandingChecksTotal;   // Checks not yet cleared

            // Adjusted book balance
            const adjustedBookBalance = bookBalance
                - bankChargesTotal  // Bank charges to record
                + interestTotal;    // Interest to record

            const variance = Math.abs(adjustedBankBalance - adjustedBookBalance);
            const isReconciled = variance < 1;  // Within 1 RWF/currency unit

            // Step 6: Generate adjusting entries
            const adjustingEntries = this.generateAdjustingEntries(
                categorized, accountCode, periodEnd
            );

            const matchedCount = matches.length;
            const totalTransactions = bankTransactions.length + bookTransactions.length;
            const autoMatchedPercent = totalTransactions > 0
                ? (matchedCount * 2 / totalTransactions) * 100
                : 0;

            const reconciliation: BankReconciliation = {
                accountCode,
                accountName,
                periodEnd,
                currency: context.reportingCurrency,
                bankStatementBalance,
                bookBalance,
                matchedTransactions: matches,
                matchedCount,
                matchedAmount: matches.reduce((sum, m) => {
                    const bt = bankTransactions.find(t => t.id === m.bankTransactionId);
                    return sum + (bt?.amount || 0);
                }, 0),
                outstandingDeposits: categorized.outstandingDeposits,
                outstandingChecks: categorized.outstandingChecks,
                bankCharges: categorized.bankCharges,
                interestEarned: categorized.interestEarned,
                otherBankAdjustments: categorized.otherBankAdjustments,
                bookErrors: categorized.bookErrors,
                unidentifiedItems: categorized.unidentifiedItems,
                adjustedBankBalance,
                adjustedBookBalance,
                isReconciled,
                variance,
                adjustingEntries,
                autoMatchedPercent,
                aiConfidence: isReconciled ? 0.95 : 0.7,
                requiresReview: !isReconciled || categorized.unidentifiedItems.length > 0,
            };

            const reviewGate = determineReviewRequirement(
                reconciliation.aiConfidence,
                bankStatementBalance
            );

            return {
                success: true,
                data: reconciliation,
                confidenceScore: reconciliation.aiConfidence,
                requiresReview: reconciliation.requiresReview || reviewGate.required,
                reviewReason: !isReconciled
                    ? `Variance of ${variance.toLocaleString()} detected`
                    : reviewGate.reason,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Reconciliation failed',
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Auto-match bank and book transactions.
     */
    async autoMatchTransactions(
        bankTransactions: BankTransaction[],
        bookTransactions: BookTransaction[]
    ): Promise<TransactionMatch[]> {
        const matches: TransactionMatch[] = [];
        const usedBankIds = new Set<string>();
        const usedBookIds = new Set<string>();

        // Pass 1: Exact match (amount + reference)
        for (const bank of bankTransactions) {
            for (const book of bookTransactions) {
                if (usedBankIds.has(bank.id) || usedBookIds.has(book.id)) continue;

                const bookAmount = book.credit - book.debit;
                if (Math.abs(bank.amount - bookAmount) < 0.01 &&
                    this.referencesMatch(bank.reference, book.reference)) {
                    matches.push({
                        bankTransactionId: bank.id,
                        bookTransactionId: book.id,
                        matchType: 'EXACT',
                        confidence: 1.0,
                    });
                    usedBankIds.add(bank.id);
                    usedBookIds.add(book.id);
                }
            }
        }

        // Pass 2: Amount match (same amount, close dates)
        for (const bank of bankTransactions) {
            for (const book of bookTransactions) {
                if (usedBankIds.has(bank.id) || usedBookIds.has(book.id)) continue;

                const bookAmount = book.credit - book.debit;
                const dateDiff = Math.abs(bank.date.getTime() - book.date.getTime());
                const withinDays = dateDiff / (1000 * 60 * 60 * 24);

                if (Math.abs(bank.amount - bookAmount) < 0.01 && withinDays <= 5) {
                    matches.push({
                        bankTransactionId: bank.id,
                        bookTransactionId: book.id,
                        matchType: 'DATE_AMOUNT',
                        confidence: 0.9 - (withinDays * 0.02),
                    });
                    usedBankIds.add(bank.id);
                    usedBookIds.add(book.id);
                }
            }
        }

        // Pass 3: Reference match (fuzzy)
        for (const bank of bankTransactions) {
            for (const book of bookTransactions) {
                if (usedBankIds.has(bank.id) || usedBookIds.has(book.id)) continue;

                if (this.fuzzyReferenceMatch(bank.reference, book.reference, bank.description, book.description)) {
                    const bookAmount = book.credit - book.debit;
                    const variance = Math.abs(bank.amount - bookAmount);

                    if (variance < Math.abs(bank.amount) * 0.01) { // Within 1%
                        matches.push({
                            bankTransactionId: bank.id,
                            bookTransactionId: book.id,
                            matchType: 'REFERENCE',
                            confidence: 0.85,
                            variance,
                        });
                        usedBankIds.add(bank.id);
                        usedBookIds.add(book.id);
                    }
                }
            }
        }

        return matches;
    }

    /**
     * Categorize unmatched items.
     */
    private categorizeUnmatchedItems(
        unmatchedBank: BankTransaction[],
        unmatchedBook: BookTransaction[],
        periodEnd: Date
    ): {
        outstandingDeposits: ReconciliationItem[];
        outstandingChecks: ReconciliationItem[];
        bankCharges: ReconciliationItem[];
        interestEarned: ReconciliationItem[];
        otherBankAdjustments: ReconciliationItem[];
        bookErrors: ReconciliationItem[];
        unidentifiedItems: ReconciliationItem[];
    } {
        const result = {
            outstandingDeposits: [] as ReconciliationItem[],
            outstandingChecks: [] as ReconciliationItem[],
            bankCharges: [] as ReconciliationItem[],
            interestEarned: [] as ReconciliationItem[],
            otherBankAdjustments: [] as ReconciliationItem[],
            bookErrors: [] as ReconciliationItem[],
            unidentifiedItems: [] as ReconciliationItem[],
        };

        // Categorize unmatched book transactions (outstanding items)
        for (const book of unmatchedBook) {
            const amount = book.credit - book.debit;

            if (amount > 0) {
                // Credit to bank = deposit in transit
                result.outstandingDeposits.push({
                    id: `od-${book.id}`,
                    type: 'OUTSTANDING_DEPOSIT',
                    source: 'BOOK',
                    date: book.date,
                    description: book.description,
                    amount,
                    transactionId: book.id,
                    suggestedAction: 'Wait for bank clearance or follow up',
                    requiresJournalEntry: false,
                });
            } else {
                // Debit to bank = check/payment outstanding
                result.outstandingChecks.push({
                    id: `oc-${book.id}`,
                    type: 'OUTSTANDING_CHECK',
                    source: 'BOOK',
                    date: book.date,
                    description: book.description,
                    amount: Math.abs(amount),
                    transactionId: book.id,
                    suggestedAction: 'Check not yet cleared by bank',
                    requiresJournalEntry: false,
                });
            }
        }

        // Categorize unmatched bank transactions
        for (const bank of unmatchedBank) {
            const desc = bank.description.toLowerCase();

            if (desc.includes('charge') || desc.includes('fee') || desc.includes('commission')) {
                result.bankCharges.push({
                    id: `bc-${bank.id}`,
                    type: 'BANK_CHARGE',
                    source: 'BANK',
                    date: bank.date,
                    description: bank.description,
                    amount: Math.abs(bank.amount),
                    transactionId: bank.id,
                    suggestedAction: 'Record bank charge expense',
                    requiresJournalEntry: true,
                });
            } else if (desc.includes('interest') && bank.amount > 0) {
                result.interestEarned.push({
                    id: `ie-${bank.id}`,
                    type: 'INTEREST_EARNED',
                    source: 'BANK',
                    date: bank.date,
                    description: bank.description,
                    amount: bank.amount,
                    transactionId: bank.id,
                    suggestedAction: 'Record interest income',
                    requiresJournalEntry: true,
                });
            } else {
                result.unidentifiedItems.push({
                    id: `ui-${bank.id}`,
                    type: 'UNIDENTIFIED',
                    source: 'BANK',
                    date: bank.date,
                    description: bank.description,
                    amount: bank.amount,
                    transactionId: bank.id,
                    suggestedAction: 'Investigate and identify transaction',
                    requiresJournalEntry: true,
                });
            }
        }

        return result;
    }

    /**
     * Generate adjusting journal entries.
     */
    private generateAdjustingEntries(
        categorized: ReturnType<typeof this.categorizeUnmatchedItems>,
        bankAccountCode: string,
        date: Date
    ): Array<{ date: Date; description: string; debitAccount: string; creditAccount: string; amount: number }> {
        const entries: Array<{ date: Date; description: string; debitAccount: string; creditAccount: string; amount: number }> = [];

        // Bank charges
        for (const charge of categorized.bankCharges) {
            entries.push({
                date,
                description: `Bank charge: ${charge.description}`,
                debitAccount: '5710', // Bank Charges Expense
                creditAccount: bankAccountCode,
                amount: charge.amount,
            });
        }

        // Interest earned
        for (const interest of categorized.interestEarned) {
            entries.push({
                date,
                description: `Interest earned: ${interest.description}`,
                debitAccount: bankAccountCode,
                creditAccount: '4920', // Interest Income
                amount: interest.amount,
            });
        }

        return entries;
    }

    /**
     * Check if references match.
     */
    private referencesMatch(ref1?: string, ref2?: string): boolean {
        if (!ref1 || !ref2) return false;
        return ref1.toLowerCase().trim() === ref2.toLowerCase().trim();
    }

    /**
     * Fuzzy reference matching.
     */
    private fuzzyReferenceMatch(ref1?: string, ref2?: string, desc1?: string, desc2?: string): boolean {
        const normalize = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const r1 = normalize(ref1);
        const r2 = normalize(ref2);
        const d1 = normalize(desc1);
        const d2 = normalize(desc2);

        // Check if any significant substring matches
        if (r1.length >= 4 && r2.includes(r1)) return true;
        if (r2.length >= 4 && r1.includes(r2)) return true;
        if (d1.length >= 6 && d2.includes(d1.substring(0, 6))) return true;

        return false;
    }
}

/**
 * Factory function.
 */
export function createBankReconciliationAgent(): BankReconciliationAgent {
    return BankReconciliationAgent.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const bankReconciliationAgent = {
    instance: () => BankReconciliationAgent.instance(),
};
