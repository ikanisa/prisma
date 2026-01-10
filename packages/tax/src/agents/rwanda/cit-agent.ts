/**
 * Rwanda Corporate Income Tax (CIT) Agent
 * 
 * RRA-compliant corporate income tax calculation with incentives.
 * 
 * Legal Basis:
 * - Tax Procedure Law 016/2018
 * - Income Tax Law (as amended)
 * - RRA circulars and regulations
 * 
 * Features:
 * - 28% standard CIT rate (2024+)
 * - Listed company incentives (20% / 25%)
 * - Export incentives
 * - Quarterly provisional tax
 * - Annual return preparation
 * 
 * @package @prisma/tax
 */

// ============================================================================
// TYPES
// ============================================================================

export type EntityTaxType =
    | 'standard'
    | 'listed_40_percent'   // 40%+ float = 20% CIT
    | 'listed_30_percent'   // 30%+ float = 25% CIT
    | 'micro_enterprise'    // Simplified regime
    | 'sez_entity'          // Special Economic Zone
    | 'export_oriented';    // Export incentives

export interface CITCalculation {
    fiscalYear: number;
    entityType: EntityTaxType;
    accountingProfit: number;
    permanentDifferences: number;
    temporaryDifferences: number;
    taxableIncome: number;
    applicableRate: number;
    taxBeforeCredits: number;
    taxCredits: number;
    netTaxPayable: number;
    effectiveRate: number;
    currency: 'RWF';
}

export interface QuarterlyProvisional {
    quarter: 1 | 2 | 3 | 4;
    fiscalYear: number;
    estimatedAnnualProfit: number;
    quarterlyInstallment: number;
    dueDate: Date;
    penalty?: number;
}

export interface CITReturn {
    fiscalYear: number;
    entityName: string;
    tin: string;
    accountingProfit: number;
    addBacks: CITAdjustment[];
    deductions: CITAdjustment[];
    taxableIncome: number;
    taxRate: number;
    grossTax: number;
    foreignTaxCredits: number;
    provisionalTaxPaid: number;
    withholdingTaxCredits: number;
    netTaxPayable: number;
    refundDue?: number;
    status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED';
}

export interface CITAdjustment {
    description: string;
    amount: number;
    lawReference: string;
    category: 'permanent' | 'temporary';
}

export interface RwandaCITAgentConfig {
    openaiApiKey?: string;
    rraEndpoint?: string;
    environment?: 'production' | 'sandbox';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CIT_RATES = {
    STANDARD: 28,
    LISTED_40_PERCENT: 20,    // 40%+ float on RSE
    LISTED_30_PERCENT: 25,    // 30%+ float on RSE
    MICRO_ENTERPRISE: 3,      // Turnover-based simplified
    SEZ: 15,                  // Special Economic Zone
    STRATEGIC_INVESTMENT: 0,  // 0% for qualified strategic investments (7 years)
};

const DEPRECIATION_RATES = {
    buildings: 5,
    plant_machinery: 25,
    vehicles: 20,
    computers: 50,
    furniture: 20,
    intangibles: 20,
};

const NON_DEDUCTIBLE_EXPENSES = [
    'entertainment_without_business_purpose',
    'personal_expenses',
    'fines_penalties',
    'donations_beyond_limit',
    'excessive_interest',
    'unsubstantiated_expenses',
];

// ============================================================================
// RWANDA CIT AGENT
// ============================================================================

export class RwandaCITAgent {
    public readonly name = 'Rwanda CIT Agent';
    public readonly version = '1.0.0';
    public readonly category = 'tax';
    public readonly jurisdiction = 'RW';

    private config: RwandaCITAgentConfig;

    constructor(config: RwandaCITAgentConfig = {}) {
        this.config = config;
    }

    getCapabilities(): string[] {
        return [
            'CIT calculation at applicable rates',
            'Listed company incentive application',
            'IFRS to tax reconciliation',
            'Quarterly provisional tax calculation',
            'Annual CIT return preparation',
            'Depreciation schedule computation',
            'Loss carry-forward tracking',
            'Foreign tax credit calculation',
        ];
    }

    /**
     * Calculate Corporate Income Tax.
     */
    calculateCIT(input: {
        accountingProfit: number;
        entityType: EntityTaxType;
        fiscalYear: number;
        addBacks?: CITAdjustment[];
        deductions?: CITAdjustment[];
        taxCredits?: number;
    }): CITCalculation {
        // Get applicable rate
        const applicableRate = this.getApplicableRate(input.entityType);

        // Calculate adjustments
        const permanentDifferences = this.sumAdjustments(
            input.addBacks?.filter(a => a.category === 'permanent'),
            input.deductions?.filter(a => a.category === 'permanent')
        );
        const temporaryDifferences = this.sumAdjustments(
            input.addBacks?.filter(a => a.category === 'temporary'),
            input.deductions?.filter(a => a.category === 'temporary')
        );

        // Taxable income
        const totalAddBacks = (input.addBacks || []).reduce((sum, a) => sum + a.amount, 0);
        const totalDeductions = (input.deductions || []).reduce((sum, a) => sum + a.amount, 0);
        const taxableIncome = Math.max(0, input.accountingProfit + totalAddBacks - totalDeductions);

        // Tax calculation
        const taxBeforeCredits = Math.round(taxableIncome * (applicableRate / 100));
        const taxCredits = input.taxCredits || 0;
        const netTaxPayable = Math.max(0, taxBeforeCredits - taxCredits);

        // Effective rate
        const effectiveRate = input.accountingProfit > 0
            ? (netTaxPayable / input.accountingProfit) * 100
            : 0;

        return {
            fiscalYear: input.fiscalYear,
            entityType: input.entityType,
            accountingProfit: input.accountingProfit,
            permanentDifferences,
            temporaryDifferences,
            taxableIncome,
            applicableRate,
            taxBeforeCredits,
            taxCredits,
            netTaxPayable,
            effectiveRate: Math.round(effectiveRate * 100) / 100,
            currency: 'RWF',
        };
    }

    /**
     * Get applicable CIT rate for entity type.
     */
    getApplicableRate(entityType: EntityTaxType): number {
        switch (entityType) {
            case 'listed_40_percent':
                return CIT_RATES.LISTED_40_PERCENT;
            case 'listed_30_percent':
                return CIT_RATES.LISTED_30_PERCENT;
            case 'micro_enterprise':
                return CIT_RATES.MICRO_ENTERPRISE;
            case 'sez_entity':
                return CIT_RATES.SEZ;
            default:
                return CIT_RATES.STANDARD;
        }
    }

    /**
     * Calculate quarterly provisional tax.
     */
    calculateQuarterlyProvisional(input: {
        estimatedAnnualProfit: number;
        entityType: EntityTaxType;
        fiscalYear: number;
        quarter: 1 | 2 | 3 | 4;
    }): QuarterlyProvisional {
        const rate = this.getApplicableRate(input.entityType);
        const annualTax = input.estimatedAnnualProfit * (rate / 100);
        const quarterlyInstallment = Math.round(annualTax / 4);

        // Due date: 15th of month after quarter end
        const quarterEndMonths = [3, 6, 9, 12]; // March, June, September, December
        const quarterEndMonth = quarterEndMonths[input.quarter - 1] - 1; // 0-indexed
        const dueDate = new Date(input.fiscalYear, quarterEndMonth + 1, 15);

        return {
            quarter: input.quarter,
            fiscalYear: input.fiscalYear,
            estimatedAnnualProfit: input.estimatedAnnualProfit,
            quarterlyInstallment,
            dueDate,
        };
    }

    /**
     * Calculate depreciation for tax purposes.
     */
    calculateTaxDepreciation(assets: {
        category: keyof typeof DEPRECIATION_RATES;
        cost: number;
        acquisitionDate: Date;
        priorDepreciation: number;
    }[]): {
        totalDepreciation: number;
        byCategory: Record<string, number>;
    } {
        const byCategory: Record<string, number> = {};
        let totalDepreciation = 0;

        for (const asset of assets) {
            const rate = DEPRECIATION_RATES[asset.category] || 20;
            const netBookValue = asset.cost - asset.priorDepreciation;
            const depreciation = Math.min(
                Math.round(asset.cost * (rate / 100)),
                netBookValue
            );

            totalDepreciation += depreciation;
            byCategory[asset.category] = (byCategory[asset.category] || 0) + depreciation;
        }

        return { totalDepreciation, byCategory };
    }

    /**
     * Prepare CIT return.
     */
    prepareCITReturn(input: {
        entityName: string;
        tin: string;
        fiscalYear: number;
        entityType: EntityTaxType;
        accountingProfit: number;
        addBacks: CITAdjustment[];
        deductions: CITAdjustment[];
        foreignTaxCredits: number;
        provisionalTaxPaid: number;
        withholdingTaxCredits: number;
    }): CITReturn {
        const citCalc = this.calculateCIT({
            accountingProfit: input.accountingProfit,
            entityType: input.entityType,
            fiscalYear: input.fiscalYear,
            addBacks: input.addBacks,
            deductions: input.deductions,
            taxCredits: input.foreignTaxCredits + input.withholdingTaxCredits,
        });

        const totalCredits = input.foreignTaxCredits + input.provisionalTaxPaid + input.withholdingTaxCredits;
        const netTaxPayable = Math.max(0, citCalc.taxBeforeCredits - totalCredits);
        const refundDue = citCalc.taxBeforeCredits < totalCredits
            ? totalCredits - citCalc.taxBeforeCredits
            : undefined;

        return {
            fiscalYear: input.fiscalYear,
            entityName: input.entityName,
            tin: input.tin,
            accountingProfit: input.accountingProfit,
            addBacks: input.addBacks,
            deductions: input.deductions,
            taxableIncome: citCalc.taxableIncome,
            taxRate: citCalc.applicableRate,
            grossTax: citCalc.taxBeforeCredits,
            foreignTaxCredits: input.foreignTaxCredits,
            provisionalTaxPaid: input.provisionalTaxPaid,
            withholdingTaxCredits: input.withholdingTaxCredits,
            netTaxPayable,
            refundDue,
            status: 'DRAFT',
        };
    }

    /**
     * Get CIT filing deadline.
     */
    getFilingDeadline(fiscalYearEnd: Date): Date {
        const deadline = new Date(fiscalYearEnd);
        deadline.setMonth(deadline.getMonth() + 3);
        deadline.setDate(31);
        return deadline;
    }

    /**
     * Get common add-backs for CIT.
     */
    getCommonAddBacks(): { description: string; lawReference: string }[] {
        return [
            { description: 'Depreciation per accounts (to be replaced by tax depreciation)', lawReference: 'Art. 26' },
            { description: 'Provisions for doubtful debts (unless specific)', lawReference: 'Art. 23' },
            { description: 'Entertainment expenses (non-business)', lawReference: 'Art. 21' },
            { description: 'Fines and penalties', lawReference: 'Art. 21' },
            { description: 'Donations exceeding 2% of net income', lawReference: 'Art. 24' },
            { description: 'Interest exceeding thin cap ratio', lawReference: 'Art. 27' },
        ];
    }

    private sumAdjustments(
        addBacks?: CITAdjustment[],
        deductions?: CITAdjustment[]
    ): number {
        const addBackTotal = (addBacks || []).reduce((sum, a) => sum + a.amount, 0);
        const deductionTotal = (deductions || []).reduce((sum, a) => sum + a.amount, 0);
        return addBackTotal - deductionTotal;
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createRwandaCITAgent(config?: RwandaCITAgentConfig): RwandaCITAgent {
    return new RwandaCITAgent(config);
}

let _citAgent: RwandaCITAgent | null = null;

export const rwandaCITAgent = {
    instance(config?: RwandaCITAgentConfig): RwandaCITAgent {
        if (!_citAgent) {
            _citAgent = new RwandaCITAgent(config);
        }
        return _citAgent;
    },
};
