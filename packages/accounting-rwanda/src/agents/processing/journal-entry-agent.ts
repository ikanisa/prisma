/**
 * Rwanda Journal Entry Agent
 * 
 * AI-powered transaction categorization and journal entry creation.
 * Implements IFRS standards per ICPAR requirements.
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
import type {
    RwandaAccountingFramework,
    TransactionInput,
    JournalEntry,
    JournalLine,
    IFRSCategory,
    IFRSStandard,
    VATCategory,
} from '../../types/index.js';
import { RWANDA_TAX_RATES_2026 } from '../../types/index.js';
import { RWANDA_CHART_OF_ACCOUNTS } from '../../core/chart-of-accounts.js';

// ============================================================================
// IFRS CATEGORIZATION RULES
// ============================================================================

/**
 * IFRS categorization keywords.
 */
const IFRS_KEYWORDS: Record<IFRSStandard, string[]> = {
    IFRS_1: ['first-time', 'adoption', 'transition'],
    IFRS_9: ['loan', 'investment', 'financial', 'derivative', 'hedge', 'interest'],
    IFRS_15: ['sale', 'revenue', 'service', 'contract', 'performance'],
    IFRS_16: ['lease', 'rent', 'right-of-use', 'rou'],
    IAS_1: ['other', 'general'],
    IAS_2: ['inventory', 'stock', 'goods', 'materials', 'wip'],
    IAS_12: ['tax', 'vat', 'cit', 'paye', 'withholding'],
    IAS_16: ['asset', 'equipment', 'vehicle', 'building', 'machinery', 'furniture'],
    IAS_19: ['salary', 'wage', 'pension', 'rssb', 'benefit', 'employee'],
    IAS_21: ['forex', 'exchange', 'usd', 'eur', 'kes', 'currency'],
    IAS_36: ['impairment', 'write-down'],
    IAS_37: ['provision', 'contingent'],
    IAS_38: ['software', 'license', 'patent', 'intangible'],
};

/**
 * Account mapping by transaction type.
 */
const ACCOUNT_MAPPINGS: Record<string, { debit: string; credit: string }> = {
    'sale-goods': { debit: '1121', credit: '4110' },
    'sale-services': { debit: '1121', credit: '4150' },
    'sale-export': { debit: '1122', credit: '4120' },
    'purchase-inventory': { debit: '1131', credit: '2111' },
    'purchase-asset': { debit: '1213', credit: '2111' },
    'salary-expense': { debit: '5210', credit: '2121' },
    'rent-expense': { debit: '5310', credit: '2111' },
    'utilities': { debit: '5320', credit: '2111' },
    'bank-charges': { debit: '5520', credit: '1112' },
    'depreciation': { debit: '5420', credit: '1219' },
};

// ============================================================================
// JOURNAL ENTRY AGENT
// ============================================================================

/**
 * Rwanda Journal Entry Agent.
 * 
 * AI-powered transaction processing with IFRS categorization.
 */
export class JournalEntryAgent implements RwandaAccountingAgent {
    private static instance_: JournalEntryAgent | null = null;

    readonly agentId = 'rwanda-journal-entry-agent';
    readonly name = 'Rwanda Journal Entry Agent';
    readonly version = '1.0.0';
    readonly agentType: AgentType = 'TRANSACTION_PROCESSING';
    readonly capabilities = [
        'AI-powered transaction categorization',
        'IFRS standard identification',
        'Automatic VAT calculation (18%)',
        'EAC/AfCFTA zero-rating detection',
        'RSSB-related entry recognition',
        'Double-entry validation',
        'Confidence-based review routing',
    ];
    readonly framework: RwandaAccountingFramework | 'ALL' = 'ALL';
    readonly autonomyLevel: AutonomyLevel = 4;
    readonly supportedCurrencies = ['RWF', 'USD', 'EUR', 'KES'];

    private vatRate: number;

    private constructor() {
        this.vatRate = RWANDA_TAX_RATES_2026.VAT_STANDARD;
    }

    /**
     * Get singleton instance.
     */
    static instance(): JournalEntryAgent {
        if (!JournalEntryAgent.instance_) {
            JournalEntryAgent.instance_ = new JournalEntryAgent();
        }
        return JournalEntryAgent.instance_;
    }

    /**
     * Process a transaction and create journal entry.
     */
    async processTransaction(
        transaction: TransactionInput,
        context: AgentContext
    ): Promise<AgentResponse<JournalEntry>> {
        const startTime = Date.now();

        try {
            // Step 1: Categorize transaction using AI
            const category = await this.categorizeTransaction(transaction);

            // Step 2: Determine VAT treatment
            const vatCategory = this.determineVATCategory(transaction);
            const vatAmount = this.calculateVAT(transaction.amount, vatCategory);

            // Step 3: Create journal entry
            const journalEntry = await this.createJournalEntry(
                transaction,
                category,
                vatCategory,
                vatAmount
            );

            // Step 4: Validate double-entry
            const isBalanced = this.validateDoubleEntry(journalEntry);
            if (!isBalanced) {
                throw new Error('Journal entry does not balance');
            }

            // Step 5: Determine review requirement
            const reviewGate = determineReviewRequirement(
                category.confidence,
                transaction.amount,
                { confidenceMin: 0.90, amountMax: 10_000_000 }
            );

            return {
                success: true,
                data: {
                    ...journalEntry,
                    aiConfidence: category.confidence,
                    requiresReview: reviewGate.required,
                    reviewReason: reviewGate.reason,
                },
                confidenceScore: category.confidence,
                requiresReview: reviewGate.required,
                reviewReason: reviewGate.reason,
                ifrsStandard: category.standard,
                rraCompliant: vatCategory !== 'OUT_OF_SCOPE',
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Transaction processing failed',
                requiresReview: true,
                reviewReason: 'Processing error',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Categorize transaction to IFRS standard.
     */
    async categorizeTransaction(transaction: TransactionInput): Promise<IFRSCategory> {
        const description = transaction.description.toLowerCase();

        // Match against IFRS keywords
        let bestMatch: IFRSStandard = 'IAS_1';
        let matchScore = 0;

        for (const [standard, keywords] of Object.entries(IFRS_KEYWORDS)) {
            const matches = keywords.filter(kw => description.includes(kw)).length;
            if (matches > matchScore) {
                matchScore = matches;
                bestMatch = standard as IFRSStandard;
            }
        }

        // Find appropriate account
        const accountMapping = this.findAccountMapping(transaction, bestMatch);
        const account = RWANDA_CHART_OF_ACCOUNTS.find(a => a.code === accountMapping.debit);

        // Calculate confidence based on match quality
        const confidence = Math.min(0.99, 0.7 + (matchScore * 0.1));

        return {
            standard: bestMatch,
            category: this.getIFRSCategoryName(bestMatch),
            accountCode: accountMapping.debit,
            accountName: account?.name || 'Unknown Account',
            recognitionBasis: this.getRecognitionBasis(bestMatch),
            confidence,
        };
    }

    /**
     * Find account mapping for transaction.
     */
    private findAccountMapping(
        transaction: TransactionInput,
        ifrsStandard: IFRSStandard
    ): { debit: string; credit: string } {
        const description = transaction.description.toLowerCase();

        // Direct keyword matching
        if (description.includes('sale') || transaction.type === 'INCOME') {
            if (transaction.isExport || transaction.isEACSupply) {
                return ACCOUNT_MAPPINGS['sale-export'];
            }
            if (description.includes('service')) {
                return ACCOUNT_MAPPINGS['sale-services'];
            }
            return ACCOUNT_MAPPINGS['sale-goods'];
        }

        if (description.includes('salary') || description.includes('wage')) {
            return ACCOUNT_MAPPINGS['salary-expense'];
        }

        if (description.includes('rent')) {
            return ACCOUNT_MAPPINGS['rent-expense'];
        }

        if (description.includes('utility') || description.includes('electric') || description.includes('water')) {
            return ACCOUNT_MAPPINGS['utilities'];
        }

        if (description.includes('bank') && description.includes('charge')) {
            return ACCOUNT_MAPPINGS['bank-charges'];
        }

        if (description.includes('depreciation')) {
            return ACCOUNT_MAPPINGS['depreciation'];
        }

        if (ifrsStandard === 'IAS_16') {
            return ACCOUNT_MAPPINGS['purchase-asset'];
        }

        if (ifrsStandard === 'IAS_2') {
            return ACCOUNT_MAPPINGS['purchase-inventory'];
        }

        // Default
        return { debit: '5370', credit: '2111' }; // Office supplies / Payable
    }

    /**
     * Get IFRS category name.
     */
    private getIFRSCategoryName(standard: IFRSStandard): string {
        const names: Record<IFRSStandard, string> = {
            IFRS_1: 'First-time IFRS Adoption',
            IFRS_9: 'Financial Instruments',
            IFRS_15: 'Revenue from Contracts',
            IFRS_16: 'Leases',
            IAS_1: 'General Presentation',
            IAS_2: 'Inventories',
            IAS_12: 'Income Taxes',
            IAS_16: 'Property, Plant and Equipment',
            IAS_19: 'Employee Benefits',
            IAS_21: 'Foreign Exchange',
            IAS_36: 'Impairment of Assets',
            IAS_37: 'Provisions and Contingencies',
            IAS_38: 'Intangible Assets',
        };
        return names[standard];
    }

    /**
     * Get recognition basis for IFRS standard.
     */
    private getRecognitionBasis(standard: IFRSStandard): 'HISTORICAL_COST' | 'FAIR_VALUE' | 'PRESENT_VALUE' | 'AMORTIZED_COST' {
        const bases: Record<IFRSStandard, 'HISTORICAL_COST' | 'FAIR_VALUE' | 'PRESENT_VALUE' | 'AMORTIZED_COST'> = {
            IFRS_1: 'FAIR_VALUE',
            IFRS_9: 'AMORTIZED_COST',
            IFRS_15: 'FAIR_VALUE',
            IFRS_16: 'PRESENT_VALUE',
            IAS_1: 'HISTORICAL_COST',
            IAS_2: 'HISTORICAL_COST',
            IAS_12: 'HISTORICAL_COST',
            IAS_16: 'HISTORICAL_COST',
            IAS_19: 'PRESENT_VALUE',
            IAS_21: 'HISTORICAL_COST',
            IAS_36: 'FAIR_VALUE',
            IAS_37: 'PRESENT_VALUE',
            IAS_38: 'HISTORICAL_COST',
        };
        return bases[standard];
    }

    /**
     * Determine VAT category.
     */
    determineVATCategory(transaction: TransactionInput): VATCategory {
        // Zero-rated
        if (transaction.isExport || transaction.isEACSupply || transaction.isAfCFTASupply) {
            return 'ZERO_RATED';
        }

        // Check for exempt categories
        const description = transaction.description.toLowerCase();
        const exemptKeywords = ['medical', 'health', 'education', 'school', 'bank', 'insurance', 'rice', 'bread', 'milk'];
        if (exemptKeywords.some(kw => description.includes(kw))) {
            return 'EXEMPT';
        }

        // Standard rated
        return 'STANDARD';
    }

    /**
     * Calculate VAT amount.
     */
    calculateVAT(amount: number, category: VATCategory): number {
        if (category === 'STANDARD') {
            return Math.round(amount * (this.vatRate / 100));
        }
        return 0;
    }

    /**
     * Create journal entry from transaction.
     */
    async createJournalEntry(
        transaction: TransactionInput,
        category: IFRSCategory,
        vatCategory: VATCategory,
        vatAmount: number
    ): Promise<JournalEntry> {
        const entries: JournalLine[] = [];
        const accountMapping = this.findAccountMapping(transaction, category.standard);

        if (transaction.type === 'INCOME') {
            // Revenue transaction
            // Dr: Receivable (gross)
            entries.push({
                accountCode: accountMapping.debit,
                accountName: 'Trade Receivable',
                debit: transaction.amount + vatAmount,
                description: transaction.description,
            });

            // Cr: Revenue (net)
            entries.push({
                accountCode: accountMapping.credit,
                accountName: 'Revenue',
                credit: transaction.amount,
                description: `Revenue - ${transaction.description}`,
            });

            // Cr: VAT Payable (if applicable)
            if (vatAmount > 0) {
                entries.push({
                    accountCode: '2131',
                    accountName: 'VAT Payable (Output VAT)',
                    credit: vatAmount,
                    description: `Output VAT ${this.vatRate}%`,
                });
            }
        } else {
            // Expense transaction
            // Dr: Expense (net)
            entries.push({
                accountCode: accountMapping.debit,
                accountName: category.accountName,
                debit: transaction.amount,
                description: transaction.description,
            });

            // Dr: Input VAT (if applicable)
            if (vatAmount > 0) {
                entries.push({
                    accountCode: '1151',
                    accountName: 'Input VAT',
                    debit: vatAmount,
                    description: `Input VAT ${this.vatRate}%`,
                });
            }

            // Cr: Payable (gross)
            entries.push({
                accountCode: accountMapping.credit,
                accountName: 'Trade Payable',
                credit: transaction.amount + vatAmount,
                description: `Payable - ${transaction.description}`,
            });
        }

        return {
            id: `je-${Date.now()}`,
            date: transaction.date,
            description: transaction.description,
            entries,
            ifrsStandard: category.standard,
            recognitionDate: transaction.date,
            measurementBasis: category.recognitionBasis,
            vatAmount: vatAmount > 0 ? vatAmount : undefined,
            vatRate: vatAmount > 0 ? this.vatRate : undefined,
            rssbRelated: this.isRSSBRelated(transaction),
            aiCategorized: true,
            aiConfidence: category.confidence,
            requiresReview: false,
        };
    }

    /**
     * Check if transaction is RSSB-related.
     */
    private isRSSBRelated(transaction: TransactionInput): boolean {
        const description = transaction.description.toLowerCase();
        return ['rssb', 'pension', 'social security', 'contribution'].some(kw =>
            description.includes(kw)
        );
    }

    /**
     * Validate double-entry (debits = credits).
     */
    validateDoubleEntry(entry: JournalEntry): boolean {
        const totalDebits = entry.entries.reduce((sum, e) => sum + (e.debit || 0), 0);
        const totalCredits = entry.entries.reduce((sum, e) => sum + (e.credit || 0), 0);
        return Math.abs(totalDebits - totalCredits) < 0.01;
    }

    /**
     * Process batch of transactions.
     */
    async processBatch(
        transactions: TransactionInput[],
        context: AgentContext
    ): Promise<AgentResponse<{
        processed: number;
        successful: number;
        failed: number;
        entries: JournalEntry[];
        errors: Array<{ transactionId: string; error: string }>;
    }>> {
        const startTime = Date.now();
        const entries: JournalEntry[] = [];
        const errors: Array<{ transactionId: string; error: string }> = [];

        for (const tx of transactions) {
            const result = await this.processTransaction(tx, context);
            if (result.success && result.data) {
                entries.push(result.data);
            } else {
                errors.push({
                    transactionId: tx.id,
                    error: result.error || 'Unknown error',
                });
            }
        }

        return {
            success: true,
            data: {
                processed: transactions.length,
                successful: entries.length,
                failed: errors.length,
                entries,
                errors,
            },
            confidenceScore: entries.length / transactions.length,
            requiresReview: errors.length > 0,
            reviewReason: errors.length > 0 ? `${errors.length} transactions failed processing` : undefined,
            durationMs: Date.now() - startTime,
        };
    }
}

/**
 * Factory function.
 */
export function createJournalEntryAgent(): JournalEntryAgent {
    return JournalEntryAgent.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const journalEntryAgent = {
    instance: () => JournalEntryAgent.instance(),
};
