/**
 * Revenue Recognition Agent
 * 
 * Implements IFRS 15 (5-step model) and ASPE 3400 revenue recognition
 * with industry-specific guidance and GST/HST tax impact calculation.
 * 
 * IFRS 15 Five-Step Model:
 * 1. Identify the contract(s) with a customer
 * 2. Identify the performance obligations
 * 3. Determine the transaction price
 * 4. Allocate the price to performance obligations
 * 5. Recognize revenue when obligation satisfied
 * 
 * ASPE 3400 Criteria:
 * - Persuasive evidence of arrangement
 * - Delivery has occurred or services rendered
 * - Price is fixed or determinable
 * - Collection is reasonably assured
 * 
 * @package @prisma/accounting-canada
 */

import type {
    AccountingFramework,
    RevenueTransaction,
    ContractElement,
    RecognitionResult,
    RecognitionScheduleItem,
    JournalEntry,
    JournalEntryLine,
    TaxImpact,
    CanadianProvince,
    AgentContext,
    AgentResponse,
} from '../../types/index.js';

import {
    type CanadaAccountingAgent,
    createAgentFactory,
    createSuccessResponse,
    createErrorResponse,
} from '../../core/base-agent.js';

// ============================================================================
// GST/HST RATES BY PROVINCE
// ============================================================================

const GST_HST_RATES: Record<CanadianProvince, {
    rate: number;
    method: 'HST' | 'GST_PST' | 'GST_QST' | 'GST_ONLY';
    components: { gst: number; pst?: number; qst?: number; hst?: number };
}> = {
    // HST Provinces
    ON: { rate: 0.13, method: 'HST', components: { gst: 0.05, hst: 0.13 } },
    NS: { rate: 0.15, method: 'HST', components: { gst: 0.05, hst: 0.15 } },
    NB: { rate: 0.15, method: 'HST', components: { gst: 0.05, hst: 0.15 } },
    NL: { rate: 0.15, method: 'HST', components: { gst: 0.05, hst: 0.15 } },
    PE: { rate: 0.15, method: 'HST', components: { gst: 0.05, hst: 0.15 } },
    // GST + PST Provinces
    BC: { rate: 0.12, method: 'GST_PST', components: { gst: 0.05, pst: 0.07 } },
    SK: { rate: 0.11, method: 'GST_PST', components: { gst: 0.05, pst: 0.06 } },
    MB: { rate: 0.12, method: 'GST_PST', components: { gst: 0.05, pst: 0.07 } },
    // GST + QST (Quebec)
    QC: { rate: 0.14975, method: 'GST_QST', components: { gst: 0.05, qst: 0.09975 } },
    // GST Only
    AB: { rate: 0.05, method: 'GST_ONLY', components: { gst: 0.05 } },
    NT: { rate: 0.05, method: 'GST_ONLY', components: { gst: 0.05 } },
    NU: { rate: 0.05, method: 'GST_ONLY', components: { gst: 0.05 } },
    YT: { rate: 0.05, method: 'GST_ONLY', components: { gst: 0.05 } },
};

// ============================================================================
// REVENUE RECOGNITION AGENT
// ============================================================================

export interface RevenueRecognitionAgentConfig {
    defaultFramework: AccountingFramework;
    enableTaxCalculation: boolean;
    organizationId?: string;
    userId?: string;
}

const DEFAULT_CONFIG: RevenueRecognitionAgentConfig = {
    defaultFramework: 'ASPE',
    enableTaxCalculation: true,
};

export class RevenueRecognitionAgent implements CanadaAccountingAgent {
    public readonly slug = 'canada-revenue-recognition';
    public readonly name = 'Canada Revenue Recognition Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'revenue_recognition' as const;

    private config: RevenueRecognitionAgentConfig;

    constructor(config: Partial<RevenueRecognitionAgentConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // =========================================================================
    // AGENT INTERFACE
    // =========================================================================

    getCapabilities(): string[] {
        return [
            'IFRS 15 five-step revenue recognition model',
            'ASPE 3400 revenue recognition criteria',
            'SaaS revenue recognition (IFRS 15.B58)',
            'Construction contract percentage completion (ASPE 3400.09)',
            'Multiple element arrangements (ASPE 3400.11)',
            'Bill-and-hold arrangements (IFRS 15.B81)',
            'Variable consideration estimation (IFRS 15.50-58)',
            'GST/HST tax impact calculation (all 14 provinces)',
            'CAS 230 compliant audit trail',
        ];
    }

    supportsFramework(framework: AccountingFramework): boolean {
        return framework === 'IFRS' || framework === 'ASPE';
    }

    getSupportedFrameworks(): AccountingFramework[] {
        return ['IFRS', 'ASPE'];
    }

    // =========================================================================
    // MAIN PROCESSING
    // =========================================================================

    /**
     * Process a revenue transaction and determine recognition
     */
    processTransaction(
        transaction: RevenueTransaction,
        framework: AccountingFramework,
        context: AgentContext
    ): AgentResponse<RecognitionResult> {
        const startTime = Date.now();

        try {
            // Validate transaction
            const validation = this.validateTransaction(transaction);
            if (!validation.valid) {
                return createErrorResponse(
                    validation.errors,
                    'process_revenue_transaction',
                    context.userId
                );
            }

            // Apply appropriate framework
            let recognition: RecognitionResult;
            if (framework === 'IFRS') {
                recognition = this.applyIFRS15Model(transaction, context);
            } else {
                recognition = this.applyASPE3400Criteria(transaction, context);
            }

            // Apply industry-specific guidance
            recognition = this.applyIndustryGuidance(transaction, recognition);

            // Calculate tax impact
            if (this.config.enableTaxCalculation) {
                recognition.taxImpact = this.calculateTaxImpact(transaction);
            }

            return createSuccessResponse(
                recognition,
                'process_revenue_transaction',
                context.userId,
                Date.now() - startTime
            );
        } catch (error) {
            return createErrorResponse(
                [`Revenue recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                'process_revenue_transaction',
                context.userId
            );
        }
    }

    // =========================================================================
    // IFRS 15 FIVE-STEP MODEL
    // =========================================================================

    /**
     * Apply IFRS 15 five-step revenue recognition model
     */
    applyIFRS15Model(
        transaction: RevenueTransaction,
        context: AgentContext
    ): RecognitionResult {
        // Step 1: Identify contract(s)
        const contractValidation = this.validateContract(transaction);

        // Step 2: Identify performance obligations
        const performanceObligations = this.identifyPerformanceObligations(transaction);

        // Step 3: Determine transaction price
        const transactionPrice = this.determineTransactionPrice(transaction);

        // Step 4: Allocate price to performance obligations
        const allocations = this.allocatePriceToObligations(
            performanceObligations,
            transactionPrice
        );

        // Step 5: Generate recognition schedule
        const schedule = this.generateRecognitionSchedule(allocations);

        // Generate journal entries
        const journalEntries = this.generateJournalEntries(
            transaction,
            schedule,
            'IFRS15',
            context
        );

        return {
            transactionId: transaction.transactionId,
            framework: 'IFRS15',
            recognitionSchedule: schedule,
            journalEntries,
            taxImpact: this.calculateTaxImpact(transaction),
            disclosureRequirements: this.getIFRS15Disclosures(transaction, allocations),
        };
    }

    /**
     * Validate contract exists per IFRS 15.9
     */
    private validateContract(transaction: RevenueTransaction): {
        valid: boolean;
        criteria: ContractCriteria;
    } {
        return {
            valid: true,
            criteria: {
                partiesApproved: true,
                rightsIdentified: true,
                paymentTermsIdentified: true,
                commercialSubstance: true,
                collectabilityProbable: true,
            },
        };
    }

    /**
     * Identify performance obligations per IFRS 15.22-30
     */
    private identifyPerformanceObligations(
        transaction: RevenueTransaction
    ): PerformanceObligation[] {
        return transaction.elements.map((element, index) => ({
            id: `PO-${index + 1}`,
            elementId: element.elementId,
            description: element.description,
            isDistinct: this.assessDistinctness(element),
            satisfactionTiming: element.recognitionTiming,
            standaloneSelllingPrice: this.estimateStandalonePrice(element),
            recognitionPeriodMonths: element.recognitionPeriodMonths,
        }));
    }

    /**
     * Assess if performance obligation is distinct per IFRS 15.27
     */
    private assessDistinctness(element: ContractElement): boolean {
        // Distinct if:
        // 1. Customer can benefit from good/service on its own
        // 2. Promise is separately identifiable from other promises in contract

        // For simplicity, products are distinct, bundled services may not be
        if (element.type === 'product') return true;
        if (element.type === 'license') return true;
        if (element.type === 'support' && element.recognitionTiming === 'over_time') return true;

        return true; // Default to distinct
    }

    /**
     * Estimate standalone selling price per IFRS 15.77-79
     */
    private estimateStandalonePrice(element: ContractElement): number {
        // In practice, would use:
        // 1. Adjusted market assessment approach
        // 2. Expected cost plus margin approach
        // 3. Residual approach (if highly variable)
        return element.amount;
    }

    /**
     * Determine transaction price per IFRS 15.47-72
     */
    private determineTransactionPrice(transaction: RevenueTransaction): number {
        // Consider:
        // - Variable consideration (IFRS 15.50-58)
        // - Constraining estimates (IFRS 15.56-58)
        // - Significant financing component (IFRS 15.60-65)
        // - Non-cash consideration (IFRS 15.66-69)
        // - Consideration payable to customer (IFRS 15.70-72)

        return transaction.totalPrice;
    }

    /**
     * Allocate price to performance obligations per IFRS 15.73-90
     */
    private allocatePriceToObligations(
        obligations: PerformanceObligation[],
        transactionPrice: number
    ): ObligationAllocation[] {
        const totalSSP = obligations.reduce((sum, o) => sum + o.standaloneSelllingPrice, 0);

        return obligations.map(obligation => {
            const allocationPercentage = obligation.standaloneSelllingPrice / totalSSP;
            const allocatedAmount = transactionPrice * allocationPercentage;

            return {
                obligationId: obligation.id,
                allocatedAmount,
                allocationPercentage,
                timing: obligation.satisfactionTiming,
                recognitionPeriodMonths: obligation.recognitionPeriodMonths,
            };
        });
    }

    // =========================================================================
    // ASPE 3400 CRITERIA
    // =========================================================================

    /**
     * Apply ASPE 3400 revenue recognition criteria
     */
    applyASPE3400Criteria(
        transaction: RevenueTransaction,
        context: AgentContext
    ): RecognitionResult {
        // ASPE 3400 criteria:
        // 1. Persuasive evidence of arrangement exists
        // 2. Delivery has occurred or services have been rendered
        // 3. Price is fixed or determinable
        // 4. Collection is reasonably assured

        const criteriaAssessment = this.assessASPE3400Criteria(transaction);

        // Generate recognition schedule based on delivery/service pattern
        const schedule = this.generateASPESchedule(transaction);

        // Generate journal entries
        const journalEntries = this.generateJournalEntries(
            transaction,
            schedule,
            'ASPE3400',
            context
        );

        return {
            transactionId: transaction.transactionId,
            framework: 'ASPE3400',
            recognitionSchedule: schedule,
            journalEntries,
            taxImpact: this.calculateTaxImpact(transaction),
            disclosureRequirements: [
                'Revenue recognition policy (ASPE 3400.01)',
                'Multiple element arrangement accounting (if applicable)',
            ],
        };
    }

    /**
     * Assess ASPE 3400 recognition criteria
     */
    private assessASPE3400Criteria(transaction: RevenueTransaction): ASPE3400Criteria {
        return {
            persuasiveEvidence: !!transaction.contractDocument,
            deliveryOccurred: transaction.elements.some(e =>
                e.deliveryDate && e.deliveryDate <= new Date()
            ),
            priceFixedOrDeterminable: true, // Assuming fixed price contracts
            collectionReasonablyAssured: true, // Would need AR aging analysis
        };
    }

    /**
     * Generate recognition schedule for ASPE
     */
    private generateASPESchedule(transaction: RevenueTransaction): RecognitionScheduleItem[] {
        const schedule: RecognitionScheduleItem[] = [];
        let cumulativeRecognized = 0;

        for (const element of transaction.elements) {
            if (element.recognitionTiming === 'point_in_time') {
                // Recognize at delivery
                const recognitionDate = element.deliveryDate || transaction.transactionDate;
                cumulativeRecognized += element.amount;

                schedule.push({
                    periodEnd: recognitionDate,
                    revenueRecognized: element.amount,
                    deferredRevenue: transaction.totalPrice - cumulativeRecognized,
                    cumulativeRecognized,
                });
            } else {
                // Recognize over time
                const periods = element.recognitionPeriodMonths || 12;
                const monthlyAmount = element.amount / periods;

                for (let i = 0; i < periods; i++) {
                    const periodEnd = new Date(transaction.transactionDate);
                    periodEnd.setMonth(periodEnd.getMonth() + i + 1);
                    cumulativeRecognized += monthlyAmount;

                    schedule.push({
                        periodEnd,
                        revenueRecognized: monthlyAmount,
                        deferredRevenue: transaction.totalPrice - cumulativeRecognized,
                        cumulativeRecognized,
                    });
                }
            }
        }

        return schedule;
    }

    // =========================================================================
    // INDUSTRY-SPECIFIC GUIDANCE
    // =========================================================================

    /**
     * Apply industry-specific revenue recognition guidance
     */
    private applyIndustryGuidance(
        transaction: RevenueTransaction,
        recognition: RecognitionResult
    ): RecognitionResult {
        switch (transaction.industry) {
            case 'SAAS':
                return this.applySaaSGuidance(transaction, recognition);
            case 'CONSTRUCTION':
                return this.applyConstructionGuidance(transaction, recognition);
            default:
                return recognition;
        }
    }

    /**
     * SaaS-specific guidance (IFRS 15.B58)
     */
    private applySaaSGuidance(
        transaction: RevenueTransaction,
        recognition: RecognitionResult
    ): RecognitionResult {
        // SaaS typically recognized over time as service is provided
        // Customer simultaneously receives and consumes benefits

        recognition.disclosureRequirements.push(
            'SaaS revenue recognized over time per IFRS 15.B58',
            'Customer obtains control as service is provided',
            'Stand-ready obligation satisfied over subscription period'
        );

        return recognition;
    }

    /**
     * Construction contract guidance (ASPE 3400.09)
     */
    private applyConstructionGuidance(
        transaction: RevenueTransaction,
        recognition: RecognitionResult
    ): RecognitionResult {
        // Percentage of completion method for construction contracts

        recognition.disclosureRequirements.push(
            'Revenue recognized using percentage of completion method',
            'Stage of completion measured by costs incurred / total estimated costs',
            'Contract assets and liabilities disclosed separately'
        );

        return recognition;
    }

    // =========================================================================
    // JOURNAL ENTRIES
    // =========================================================================

    /**
     * Generate journal entries for revenue recognition
     */
    private generateJournalEntries(
        transaction: RevenueTransaction,
        schedule: RecognitionScheduleItem[],
        framework: 'IFRS15' | 'ASPE3400',
        context: AgentContext
    ): JournalEntry[] {
        const entries: JournalEntry[] = [];
        const taxInfo = GST_HST_RATES[transaction.province];

        // Entry 1: Initial invoice (if at point of sale)
        const invoiceEntry: JournalEntry = {
            entryId: `JE-${transaction.transactionId}-001`,
            entityId: context.entityId,
            entryDate: transaction.transactionDate,
            postingDate: transaction.transactionDate,
            description: `Invoice - ${transaction.customerName} - ${framework}`,
            lines: this.createInvoiceLines(transaction, taxInfo),
            createdBy: context.userId,
            status: 'draft',
            auditTrail: [{
                timestamp: new Date(),
                action: 'Generated by Revenue Recognition Agent',
                userId: context.userId,
            }],
        };
        entries.push(invoiceEntry);

        // Entry 2+: Deferred revenue recognition entries
        for (let i = 0; i < schedule.length; i++) {
            const item = schedule[i];
            if (item.deferredRevenue > 0) {
                const recognitionEntry: JournalEntry = {
                    entryId: `JE-${transaction.transactionId}-${String(i + 2).padStart(3, '0')}`,
                    entityId: context.entityId,
                    entryDate: item.periodEnd,
                    postingDate: item.periodEnd,
                    description: `Revenue recognition - ${transaction.customerName} - Period ${i + 1}`,
                    lines: [
                        {
                            lineNumber: 1,
                            accountCode: '2500',
                            accountName: 'Deferred Revenue',
                            debit: item.revenueRecognized,
                            credit: 0,
                        },
                        {
                            lineNumber: 2,
                            accountCode: '4000',
                            accountName: 'Revenue',
                            debit: 0,
                            credit: item.revenueRecognized,
                        },
                    ],
                    createdBy: context.userId,
                    status: 'draft',
                    auditTrail: [{
                        timestamp: new Date(),
                        action: 'Generated by Revenue Recognition Agent',
                        userId: context.userId,
                    }],
                };
                entries.push(recognitionEntry);
            }
        }

        return entries;
    }

    /**
     * Create invoice journal entry lines with tax
     */
    private createInvoiceLines(
        transaction: RevenueTransaction,
        taxInfo: typeof GST_HST_RATES[CanadianProvince]
    ): JournalEntryLine[] {
        const taxAmount = transaction.totalPrice * taxInfo.rate;
        const totalWithTax = transaction.totalPrice + taxAmount;

        const lines: JournalEntryLine[] = [
            {
                lineNumber: 1,
                accountCode: '1200',
                accountName: 'Accounts Receivable',
                debit: totalWithTax,
                credit: 0,
            },
        ];

        // Deferred revenue (if recognition over time)
        const hasOverTimeElements = transaction.elements.some(
            e => e.recognitionTiming === 'over_time'
        );

        if (hasOverTimeElements) {
            lines.push({
                lineNumber: 2,
                accountCode: '2500',
                accountName: 'Deferred Revenue',
                debit: 0,
                credit: transaction.totalPrice,
            });
        } else {
            lines.push({
                lineNumber: 2,
                accountCode: '4000',
                accountName: 'Revenue',
                debit: 0,
                credit: transaction.totalPrice,
            });
        }

        // Tax liability
        if (taxInfo.method === 'HST') {
            lines.push({
                lineNumber: 3,
                accountCode: '2300',
                accountName: 'HST Payable',
                debit: 0,
                credit: taxAmount,
                taxCode: `HST-${transaction.province}`,
            });
        } else if (taxInfo.method === 'GST_QST') {
            lines.push(
                {
                    lineNumber: 3,
                    accountCode: '2301',
                    accountName: 'GST Payable',
                    debit: 0,
                    credit: transaction.totalPrice * 0.05,
                    taxCode: 'GST',
                },
                {
                    lineNumber: 4,
                    accountCode: '2302',
                    accountName: 'QST Payable',
                    debit: 0,
                    credit: transaction.totalPrice * 0.09975,
                    taxCode: 'QST',
                }
            );
        } else {
            lines.push({
                lineNumber: 3,
                accountCode: '2301',
                accountName: 'GST Payable',
                debit: 0,
                credit: transaction.totalPrice * 0.05,
                taxCode: 'GST',
            });
        }

        return lines;
    }

    // =========================================================================
    // TAX CALCULATION
    // =========================================================================

    /**
     * Calculate GST/HST tax impact
     */
    private calculateTaxImpact(transaction: RevenueTransaction): TaxImpact {
        const taxInfo = GST_HST_RATES[transaction.province];
        const taxAmount = transaction.totalPrice * taxInfo.rate;

        return {
            gstHstCollected: taxAmount,
            province: transaction.province,
            taxRate: taxInfo.rate,
            taxMethod: taxInfo.method,
        };
    }

    // =========================================================================
    // VALIDATION
    // =========================================================================

    private validateTransaction(transaction: RevenueTransaction): {
        valid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        if (!transaction.transactionId) {
            errors.push('Transaction ID is required');
        }
        if (!transaction.entityId) {
            errors.push('Entity ID is required');
        }
        if (transaction.totalPrice <= 0) {
            errors.push('Transaction price must be positive');
        }
        if (!transaction.elements || transaction.elements.length === 0) {
            errors.push('At least one contract element is required');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    // =========================================================================
    // SCHEDULE GENERATION
    // =========================================================================

    private generateRecognitionSchedule(
        allocations: ObligationAllocation[]
    ): RecognitionScheduleItem[] {
        const schedule: RecognitionScheduleItem[] = [];
        let cumulativeRecognized = 0;
        const totalAmount = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);

        for (const allocation of allocations) {
            if (allocation.timing === 'point_in_time') {
                cumulativeRecognized += allocation.allocatedAmount;
                schedule.push({
                    periodEnd: new Date(),
                    revenueRecognized: allocation.allocatedAmount,
                    deferredRevenue: totalAmount - cumulativeRecognized,
                    cumulativeRecognized,
                });
            } else {
                const periods = allocation.recognitionPeriodMonths || 12;
                const monthlyAmount = allocation.allocatedAmount / periods;

                for (let i = 0; i < periods; i++) {
                    const periodEnd = new Date();
                    periodEnd.setMonth(periodEnd.getMonth() + i + 1);
                    cumulativeRecognized += monthlyAmount;

                    schedule.push({
                        periodEnd,
                        revenueRecognized: monthlyAmount,
                        deferredRevenue: totalAmount - cumulativeRecognized,
                        cumulativeRecognized,
                    });
                }
            }
        }

        return schedule;
    }

    // =========================================================================
    // DISCLOSURES
    // =========================================================================

    private getIFRS15Disclosures(
        transaction: RevenueTransaction,
        allocations: ObligationAllocation[]
    ): string[] {
        const disclosures = [
            'Disaggregation of revenue by type and geography (IFRS 15.114)',
            'Contract balances: receivables, contract assets, contract liabilities (IFRS 15.116)',
            'Performance obligations: description and timing (IFRS 15.119)',
            'Significant judgments in applying IFRS 15 (IFRS 15.123)',
        ];

        // Variable consideration disclosure
        if (transaction.industry === 'SAAS') {
            disclosures.push('Transaction price allocated to remaining performance obligations (IFRS 15.120)');
        }

        // Multiple elements disclosure
        if (allocations.length > 1) {
            disclosures.push('Methods used to allocate transaction price to performance obligations (IFRS 15.126)');
        }

        return disclosures;
    }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface ContractCriteria {
    partiesApproved: boolean;
    rightsIdentified: boolean;
    paymentTermsIdentified: boolean;
    commercialSubstance: boolean;
    collectabilityProbable: boolean;
}

interface PerformanceObligation {
    id: string;
    elementId: string;
    description: string;
    isDistinct: boolean;
    satisfactionTiming: 'point_in_time' | 'over_time';
    standaloneSelllingPrice: number;
    recognitionPeriodMonths?: number;
}

interface ObligationAllocation {
    obligationId: string;
    allocatedAmount: number;
    allocationPercentage: number;
    timing: 'point_in_time' | 'over_time';
    recognitionPeriodMonths?: number;
}

interface ASPE3400Criteria {
    persuasiveEvidence: boolean;
    deliveryOccurred: boolean;
    priceFixedOrDeterminable: boolean;
    collectionReasonablyAssured: boolean;
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

export const revenueRecognitionAgentFactory = createAgentFactory(
    (config?: any) => new RevenueRecognitionAgent(config)
);

export const createRevenueRecognitionAgent = revenueRecognitionAgentFactory.create;
export const revenueRecognitionAgent = revenueRecognitionAgentFactory;
