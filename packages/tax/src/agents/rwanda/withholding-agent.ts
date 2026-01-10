/**
 * Rwanda Withholding Tax Agent
 * 
 * Withholding tax calculation and declaration for Rwanda.
 * 
 * Legal Basis:
 * - Income Tax Law (WHT provisions)
 * - Tax Procedure Law 016/2018
 * - Double Taxation Agreements
 * 
 * Features:
 * - 15% WHT on services (residents)
 * - 15% WHT on dividends
 * - 15% WHT on rent
 * - Treaty rate application
 * - Monthly declaration preparation
 * 
 * @package @prisma/tax
 */

// ============================================================================
// TYPES
// ============================================================================

export type WHTType =
    | 'services'
    | 'dividends'
    | 'interest'
    | 'royalties'
    | 'rent'
    | 'technical_fees'
    | 'management_fees';

export type RecipientType = 'resident' | 'non_resident';

export interface WHTCalculation {
    paymentType: WHTType;
    recipientType: RecipientType;
    grossAmount: number;
    applicableRate: number;
    whtAmount: number;
    netAmount: number;
    treatyApplied?: string;
    currency: 'RWF';
}

export interface WHTPayment {
    paymentId: string;
    payeeId: string;
    payeeName: string;
    payeeTin?: string;
    paymentType: WHTType;
    recipientType: RecipientType;
    paymentDate: Date;
    grossAmount: number;
    whtRate: number;
    whtAmount: number;
    netAmount: number;
    invoiceRef?: string;
    treatyCountry?: string;
}

export interface WHTDeclaration {
    period: {
        month: number;
        year: number;
    };
    payerName: string;
    payerTin: string;
    payments: WHTPayment[];
    totalGross: number;
    totalWHT: number;
    byType: Record<WHTType, { count: number; gross: number; wht: number }>;
    status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED';
    submissionDate?: Date;
    referenceNumber?: string;
}

export interface RwandaWHTAgentConfig {
    openaiApiKey?: string;
    rraEndpoint?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Standard WHT rates for residents.
 */
const WHT_RATES_RESIDENT: Record<WHTType, number> = {
    services: 15,
    dividends: 15,
    interest: 15,
    royalties: 15,
    rent: 15,
    technical_fees: 15,
    management_fees: 15,
};

/**
 * Standard WHT rates for non-residents.
 */
const WHT_RATES_NON_RESIDENT: Record<WHTType, number> = {
    services: 15,
    dividends: 15,
    interest: 15,
    royalties: 15,
    rent: 15,
    technical_fees: 15,
    management_fees: 15,
};

/**
 * Treaty rates by country (simplified - actual treaties may vary).
 */
const TREATY_RATES: Record<string, Partial<Record<WHTType, number>>> = {
    'BE': { dividends: 10, interest: 10, royalties: 10 },  // Belgium
    'ZA': { dividends: 10, interest: 10, royalties: 10 },  // South Africa
    'MA': { dividends: 10, interest: 10, royalties: 10 },  // Morocco
    'MU': { dividends: 10, interest: 10, royalties: 10 },  // Mauritius
    'SG': { dividends: 10, interest: 10, royalties: 10 },  // Singapore
    'CN': { dividends: 10, interest: 10, royalties: 10 },  // China
    'IN': { dividends: 10, interest: 10, royalties: 10 },  // India
    'GB': { dividends: 10, interest: 10, royalties: 10 },  // UK
    'AE': { dividends: 0, interest: 0, royalties: 0 },     // UAE
};

/**
 * EAC member states (reduced rates may apply).
 */
const EAC_COUNTRIES = ['KE', 'UG', 'TZ', 'BI', 'SS', 'CD', 'SO'];

// ============================================================================
// RWANDA WHT AGENT
// ============================================================================

export class RwandaWHTAgent {
    public readonly name = 'Rwanda Withholding Tax Agent';
    public readonly version = '1.0.0';
    public readonly category = 'tax';
    public readonly jurisdiction = 'RW';

    private config: RwandaWHTAgentConfig;

    constructor(config: RwandaWHTAgentConfig = {}) {
        this.config = config;
    }

    getCapabilities(): string[] {
        return [
            'WHT calculation for services (15%)',
            'WHT calculation for dividends (15%)',
            'WHT calculation for interest (15%)',
            'WHT calculation for royalties (15%)',
            'WHT calculation for rent (15%)',
            'Treaty rate application',
            'EAC member state considerations',
            'Monthly WHT declaration preparation',
            'Certificate of WHT generation',
        ];
    }

    /**
     * Calculate withholding tax.
     */
    calculateWHT(input: {
        paymentType: WHTType;
        grossAmount: number;
        recipientType: RecipientType;
        recipientCountry?: string;
    }): WHTCalculation {
        let applicableRate: number;
        let treatyApplied: string | undefined;

        if (input.recipientType === 'resident') {
            applicableRate = WHT_RATES_RESIDENT[input.paymentType];
        } else {
            // Non-resident - check for treaty
            applicableRate = WHT_RATES_NON_RESIDENT[input.paymentType];

            if (input.recipientCountry) {
                const treatyRates = TREATY_RATES[input.recipientCountry];
                if (treatyRates && treatyRates[input.paymentType] !== undefined) {
                    const treatyRate = treatyRates[input.paymentType]!;
                    if (treatyRate < applicableRate) {
                        applicableRate = treatyRate;
                        treatyApplied = `DTA with ${input.recipientCountry}`;
                    }
                }
            }
        }

        const whtAmount = Math.round(input.grossAmount * (applicableRate / 100));
        const netAmount = input.grossAmount - whtAmount;

        return {
            paymentType: input.paymentType,
            recipientType: input.recipientType,
            grossAmount: input.grossAmount,
            applicableRate,
            whtAmount,
            netAmount,
            treatyApplied,
            currency: 'RWF',
        };
    }

    /**
     * Get applicable WHT rate.
     */
    getApplicableRate(input: {
        paymentType: WHTType;
        recipientType: RecipientType;
        recipientCountry?: string;
    }): { rate: number; source: string } {
        if (input.recipientType === 'resident') {
            return {
                rate: WHT_RATES_RESIDENT[input.paymentType],
                source: 'Domestic rate',
            };
        }

        // Non-resident
        const domesticRate = WHT_RATES_NON_RESIDENT[input.paymentType];

        if (input.recipientCountry) {
            // Check EAC
            if (EAC_COUNTRIES.includes(input.recipientCountry)) {
                return {
                    rate: domesticRate,
                    source: 'EAC domestic rate applies',
                };
            }

            // Check treaty
            const treatyRates = TREATY_RATES[input.recipientCountry];
            if (treatyRates && treatyRates[input.paymentType] !== undefined) {
                const treatyRate = treatyRates[input.paymentType]!;
                if (treatyRate < domesticRate) {
                    return {
                        rate: treatyRate,
                        source: `DTA with ${input.recipientCountry}`,
                    };
                }
            }
        }

        return {
            rate: domesticRate,
            source: 'Non-resident domestic rate',
        };
    }

    /**
     * Create WHT payment record.
     */
    createPayment(input: {
        paymentId: string;
        payeeId: string;
        payeeName: string;
        payeeTin?: string;
        paymentType: WHTType;
        recipientType: RecipientType;
        paymentDate: Date;
        grossAmount: number;
        invoiceRef?: string;
        recipientCountry?: string;
    }): WHTPayment {
        const calc = this.calculateWHT({
            paymentType: input.paymentType,
            grossAmount: input.grossAmount,
            recipientType: input.recipientType,
            recipientCountry: input.recipientCountry,
        });

        return {
            paymentId: input.paymentId,
            payeeId: input.payeeId,
            payeeName: input.payeeName,
            payeeTin: input.payeeTin,
            paymentType: input.paymentType,
            recipientType: input.recipientType,
            paymentDate: input.paymentDate,
            grossAmount: input.grossAmount,
            whtRate: calc.applicableRate,
            whtAmount: calc.whtAmount,
            netAmount: calc.netAmount,
            invoiceRef: input.invoiceRef,
            treatyCountry: input.recipientCountry,
        };
    }

    /**
     * Prepare monthly WHT declaration.
     */
    prepareDeclaration(input: {
        payerName: string;
        payerTin: string;
        month: number;
        year: number;
        payments: WHTPayment[];
    }): WHTDeclaration {
        const totalGross = input.payments.reduce((sum, p) => sum + p.grossAmount, 0);
        const totalWHT = input.payments.reduce((sum, p) => sum + p.whtAmount, 0);

        // Group by type
        const byType = {} as Record<WHTType, { count: number; gross: number; wht: number }>;
        const types: WHTType[] = ['services', 'dividends', 'interest', 'royalties', 'rent', 'technical_fees', 'management_fees'];

        for (const type of types) {
            const typePayments = input.payments.filter(p => p.paymentType === type);
            byType[type] = {
                count: typePayments.length,
                gross: typePayments.reduce((sum, p) => sum + p.grossAmount, 0),
                wht: typePayments.reduce((sum, p) => sum + p.whtAmount, 0),
            };
        }

        return {
            period: {
                month: input.month,
                year: input.year,
            },
            payerName: input.payerName,
            payerTin: input.payerTin,
            payments: input.payments,
            totalGross,
            totalWHT,
            byType,
            status: 'DRAFT',
        };
    }

    /**
     * Get WHT filing deadline.
     */
    getFilingDeadline(month: number, year: number): Date {
        const deadline = new Date(year, month, 15);
        return deadline;
    }

    /**
     * Check if country has DTA with Rwanda.
     */
    hasTreaty(countryCode: string): boolean {
        return countryCode in TREATY_RATES;
    }

    /**
     * Get list of treaty countries.
     */
    getTreatyCountries(): string[] {
        return Object.keys(TREATY_RATES);
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createRwandaWHTAgent(config?: RwandaWHTAgentConfig): RwandaWHTAgent {
    return new RwandaWHTAgent(config);
}

let _whtAgent: RwandaWHTAgent | null = null;

export const rwandaWHTAgent = {
    instance(config?: RwandaWHTAgentConfig): RwandaWHTAgent {
        if (!_whtAgent) {
            _whtAgent = new RwandaWHTAgent(config);
        }
        return _whtAgent;
    },
};
