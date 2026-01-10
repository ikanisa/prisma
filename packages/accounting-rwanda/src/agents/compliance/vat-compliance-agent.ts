/**
 * Rwanda VAT Compliance Agent
 * 
 * Manages VAT categorization, calculation, reconciliation, and return preparation.
 * Based on RRA Tax Code and VAT Law 016/2018.
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
    VATCategory,
    RwandaVATCalculation,
    VATReturn,
    TransactionInput,
} from '../../types/index.js';
import {
    RWANDA_TAX_RATES_2026,
    VAT_THRESHOLDS,
} from '../../types/index.js';

// ============================================================================
// VAT CATEGORIES
// ============================================================================

/**
 * VAT-exempt categories per RRA.
 */
const VAT_EXEMPT_CATEGORIES = [
    'basic-foodstuffs',      // Rice, maize flour, bread, milk
    'health-services',       // Medical services and medicines
    'education-services',    // Educational services
    'financial-services',    // Banking, insurance
    'transportation',        // Public transport
    'residential-rental',    // Residential property rentals
    'agricultural-inputs',   // Seeds, fertilizers
] as const;

/**
 * Zero-rated categories.
 */
const VAT_ZERO_RATED_CATEGORIES = [
    'exports',               // Goods exported outside Rwanda
    'eac-supplies',          // EAC intra-community supplies
    'afcfta-supplies',       // AfCFTA qualified goods
    'international-transport', // International transport services
    'diplomatic-supplies',   // Supplies to diplomatic missions
] as const;

// ============================================================================
// VAT AGENT
// ============================================================================

/**
 * Rwanda VAT Compliance Agent.
 */
export class VATComplianceAgent implements RwandaAccountingAgent {
    private static instance_: VATComplianceAgent | null = null;

    readonly agentId = 'rwanda-vat-agent';
    readonly name = 'Rwanda VAT Compliance Agent';
    readonly version = '1.0.0';
    readonly agentType: AgentType = 'COMPLIANCE_MONITORING';
    readonly capabilities = [
        'Categorize transactions for VAT treatment',
        'Calculate VAT at 18% standard rate',
        'Identify zero-rated supplies (exports, EAC, AfCFTA)',
        'Identify exempt supplies (health, education, food)',
        'Reconcile VAT between books and ISHEMA',
        'Prepare VAT returns for RRA submission',
        'Track VAT registration thresholds',
        'Validate EBM invoice sequences',
    ];
    readonly framework: RwandaAccountingFramework | 'ALL' = 'ALL';
    readonly autonomyLevel: AutonomyLevel = 4;
    readonly supportedCurrencies = ['RWF'];

    private vatRate: number;

    private constructor() {
        this.vatRate = RWANDA_TAX_RATES_2026.VAT_STANDARD;
    }

    /**
     * Get singleton instance.
     */
    static instance(): VATComplianceAgent {
        if (!VATComplianceAgent.instance_) {
            VATComplianceAgent.instance_ = new VATComplianceAgent();
        }
        return VATComplianceAgent.instance_;
    }

    /**
     * Categorize a transaction for VAT treatment.
     */
    categorizeTransaction(tx: TransactionInput): VATCategory {
        // Check for zero-rated first
        if (tx.isExport || tx.isEACSupply || tx.isAfCFTASupply) {
            return 'ZERO_RATED';
        }

        // Check for exempt categories based on description
        const description = tx.description.toLowerCase();

        for (const category of VAT_EXEMPT_CATEGORIES) {
            if (this.matchesCategory(description, category)) {
                return 'EXEMPT';
            }
        }

        // Default to standard rated
        return 'STANDARD';
    }

    /**
     * Calculate VAT for a transaction.
     */
    calculateVAT(
        netAmount: number,
        category: VATCategory = 'STANDARD'
    ): RwandaVATCalculation {
        let vatAmount = 0;
        let vatRate = 0;

        if (category === 'STANDARD') {
            vatRate = this.vatRate;
            vatAmount = this.roundRWF(netAmount * (vatRate / 100));
        }

        return {
            netAmount: this.roundRWF(netAmount),
            vatAmount,
            vatRate,
            grossAmount: this.roundRWF(netAmount + vatAmount),
            category,
            currency: 'RWF',
        };
    }

    /**
     * Process transaction with VAT calculation.
     */
    processTransaction(tx: TransactionInput): RwandaVATCalculation {
        const category = this.categorizeTransaction(tx);
        const calculation = this.calculateVAT(tx.amount, category);

        return {
            ...calculation,
            ebmInvoiceNumber: tx.ebmInvoiceNumber,
            isEACSupply: tx.isEACSupply,
            isAfCFTASupply: tx.isAfCFTASupply,
            originCertificateRequired: tx.isEACSupply || tx.isAfCFTASupply,
        };
    }

    /**
     * Calculate VAT for period returns.
     */
    async calculatePeriodVAT(
        transactions: TransactionInput[],
        context: AgentContext
    ): Promise<AgentResponse<{
        outputVAT: { standard: number; zeroRated: number; exempt: number };
        inputVAT: number;
        netVAT: number;
        transactionBreakdown: RwandaVATCalculation[];
    }>> {
        const startTime = Date.now();

        try {
            // Process all transactions
            const processed = transactions.map(tx => this.processTransaction(tx));

            // Separate by type (sales vs purchases)
            const sales = processed.filter((_, i) =>
                transactions[i].type === 'INCOME'
            );
            const purchases = processed.filter((_, i) =>
                transactions[i].type === 'EXPENSE'
            );

            // Calculate output VAT (on sales)
            const outputVAT = {
                standard: this.sum(sales.filter(s => s.category === 'STANDARD').map(s => s.vatAmount)),
                zeroRated: this.sum(sales.filter(s => s.category === 'ZERO_RATED').map(s => s.netAmount)),
                exempt: this.sum(sales.filter(s => s.category === 'EXEMPT').map(s => s.netAmount)),
            };

            // Calculate input VAT (on purchases) - only standard-rated
            const inputVAT = this.sum(
                purchases.filter(p => p.category === 'STANDARD').map(p => p.vatAmount)
            );

            // Net VAT
            const netVAT = outputVAT.standard - inputVAT;

            const result = {
                outputVAT,
                inputVAT,
                netVAT,
                transactionBreakdown: processed,
            };

            // Determine review requirement
            const reviewGate = determineReviewRequirement(
                0.95,
                Math.abs(netVAT),
                { confidenceMin: 0.90, amountMax: 20_000_000 }
            );

            return {
                success: true,
                data: result,
                confidenceScore: 0.95,
                requiresReview: reviewGate.required,
                reviewReason: reviewGate.reason,
                rraCompliant: true,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'VAT calculation failed',
                requiresReview: true,
                reviewReason: 'Calculation error',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Prepare VAT return for ISHEMA submission.
     */
    async prepareVATReturn(
        transactions: TransactionInput[],
        periodStart: Date,
        periodEnd: Date,
        context: AgentContext
    ): Promise<AgentResponse<VATReturn>> {
        const startTime = Date.now();

        try {
            const vatCalc = await this.calculatePeriodVAT(transactions, context);

            if (!vatCalc.success || !vatCalc.data) {
                throw new Error(vatCalc.error || 'VAT calculation failed');
            }

            const { outputVAT, inputVAT, netVAT } = vatCalc.data;

            // Count EBM invoices
            const ebmInvoiceCount = transactions.filter(tx => tx.ebmInvoiceNumber).length;

            const vatReturn: VATReturn = {
                period: {
                    start: periodStart,
                    end: periodEnd,
                    type: this.determinePeriodType(periodStart, periodEnd),
                },
                box1StandardRatedSupplies: this.roundRWF(outputVAT.standard / (this.vatRate / 100)),
                box1OutputVAT: outputVAT.standard,
                box2ZeroRatedSupplies: outputVAT.zeroRated,
                box3ExemptSupplies: outputVAT.exempt,
                box4TotalSupplies: this.roundRWF(
                    (outputVAT.standard / (this.vatRate / 100)) +
                    outputVAT.zeroRated +
                    outputVAT.exempt
                ),
                box5InputVAT: inputVAT,
                box6NetVAT: netVAT,
                box7Amount: Math.abs(netVAT),
                box7Type: netVAT >= 0 ? 'PAYABLE' : 'REFUNDABLE',
                ebmInvoiceCount,
                status: 'DRAFT',
            };

            return {
                success: true,
                data: vatReturn,
                confidenceScore: 0.95,
                requiresReview: true,
                reviewReason: 'VAT return requires review before ISHEMA submission',
                rraCompliant: true,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'VAT return preparation failed',
                requiresReview: true,
                reviewReason: 'Preparation error',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Check VAT registration requirement.
     */
    checkVATRegistrationRequired(
        annualTurnover: number,
        quarterlyTurnover?: number
    ): {
        required: boolean;
        reason: string;
        thresholdType: 'annual' | 'quarterly';
        deadline?: string;
    } {
        // Check quarterly threshold first
        if (quarterlyTurnover && quarterlyTurnover >= VAT_THRESHOLDS.QUARTERLY) {
            return {
                required: true,
                reason: `Quarterly turnover (RWF ${quarterlyTurnover.toLocaleString()}) exceeds threshold (RWF ${VAT_THRESHOLDS.QUARTERLY.toLocaleString()})`,
                thresholdType: 'quarterly',
                deadline: `${VAT_THRESHOLDS.REGISTRATION_DAYS} days from exceeding threshold`,
            };
        }

        // Check annual threshold
        if (annualTurnover >= VAT_THRESHOLDS.ANNUAL) {
            return {
                required: true,
                reason: `Annual turnover (RWF ${annualTurnover.toLocaleString()}) exceeds threshold (RWF ${VAT_THRESHOLDS.ANNUAL.toLocaleString()})`,
                thresholdType: 'annual',
                deadline: `${VAT_THRESHOLDS.REGISTRATION_DAYS} days from exceeding threshold`,
            };
        }

        return {
            required: false,
            reason: 'Turnover below VAT registration thresholds',
            thresholdType: 'annual',
        };
    }

    /**
     * Validate EBM invoice sequence for gaps.
     */
    validateEBMSequence(invoices: { invoiceNumber: string; date: Date }[]): {
        valid: boolean;
        gaps: string[];
        warnings: string[];
    } {
        const gaps: string[] = [];
        const warnings: string[] = [];

        // Sort by date and number
        const sorted = [...invoices].sort((a, b) => {
            const dateCompare = a.date.getTime() - b.date.getTime();
            if (dateCompare !== 0) return dateCompare;
            return a.invoiceNumber.localeCompare(b.invoiceNumber);
        });

        // Check for sequence gaps
        for (let i = 1; i < sorted.length; i++) {
            const prevNum = this.extractInvoiceNumber(sorted[i - 1].invoiceNumber);
            const currNum = this.extractInvoiceNumber(sorted[i].invoiceNumber);

            if (prevNum !== null && currNum !== null) {
                if (currNum - prevNum > 1) {
                    gaps.push(`Gap between ${sorted[i - 1].invoiceNumber} and ${sorted[i].invoiceNumber}`);
                }
            }
        }

        return {
            valid: gaps.length === 0,
            gaps,
            warnings,
        };
    }

    /**
     * Get VAT filing deadline.
     */
    getFilingDeadline(period: Date): Date {
        const deadline = new Date(period);
        deadline.setMonth(deadline.getMonth() + 1);
        deadline.setDate(15);
        return deadline;
    }

    /**
     * Match description to exempt category.
     */
    private matchesCategory(description: string, category: string): boolean {
        const keywords: Record<string, string[]> = {
            'basic-foodstuffs': ['rice', 'maize', 'flour', 'bread', 'milk', 'beans', 'potatoes'],
            'health-services': ['hospital', 'medical', 'medicine', 'pharmacy', 'clinic', 'doctor'],
            'education-services': ['school', 'university', 'tuition', 'education', 'training'],
            'financial-services': ['bank', 'interest', 'insurance', 'loan'],
            'transportation': ['transport', 'bus', 'taxi', 'moto'],
            'residential-rental': ['rent', 'residential', 'apartment', 'house rental'],
            'agricultural-inputs': ['seeds', 'fertilizer', 'pesticide', 'farming'],
        };

        const categoryKeywords = keywords[category] || [];
        return categoryKeywords.some(kw => description.includes(kw));
    }

    /**
     * Determine if period is monthly or quarterly.
     */
    private determinePeriodType(start: Date, end: Date): 'MONTHLY' | 'QUARTERLY' {
        const months = (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth());
        return months >= 2 ? 'QUARTERLY' : 'MONTHLY';
    }

    /**
     * Extract numeric portion of invoice number.
     */
    private extractInvoiceNumber(invoiceNum: string): number | null {
        const match = invoiceNum.match(/\d+$/);
        return match ? parseInt(match[0], 10) : null;
    }

    /**
     * Round to RWF.
     */
    private roundRWF(amount: number): number {
        return Math.round(amount);
    }

    /**
     * Sum array.
     */
    private sum(values: number[]): number {
        return values.reduce((a, b) => a + b, 0);
    }
}

/**
 * Factory function.
 */
export function createVATComplianceAgent(): VATComplianceAgent {
    return VATComplianceAgent.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const vatComplianceAgent = {
    instance: () => VATComplianceAgent.instance(),
};
