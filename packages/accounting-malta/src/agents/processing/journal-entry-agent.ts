/**
 * Malta Journal Entry Agent
 * 
 * AI-powered autonomous agent for generating journal entries from
 * natural language descriptions. Supports GAPSME and IFRS frameworks.
 * 
 * Features:
 * - Natural language → double-entry journal entries
 * - Automatic account classification via GPT-4
 * - Confidence scoring with human review flags
 * - GAPSME/IFRS compliant entries
 */

import OpenAI from 'openai';
import {
    type MaltaAccountingAgent,
    type AgentContext,
    type AgentResponse,
    type AgentConfig,
    determineReviewRequirement,
} from '../../core/base-agent.js';
import type {
    JournalEntry,
    RawTransaction,
    JournalEntryValidation,
    Account,
} from '../../types/index.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface JournalEntryAgentConfig extends AgentConfig {
    /** Confidence threshold for auto-approval (0-1) */
    confidenceThreshold?: number;
    /** Amount threshold for mandatory review (EUR) */
    reviewAmountThreshold?: number;
}

// ============================================================================
// JOURNAL ENTRY AGENT
// ============================================================================

/**
 * AI-powered Journal Entry Agent for Malta accounting.
 */
export class JournalEntryAgent implements MaltaAccountingAgent {
    public readonly agentId = 'malta-journal-entry-001';
    public readonly name = 'Malta Journal Entry Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'TRANSACTION_PROCESSING' as const;
    public readonly capabilities = [
        'auto_journal_entry',
        'double_entry_validation',
        'posting',
        'natural_language_processing',
    ];
    public readonly framework = 'BOTH' as const;
    public readonly autonomyLevel = 4 as const;
    public readonly supportedCurrencies = ['EUR', 'USD', 'GBP'];

    private openai: OpenAI | null = null;
    private config: JournalEntryAgentConfig;

    constructor(config: JournalEntryAgentConfig = {}) {
        this.config = {
            confidenceThreshold: 0.90,
            reviewAmountThreshold: 10000,
            ...config,
        };

        // Initialize OpenAI client if API key available
        try {
            const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
            if (apiKey) {
                this.openai = new OpenAI({ apiKey });
            }
        } catch {
            // OpenAI not available, will use rule-based fallback
        }
    }

    /**
     * Get agent capabilities.
     */
    getCapabilities(): string[] {
        return this.capabilities;
    }

    /**
     * Process a raw transaction into a journal entry.
     */
    async processTransaction(
        transaction: RawTransaction,
        chartOfAccounts: Account[]
    ): Promise<AgentResponse<JournalEntry>> {
        const startTime = Date.now();

        try {
            // Generate journal entry using AI or rules
            const entry = await this.generateJournalEntry(transaction, chartOfAccounts);

            // Validate double-entry principle
            const validation = this.validateDoubleEntry(entry);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Double-entry validation failed: ${validation.errors.join(', ')}`,
                    requiresReview: true,
                    reviewReason: 'Validation failure',
                    durationMs: Date.now() - startTime,
                };
            }

            // Determine if review is required
            const reviewGate = determineReviewRequirement(
                entry.confidenceScore ?? 0.5,
                entry.debit.amount,
                {
                    confidenceMin: this.config.confidenceThreshold!,
                    amountMax: this.config.reviewAmountThreshold!,
                }
            );

            entry.reviewRequired = reviewGate.required;
            entry.reviewStatus = reviewGate.required ? 'PENDING' : undefined;

            return {
                success: true,
                data: entry,
                confidenceScore: entry.confidenceScore,
                requiresReview: reviewGate.required,
                reviewReason: reviewGate.reason,
                warnings: validation.warnings,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                requiresReview: true,
                reviewReason: 'Processing error',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Generate a journal entry from a raw transaction.
     */
    async generateJournalEntry(
        transaction: RawTransaction,
        chartOfAccounts: Account[]
    ): Promise<JournalEntry> {
        // Use AI if available
        if (this.openai) {
            return this.aiGenerateJournalEntry(transaction, chartOfAccounts);
        }

        // Fallback to rule-based generation
        return this.ruleBasedJournalEntry(transaction, chartOfAccounts);
    }

    /**
     * AI-powered journal entry generation using GPT-4.
     */
    private async aiGenerateJournalEntry(
        transaction: RawTransaction,
        chartOfAccounts: Account[]
    ): Promise<JournalEntry> {
        const accountList = chartOfAccounts
            .slice(0, 50) // Limit to prevent token overflow
            .map(a => `${a.accountNumber}: ${a.accountName} (${a.accountType})`)
            .join('\n');

        const prompt = `You are a Malta-certified accountant. Generate a journal entry for the following transaction.

TRANSACTION:
- Description: ${transaction.description}
- Amount: €${transaction.amount.toFixed(2)}
- Date: ${transaction.date.toISOString().split('T')[0]}
- Accounting Framework: ${transaction.framework}

AVAILABLE ACCOUNTS (partial list):
${accountList}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "debit": {"account": "XXXX", "amount": ${transaction.amount}, "description": "..."},
  "credit": {"account": "XXXX", "amount": ${transaction.amount}, "description": "..."},
  "reference": "JE-YYYYMMDD-XXX",
  "narrative": "...",
  "gapsmeClassification": "...",
  "ifrsStandard": "...",
  "confidence": 0.XX
}`;

        try {
            const response = await this.openai!.chat.completions.create({
                model: this.config.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
            });

            const content = response.choices[0]?.message?.content?.trim();
            if (!content) {
                throw new Error('Empty response from AI');
            }

            // Parse JSON response
            const parsed = JSON.parse(content);

            return {
                companyId: '', // Will be set by caller
                date: transaction.date,
                debit: {
                    account: parsed.debit.account,
                    amount: parsed.debit.amount,
                    description: parsed.debit.description,
                    gapsmeClassification: parsed.gapsmeClassification,
                    ifrsStandard: parsed.ifrsStandard,
                },
                credit: {
                    account: parsed.credit.account,
                    amount: parsed.credit.amount,
                    description: parsed.credit.description,
                    gapsmeClassification: parsed.gapsmeClassification,
                    ifrsStandard: parsed.ifrsStandard,
                },
                reference: parsed.reference || this.generateReference(transaction.date),
                narrative: parsed.narrative,
                type: 'JOURNAL',
                automated: true,
                aiGenerated: true,
                confidenceScore: parsed.confidence || 0.85,
                reviewRequired: false,
            };
        } catch (error) {
            console.warn('[JournalEntryAgent] AI generation failed, using rules:', error);
            return this.ruleBasedJournalEntry(transaction, chartOfAccounts);
        }
    }

    /**
     * Rule-based journal entry generation (fallback).
     */
    private ruleBasedJournalEntry(
        transaction: RawTransaction,
        chartOfAccounts: Account[]
    ): JournalEntry {
        const description = transaction.description.toLowerCase();

        // Simple keyword-based classification
        let debitAccount = '5900'; // Miscellaneous expense
        let creditAccount = '2600'; // Trade payables (default)
        let gapsmeClass = 'Administrative expenses';
        let ifrsStandard = 'IAS 1';

        // Purchase patterns
        if (description.includes('purchase') || description.includes('bought')) {
            if (description.includes('equipment') || description.includes('machine')) {
                debitAccount = '1020'; // Plant & Machinery
                gapsmeClass = 'Non-current assets - Property, plant and equipment';
                ifrsStandard = 'IAS 16 - Property, Plant and Equipment';
            } else if (description.includes('furniture')) {
                debitAccount = '1030'; // Furniture & Fixtures
                gapsmeClass = 'Non-current assets - Property, plant and equipment';
                ifrsStandard = 'IAS 16 - Property, Plant and Equipment';
            } else if (description.includes('computer') || description.includes('laptop')) {
                debitAccount = '1050'; // Computer Equipment
                gapsmeClass = 'Non-current assets - Property, plant and equipment';
                ifrsStandard = 'IAS 16 - Property, Plant and Equipment';
            } else if (description.includes('inventory') || description.includes('stock')) {
                debitAccount = '1500'; // Inventories
                gapsmeClass = 'Current assets - Inventories';
                ifrsStandard = 'IAS 2 - Inventories';
            } else if (description.includes('office supplies') || description.includes('stationery')) {
                debitAccount = '5300'; // Office Expenses
                gapsmeClass = 'Administrative expenses';
                ifrsStandard = 'IAS 1';
            }
        }

        // Expense patterns
        if (description.includes('rent')) {
            debitAccount = '5200';
            gapsmeClass = 'Administrative expenses - Rent';
        } else if (description.includes('salary') || description.includes('wages')) {
            debitAccount = '5100';
            creditAccount = '2660'; // Salaries Payable
            gapsmeClass = 'Administrative expenses - Salaries';
            ifrsStandard = 'IAS 19 - Employee Benefits';
        } else if (description.includes('insurance')) {
            debitAccount = '5500';
            gapsmeClass = 'Administrative expenses - Insurance';
        } else if (description.includes('professional fee') || description.includes('consulting')) {
            debitAccount = '5400';
            gapsmeClass = 'Administrative expenses - Professional fees';
        } else if (description.includes('depreciation')) {
            debitAccount = '5550';
            creditAccount = '1099'; // Accumulated Depreciation
            gapsmeClass = 'Administrative expenses - Depreciation';
            ifrsStandard = 'IAS 16';
        }

        // Payment patterns
        if (description.includes('paid') || description.includes('payment')) {
            creditAccount = '1660'; // Bank Account
        }

        // Receipt patterns
        if (description.includes('received') || description.includes('collected')) {
            debitAccount = '1660'; // Bank Account
            creditAccount = '3000'; // Sales Revenue
            gapsmeClass = 'Revenue';
            ifrsStandard = 'IFRS 15';
        }

        // Sales patterns
        if (description.includes('sale') || description.includes('sold') || description.includes('revenue')) {
            debitAccount = '1550'; // Trade Receivables
            creditAccount = '3000'; // Sales Revenue
            gapsmeClass = 'Revenue';
            ifrsStandard = 'IFRS 15 - Revenue from Contracts with Customers';
        }

        return {
            companyId: '',
            date: transaction.date,
            debit: {
                account: debitAccount,
                amount: transaction.amount,
                description: `${transaction.description} - Debit`,
                gapsmeClassification: gapsmeClass,
                ifrsStandard: ifrsStandard,
            },
            credit: {
                account: creditAccount,
                amount: transaction.amount,
                description: `${transaction.description} - Credit`,
                gapsmeClassification: gapsmeClass,
                ifrsStandard: ifrsStandard,
            },
            reference: this.generateReference(transaction.date),
            narrative: transaction.description,
            type: 'JOURNAL',
            automated: true,
            aiGenerated: false,
            confidenceScore: 0.60, // Lower confidence for rule-based
            reviewRequired: true, // Always require review for rule-based
        };
    }

    /**
     * Validate double-entry principle.
     */
    validateDoubleEntry(entry: JournalEntry): JournalEntryValidation {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check amounts match
        if (Math.abs(entry.debit.amount - entry.credit.amount) > 0.01) {
            errors.push('Debit and credit amounts do not match');
        }

        // Check amounts are positive
        if (entry.debit.amount <= 0 || entry.credit.amount <= 0) {
            errors.push('Transaction amounts must be positive');
        }

        // Check accounts are specified
        if (!entry.debit.account || !entry.credit.account) {
            errors.push('Both debit and credit accounts must be specified');
        }

        // Check debit and credit accounts are different
        if (entry.debit.account === entry.credit.account) {
            errors.push('Debit and credit accounts cannot be the same');
        }

        // Warnings
        if (entry.debit.amount > 100000) {
            warnings.push('Large transaction amount - ensure proper authorization');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Generate a unique reference number.
     */
    private generateReference(date: Date): string {
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `JE-${dateStr}-${random}`;
    }

    /**
     * Batch process multiple transactions.
     */
    async batchProcess(
        transactions: RawTransaction[],
        chartOfAccounts: Account[]
    ): Promise<AgentResponse<JournalEntry>[]> {
        const results: AgentResponse<JournalEntry>[] = [];

        for (const transaction of transactions) {
            const result = await this.processTransaction(transaction, chartOfAccounts);
            results.push(result);
        }

        return results;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Journal Entry Agent instance.
 */
export function createJournalEntryAgent(config?: JournalEntryAgentConfig): JournalEntryAgent {
    return new JournalEntryAgent(config);
}

/**
 * Lazy singleton instance.
 */
let _journalEntryAgent: JournalEntryAgent | null = null;

export const journalEntryAgent = {
    instance(): JournalEntryAgent {
        if (!_journalEntryAgent) {
            _journalEntryAgent = new JournalEntryAgent();
        }
        return _journalEntryAgent;
    },
};
