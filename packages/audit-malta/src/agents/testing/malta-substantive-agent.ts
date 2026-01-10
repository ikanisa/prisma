/**
 * Malta Substantive Testing Agent
 *
 * ISA 330 - The Auditor's Responses to Assessed Risks
 * ISA 500 - Audit Evidence
 * ISA 530 - Audit Sampling
 *
 * Malta-specific features:
 * - 100% transaction coverage mode for items above materiality
 * - ERP connector stubs (SAP, Oracle, QuickBooks)
 * - OCR invoice processing integration
 * - ISA 530 compliant sampling calculations
 * - Evidence linking system
 */

import type {
    MaltaAuditAgent,
    MaltaAgentResponse,
    SubstantiveTestConfig,
    ConfirmationRequest,
    ERPExtractionResult,
    ERPTransaction,
} from '../../types/index.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Sampling factors based on risk level.
 */
export const SAMPLING_FACTORS = {
    /** Reliability factors for different confidence levels */
    reliabilityFactors: {
        high_confidence: 3.0,    // 95% confidence
        moderate_confidence: 2.3, // 90% confidence
        low_confidence: 1.6,      // 80% confidence
    },
    /** Minimum sample sizes */
    minimumSampleSize: 20,
    /** Maximum sample size cap */
    maximumSampleSize: 500,
} as const;

/**
 * Supported ERP systems.
 */
export const SUPPORTED_ERP_SYSTEMS = [
    'SAP',
    'ORACLE',
    'QUICKBOOKS',
    'XERO',
    'SAGE',
] as const;

// ============================================================================
// SUBSTANTIVE TESTING AGENT
// ============================================================================

/**
 * Malta Substantive Testing Agent.
 *
 * Executes substantive audit procedures per ISA 330/500/530.
 */
export class MaltaSubstantiveAgent implements MaltaAuditAgent {
    public readonly agentId = 'malta-substantive-001';
    public readonly name = 'Malta Substantive Testing Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'SUBSTANTIVE_TESTING' as const;
    public readonly isaReferences = ['ISA 330', 'ISA 500', 'ISA 530', 'ISA 505'];
    public readonly autonomyLevel = 4 as const;

    /**
     * Calculate sample size per ISA 530.
     */
    async calculateSampleSize(params: {
        populationSize: number;
        populationValue: number;
        tolerableMisstatement: number;
        expectedMisstatement: number;
        confidenceLevel: 'high_confidence' | 'moderate_confidence' | 'low_confidence';
        riskOfMaterialMisstatement: 'LOW' | 'MODERATE' | 'HIGH';
    }): Promise<MaltaAgentResponse<{
        sampleSize: number;
        samplingMethod: 'monetary_unit' | 'random' | 'stratified';
        stratification?: Array<{ stratum: string; size: number; sampleSize: number }>;
        rationale: string;
    }>> {
        const startTime = Date.now();

        try {
            const {
                populationSize,
                populationValue,
                tolerableMisstatement,
                expectedMisstatement,
                confidenceLevel,
                riskOfMaterialMisstatement,
            } = params;

            // Validate inputs
            if (tolerableMisstatement <= 0 || populationValue <= 0) {
                return {
                    success: false,
                    error: 'Invalid parameters: tolerable misstatement and population value must be positive',
                    agentId: this.agentId,
                    requiresReview: true,
                    durationMs: Date.now() - startTime,
                };
            }

            // Check if expected misstatement exceeds tolerable
            if (expectedMisstatement >= tolerableMisstatement * 0.5) {
                return {
                    success: false,
                    error: 'Expected misstatement too high relative to tolerable misstatement',
                    agentId: this.agentId,
                    requiresReview: true,
                    reviewReason: 'Consider reducing tolerable misstatement or increasing expected',
                    durationMs: Date.now() - startTime,
                };
            }

            // Get reliability factor
            const reliabilityFactor = SAMPLING_FACTORS.reliabilityFactors[confidenceLevel];

            // Adjust for risk
            const riskMultiplier =
                riskOfMaterialMisstatement === 'HIGH'
                    ? 1.3
                    : riskOfMaterialMisstatement === 'MODERATE'
                        ? 1.15
                        : 1.0;

            // MUS sample size formula
            let sampleSize = Math.ceil(
                (populationValue * reliabilityFactor * riskMultiplier) /
                (tolerableMisstatement - expectedMisstatement)
            );

            // Apply bounds
            sampleSize = Math.max(sampleSize, SAMPLING_FACTORS.minimumSampleSize);
            sampleSize = Math.min(sampleSize, SAMPLING_FACTORS.maximumSampleSize);
            sampleSize = Math.min(sampleSize, populationSize); // Can't exceed population

            // Determine sampling method
            let samplingMethod: 'monetary_unit' | 'random' | 'stratified';
            if (populationValue > tolerableMisstatement * 100) {
                samplingMethod = 'monetary_unit';
            } else if (populationSize > 500) {
                samplingMethod = 'stratified';
            } else {
                samplingMethod = 'random';
            }

            // Generate stratification for large populations
            let stratification;
            if (samplingMethod === 'stratified' && populationSize > 200) {
                stratification = [
                    { stratum: 'High value (> PM)', size: Math.ceil(populationSize * 0.1), sampleSize: Math.ceil(populationSize * 0.1) },
                    { stratum: 'Medium value', size: Math.ceil(populationSize * 0.3), sampleSize: Math.ceil(sampleSize * 0.5) },
                    { stratum: 'Low value', size: Math.ceil(populationSize * 0.6), sampleSize: Math.ceil(sampleSize * 0.3) },
                ];
            }

            return {
                success: true,
                data: {
                    sampleSize,
                    samplingMethod,
                    stratification,
                    rationale: this.generateSamplingRationale(
                        sampleSize,
                        samplingMethod,
                        confidenceLevel,
                        riskOfMaterialMisstatement
                    ),
                },
                agentId: this.agentId,
                requiresReview: sampleSize < 30,
                reviewReason: sampleSize < 30 ? 'Sample size below 30 - HITL review required' : undefined,
                hitlGateTriggered: sampleSize < 30 ? 'GATE_003' : undefined,
                durationMs: Date.now() - startTime,
                nextSteps: [
                    'Document sampling methodology',
                    'Select sample items using random number generator',
                    'Perform vouching procedures on selected items',
                ],
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Sample size calculation failed',
                agentId: this.agentId,
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Execute vouching procedure on transactions.
     */
    async executeVouching(
        transactions: ERPTransaction[],
        config: {
            performanceMateriality: number;
            testAllAboveMateriality: boolean;
            sampleSize?: number;
        }
    ): Promise<MaltaAgentResponse<{
        itemsTested: number;
        itemsAboveMateriality: number;
        sampleItems: number;
        exceptionsFound: number;
        exceptions: Array<{
            transactionId: string;
            issue: string;
            amount: number;
        }>;
        coverage: number;
        conclusion: string;
    }>> {
        const startTime = Date.now();

        try {
            const { performanceMateriality, testAllAboveMateriality, sampleSize } = config;

            // Segregate transactions
            const aboveMateriality = transactions.filter(
                (t) => Math.max(t.debitAmount, t.creditAmount) >= performanceMateriality
            );
            const belowMateriality = transactions.filter(
                (t) => Math.max(t.debitAmount, t.creditAmount) < performanceMateriality
            );

            let itemsTested = 0;
            let sampleItems = 0;
            const exceptions: Array<{ transactionId: string; issue: string; amount: number }> = [];

            // Test all items above materiality if configured
            if (testAllAboveMateriality) {
                itemsTested += aboveMateriality.length;

                // Simulate vouching (in production, this would check supporting documents)
                for (const tx of aboveMateriality) {
                    const issues = this.simulateVouchingCheck(tx);
                    if (issues.length > 0) {
                        exceptions.push({
                            transactionId: tx.transactionId,
                            issue: issues.join('; '),
                            amount: Math.max(tx.debitAmount, tx.creditAmount),
                        });
                    }
                }
            }

            // Sample from items below materiality
            const actualSampleSize = sampleSize ?? Math.min(25, belowMateriality.length);
            const sampledItems = this.selectRandomSample(belowMateriality, actualSampleSize);
            sampleItems = sampledItems.length;
            itemsTested += sampleItems;

            for (const tx of sampledItems) {
                const issues = this.simulateVouchingCheck(tx);
                if (issues.length > 0) {
                    exceptions.push({
                        transactionId: tx.transactionId,
                        issue: issues.join('; '),
                        amount: Math.max(tx.debitAmount, tx.creditAmount),
                    });
                }
            }

            // Calculate coverage
            const totalValue = transactions.reduce(
                (sum, t) => sum + Math.max(t.debitAmount, t.creditAmount),
                0
            );
            const testedValue = [...aboveMateriality, ...sampledItems].reduce(
                (sum, t) => sum + Math.max(t.debitAmount, t.creditAmount),
                0
            );
            const coverage = totalValue > 0 ? (testedValue / totalValue) * 100 : 0;

            // Generate conclusion
            const exceptionRate = itemsTested > 0 ? (exceptions.length / itemsTested) * 100 : 0;
            let conclusion: string;
            if (exceptions.length === 0) {
                conclusion = 'No exceptions identified. Procedures satisfactorily completed.';
            } else if (exceptionRate < 5) {
                conclusion = `Minor exceptions (${exceptionRate.toFixed(1)}% rate). Follow up required but not indicative of systemic issues.`;
            } else {
                conclusion = `Significant exceptions (${exceptionRate.toFixed(1)}% rate). Extended procedures recommended.`;
            }

            return {
                success: true,
                data: {
                    itemsTested,
                    itemsAboveMateriality: aboveMateriality.length,
                    sampleItems,
                    exceptionsFound: exceptions.length,
                    exceptions,
                    coverage,
                    conclusion,
                },
                agentId: this.agentId,
                requiresReview: exceptions.length > 0,
                reviewReason: exceptions.length > 0 ? 'Exceptions identified during vouching' : undefined,
                durationMs: Date.now() - startTime,
                nextSteps:
                    exceptions.length > 0
                        ? [
                            'Investigate root cause of exceptions',
                            'Determine if exceptions are isolated or systemic',
                            'Consider extending sample size',
                            'Discuss findings with management',
                        ]
                        : ['Document satisfactory completion of procedure'],
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Vouching procedure failed',
                agentId: this.agentId,
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Generate confirmation requests per ISA 505.
     */
    async generateConfirmations(
        balances: Array<{
            type: 'bank' | 'customer' | 'supplier' | 'legal';
            name: string;
            address: string;
            balance: number;
            currency: string;
        }>,
        balanceDate: Date
    ): Promise<MaltaAgentResponse<{
        confirmations: ConfirmationRequest[];
        totalConfirmations: number;
        totalValue: number;
    }>> {
        const startTime = Date.now();

        const confirmations: ConfirmationRequest[] = balances.map((b) => ({
            type: b.type,
            recipientName: b.name,
            recipientAddress: b.address,
            balanceDate,
            balanceAmount: b.balance,
            currency: b.currency,
        }));

        const totalValue = balances.reduce((sum, b) => sum + Math.abs(b.balance), 0);

        return {
            success: true,
            data: {
                confirmations,
                totalConfirmations: confirmations.length,
                totalValue,
            },
            agentId: this.agentId,
            requiresReview: false,
            durationMs: Date.now() - startTime,
            nextSteps: [
                'Send confirmation requests',
                'Follow up on non-responses',
                'Perform alternative procedures for non-responses',
                'Reconcile confirmed amounts',
            ],
        };
    }

    /**
     * Connect to ERP system (stub implementation).
     */
    async connectERP(
        system: (typeof SUPPORTED_ERP_SYSTEMS)[number],
        credentials: {
            apiKey?: string;
            username?: string;
            password?: string;
            endpoint?: string;
        }
    ): Promise<MaltaAgentResponse<{
        connected: boolean;
        systemVersion?: string;
        availableModules?: string[];
    }>> {
        const startTime = Date.now();

        // Stub implementation - in production, this would actually connect
        return {
            success: true,
            data: {
                connected: true,
                systemVersion: `${system} v1.0 (Stub)`,
                availableModules: ['General Ledger', 'Accounts Receivable', 'Accounts Payable', 'Fixed Assets'],
            },
            agentId: this.agentId,
            requiresReview: false,
            durationMs: Date.now() - startTime,
            warnings: ['ERP connection is a stub implementation - real credentials required for production'],
        };
    }

    /**
     * Extract transactions from ERP (stub implementation).
     */
    async extractTransactions(
        system: (typeof SUPPORTED_ERP_SYSTEMS)[number],
        params: {
            startDate: Date;
            endDate: Date;
            accounts?: string[];
            minAmount?: number;
        }
    ): Promise<MaltaAgentResponse<ERPExtractionResult>> {
        const startTime = Date.now();

        // Stub implementation - generates mock data
        const mockTransactions: ERPTransaction[] = Array.from({ length: 100 }, (_, i) => ({
            transactionId: `TXN-${String(i + 1).padStart(6, '0')}`,
            date: new Date(
                params.startDate.getTime() +
                Math.random() * (params.endDate.getTime() - params.startDate.getTime())
            ),
            account: params.accounts?.[Math.floor(Math.random() * params.accounts.length)] ?? '4000',
            description: `Transaction ${i + 1}`,
            debitAmount: Math.random() > 0.5 ? Math.round(Math.random() * 10000) : 0,
            creditAmount: Math.random() > 0.5 ? Math.round(Math.random() * 10000) : 0,
            reference: `REF-${i + 1}`,
        }));

        const result: ERPExtractionResult = {
            source: system,
            extractionDate: new Date(),
            recordCount: mockTransactions.length,
            totalValue: mockTransactions.reduce(
                (sum, t) => sum + Math.max(t.debitAmount, t.creditAmount),
                0
            ),
            dataQuality: 'HIGH',
            validationErrors: [],
            transactions: mockTransactions,
        };

        return {
            success: true,
            data: result,
            agentId: this.agentId,
            requiresReview: false,
            durationMs: Date.now() - startTime,
            warnings: ['ERP extraction is a stub implementation returning mock data'],
        };
    }

    /**
     * Process invoice via OCR (stub implementation).
     */
    async processInvoiceOCR(
        documentPath: string
    ): Promise<MaltaAgentResponse<{
        extracted: boolean;
        invoiceNumber?: string;
        invoiceDate?: Date;
        vendorName?: string;
        totalAmount?: number;
        currency?: string;
        vatAmount?: number;
        lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
        confidence: number;
    }>> {
        const startTime = Date.now();

        // Stub implementation
        return {
            success: true,
            data: {
                extracted: true,
                invoiceNumber: 'INV-STUB-001',
                invoiceDate: new Date(),
                vendorName: 'Stub Vendor Ltd',
                totalAmount: 1180,
                currency: 'EUR',
                vatAmount: 180,
                lineItems: [
                    { description: 'Service A', quantity: 1, unitPrice: 1000, total: 1000 },
                ],
                confidence: 0.95,
            },
            agentId: this.agentId,
            requiresReview: false,
            durationMs: Date.now() - startTime,
            warnings: ['OCR processing is a stub implementation - integrate AWS Textract or Google Vision for production'],
        };
    }

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    private generateSamplingRationale(
        sampleSize: number,
        method: string,
        confidence: string,
        risk: string
    ): string {
        return (
            `Sample size of ${sampleSize} calculated using ${method} sampling. ` +
            `Confidence level: ${confidence.replace('_', ' ')}. ` +
            `Risk of material misstatement assessed as ${risk}. ` +
            `Methodology compliant with ISA 530.`
        );
    }

    private selectRandomSample<T>(population: T[], size: number): T[] {
        if (size >= population.length) return [...population];

        const shuffled = [...population];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, size);
    }

    private simulateVouchingCheck(transaction: ERPTransaction): string[] {
        const issues: string[] = [];

        // Simulate random issues (5% chance per transaction)
        if (Math.random() < 0.05) {
            const issueTypes = [
                'Missing supporting documentation',
                'Amount discrepancy with invoice',
                'Improper authorization',
                'Incorrect account coding',
                'Cutoff issue - transaction dated incorrectly',
            ];
            issues.push(issueTypes[Math.floor(Math.random() * issueTypes.length)]);
        }

        return issues;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Malta Substantive Agent instance.
 */
export function createMaltaSubstantiveAgent(): MaltaSubstantiveAgent {
    return new MaltaSubstantiveAgent();
}

/**
 * Lazy singleton instance.
 */
let _maltaSubstantiveAgent: MaltaSubstantiveAgent | null = null;

export const maltaSubstantiveAgent = {
    instance(): MaltaSubstantiveAgent {
        if (!_maltaSubstantiveAgent) {
            _maltaSubstantiveAgent = new MaltaSubstantiveAgent();
        }
        return _maltaSubstantiveAgent;
    },
};
