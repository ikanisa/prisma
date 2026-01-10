/**
 * Rwanda VAT Agent
 * 
 * RRA-compliant VAT calculation, categorization, and ISHEMA filing.
 * 
 * Legal Basis:
 * - VAT Law (Tax Procedure Law 016/2018)
 * - RRA VAT regulations and circulars
 * 
 * Features:
 * - 18% standard rate calculation
 * - Zero-rating (exports, EAC, AfCFTA)
 * - Exempt supplies (health, education, basic foodstuffs)
 * - VAT return preparation
 * - EBM invoice validation
 * - ISHEMA integration ready
 * 
 * @package @prisma/tax
 */

// ============================================================================
// TYPES
// ============================================================================

export type VATCategory = 'STANDARD' | 'ZERO_RATED' | 'EXEMPT';

export interface VATCalculation {
    netAmount: number;
    vatRate: number;
    vatAmount: number;
    grossAmount: number;
    category: VATCategory;
    currency: 'RWF';
}

export interface TransactionInput {
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    date: Date;
    isExport?: boolean;
    isEACSupply?: boolean;
    isAfCFTASupply?: boolean;
    ebmInvoiceNumber?: string;
}

export interface VATReturn {
    period: {
        start: Date;
        end: Date;
        type: 'MONTHLY' | 'QUARTERLY';
    };
    standardRatedSupplies: number;
    outputVAT: number;
    zeroRatedSupplies: number;
    exemptSupplies: number;
    totalSupplies: number;
    inputVAT: number;
    netVAT: number;
    amountDue: number;
    paymentType: 'PAYABLE' | 'REFUNDABLE';
    ebmInvoiceCount: number;
    status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
    submissionDate?: Date;
    referenceNumber?: string;
}

export interface RwandaVATAgentConfig {
    openaiApiKey?: string;
    rraEndpoint?: string;
    environment?: 'production' | 'sandbox';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VAT_STANDARD_RATE = 18;

const VAT_THRESHOLDS = {
    ANNUAL: 20_000_000,      // RWF 20M annual
    QUARTERLY: 5_000_000,    // RWF 5M quarterly
    REGISTRATION_DAYS: 7,    // Days to register after exceeding threshold
};

const EXEMPT_KEYWORDS: Record<string, string[]> = {
    'basic-foodstuffs': ['rice', 'maize', 'flour', 'bread', 'milk', 'beans', 'potatoes', 'cassava'],
    'health-services': ['hospital', 'medical', 'medicine', 'pharmacy', 'clinic', 'doctor', 'health'],
    'education-services': ['school', 'university', 'tuition', 'education', 'training', 'college'],
    'financial-services': ['bank', 'interest', 'insurance', 'loan', 'banking'],
    'transportation': ['transport', 'bus', 'taxi', 'moto', 'public transport'],
    'residential-rental': ['rent', 'residential', 'apartment', 'house rental'],
    'agricultural-inputs': ['seeds', 'fertilizer', 'pesticide', 'farming', 'agriculture'],
};

// ============================================================================
// RWANDA VAT AGENT
// ============================================================================

export class RwandaVATAgent {
    public readonly name = 'Rwanda VAT Agent';
    public readonly version = '1.0.0';
    public readonly category = 'tax';
    public readonly jurisdiction = 'RW';

    private config: RwandaVATAgentConfig;

    constructor(config: RwandaVATAgentConfig = {}) {
        this.config = config;
    }

    getCapabilities(): string[] {
        return [
            'VAT calculation at 18% standard rate',
            'Zero-rated supply identification (exports, EAC, AfCFTA)',
            'Exempt supply identification (health, education, food)',
            'VAT return preparation for ISHEMA',
            'EBM invoice sequence validation',
            'Registration threshold monitoring',
            'Input/output VAT reconciliation',
        ];
    }

    /**
     * Categorize transaction for VAT treatment.
     */
    categorizeTransaction(tx: TransactionInput): VATCategory {
        // Zero-rated: exports, EAC, AfCFTA
        if (tx.isExport || tx.isEACSupply || tx.isAfCFTASupply) {
            return 'ZERO_RATED';
        }

        // Check exempt categories
        const description = tx.description.toLowerCase();
        for (const [_, keywords] of Object.entries(EXEMPT_KEYWORDS)) {
            if (keywords.some(kw => description.includes(kw))) {
                return 'EXEMPT';
            }
        }

        return 'STANDARD';
    }

    /**
     * Calculate VAT for a transaction.
     */
    calculateVAT(input: {
        netAmount: number;
        category?: VATCategory;
    }): VATCalculation {
        const category = input.category || 'STANDARD';
        const vatRate = category === 'STANDARD' ? VAT_STANDARD_RATE : 0;
        const vatAmount = Math.round(input.netAmount * (vatRate / 100));
        const grossAmount = Math.round(input.netAmount + vatAmount);

        return {
            netAmount: input.netAmount,
            vatRate,
            vatAmount,
            grossAmount,
            category,
            currency: 'RWF',
        };
    }

    /**
     * Calculate VAT from gross amount (VAT-inclusive).
     */
    calculateVATFromGross(input: {
        grossAmount: number;
        category?: VATCategory;
    }): VATCalculation {
        const category = input.category || 'STANDARD';
        const vatRate = category === 'STANDARD' ? VAT_STANDARD_RATE : 0;
        const netAmount = Math.round(input.grossAmount / (1 + vatRate / 100));
        const vatAmount = input.grossAmount - netAmount;

        return {
            netAmount,
            vatRate,
            vatAmount,
            grossAmount: input.grossAmount,
            category,
            currency: 'RWF',
        };
    }

    /**
     * Prepare VAT return for a period.
     */
    prepareVATReturn(
        transactions: TransactionInput[],
        periodStart: Date,
        periodEnd: Date
    ): VATReturn {
        // Process transactions
        const processed = transactions.map(tx => ({
            ...tx,
            category: this.categorizeTransaction(tx),
            vat: this.calculateVAT({ netAmount: tx.amount, category: this.categorizeTransaction(tx) }),
        }));

        // Sales (output VAT)
        const sales = processed.filter(p => p.type === 'INCOME');
        const standardSales = sales.filter(s => s.category === 'STANDARD');
        const zeroRatedSales = sales.filter(s => s.category === 'ZERO_RATED');
        const exemptSales = sales.filter(s => s.category === 'EXEMPT');

        const outputVAT = standardSales.reduce((sum, s) => sum + s.vat.vatAmount, 0);
        const standardRatedSupplies = standardSales.reduce((sum, s) => sum + s.amount, 0);
        const zeroRatedSupplies = zeroRatedSales.reduce((sum, s) => sum + s.amount, 0);
        const exemptSupplies = exemptSales.reduce((sum, s) => sum + s.amount, 0);

        // Purchases (input VAT - only standard rated)
        const purchases = processed.filter(p => p.type === 'EXPENSE');
        const standardPurchases = purchases.filter(p => p.category === 'STANDARD');
        const inputVAT = standardPurchases.reduce((sum, p) => sum + p.vat.vatAmount, 0);

        // Net VAT
        const netVAT = outputVAT - inputVAT;
        const totalSupplies = standardRatedSupplies + zeroRatedSupplies + exemptSupplies;

        // Count EBM invoices
        const ebmInvoiceCount = transactions.filter(tx => tx.ebmInvoiceNumber).length;

        // Determine period type
        const months = (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 +
            (periodEnd.getMonth() - periodStart.getMonth()) + 1;
        const periodType: 'MONTHLY' | 'QUARTERLY' = months >= 3 ? 'QUARTERLY' : 'MONTHLY';

        return {
            period: {
                start: periodStart,
                end: periodEnd,
                type: periodType,
            },
            standardRatedSupplies,
            outputVAT,
            zeroRatedSupplies,
            exemptSupplies,
            totalSupplies,
            inputVAT,
            netVAT,
            amountDue: Math.abs(netVAT),
            paymentType: netVAT >= 0 ? 'PAYABLE' : 'REFUNDABLE',
            ebmInvoiceCount,
            status: 'DRAFT',
        };
    }

    /**
     * Check VAT registration requirement.
     */
    checkRegistrationRequired(turnover: {
        annual: number;
        quarterly?: number;
    }): {
        required: boolean;
        reason: string;
        threshold: 'annual' | 'quarterly';
        deadline?: string;
    } {
        if (turnover.quarterly && turnover.quarterly >= VAT_THRESHOLDS.QUARTERLY) {
            return {
                required: true,
                reason: `Quarterly turnover (RWF ${turnover.quarterly.toLocaleString()}) exceeds RWF ${VAT_THRESHOLDS.QUARTERLY.toLocaleString()} threshold`,
                threshold: 'quarterly',
                deadline: `${VAT_THRESHOLDS.REGISTRATION_DAYS} days from exceeding threshold`,
            };
        }

        if (turnover.annual >= VAT_THRESHOLDS.ANNUAL) {
            return {
                required: true,
                reason: `Annual turnover (RWF ${turnover.annual.toLocaleString()}) exceeds RWF ${VAT_THRESHOLDS.ANNUAL.toLocaleString()} threshold`,
                threshold: 'annual',
                deadline: `${VAT_THRESHOLDS.REGISTRATION_DAYS} days from exceeding threshold`,
            };
        }

        return {
            required: false,
            reason: 'Turnover below VAT registration thresholds',
            threshold: 'annual',
        };
    }

    /**
     * Validate EBM invoice sequence.
     */
    validateEBMSequence(invoices: { number: string; date: Date }[]): {
        valid: boolean;
        gaps: string[];
    } {
        const gaps: string[] = [];

        // Sort by date and number
        const sorted = [...invoices].sort((a, b) => {
            const dateCompare = a.date.getTime() - b.date.getTime();
            if (dateCompare !== 0) return dateCompare;
            return a.number.localeCompare(b.number);
        });

        // Check for gaps
        for (let i = 1; i < sorted.length; i++) {
            const prevNum = this.extractNumber(sorted[i - 1].number);
            const currNum = this.extractNumber(sorted[i].number);

            if (prevNum !== null && currNum !== null && currNum - prevNum > 1) {
                gaps.push(`Gap between ${sorted[i - 1].number} and ${sorted[i].number}`);
            }
        }

        return { valid: gaps.length === 0, gaps };
    }

    /**
     * Get VAT filing deadline for period.
     */
    getFilingDeadline(periodEnd: Date): Date {
        const deadline = new Date(periodEnd);
        deadline.setMonth(deadline.getMonth() + 1);
        deadline.setDate(15);
        return deadline;
    }

    private extractNumber(invoiceNum: string): number | null {
        const match = invoiceNum.match(/\d+$/);
        return match ? parseInt(match[0], 10) : null;
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createRwandaVATAgent(config?: RwandaVATAgentConfig): RwandaVATAgent {
    return new RwandaVATAgent(config);
}

let _vatAgent: RwandaVATAgent | null = null;

export const rwandaVATAgent = {
    instance(config?: RwandaVATAgentConfig): RwandaVATAgent {
        if (!_vatAgent) {
            _vatAgent = new RwandaVATAgent(config);
        }
        return _vatAgent;
    },
};
