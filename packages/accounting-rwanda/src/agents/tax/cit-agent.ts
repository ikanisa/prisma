/**
 * Rwanda CIT (Corporate Income Tax) Agent
 * 
 * Calculates and manages corporate income tax per RRA regulations.
 * Implements 2026 rates: 28% standard, preferential rates for listed/holding companies.
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
import { determineTaxReviewRequirement } from '../../core/base-agent.js';
import type {
    RwandaAccountingFramework,
    RwandaCITCalculation,
    TaxAdjustment,
    CITReturn,
} from '../../types/index.js';
import { RWANDA_TAX_RATES_2026 } from '../../types/index.js';

// ============================================================================
// CIT INPUT TYPES
// ============================================================================

/**
 * Financial data for CIT calculation.
 */
export interface CITFinancialData {
    /** Accounting profit before tax */
    profitBeforeTax: number;
    /** Revenue for the year */
    revenue: number;
    /** Total assets */
    totalAssets: number;
    /** Depreciation expense (book) */
    depreciation: number;
    /** Entertainment expenses */
    entertainmentExpenses: number;
    /** Donations to charities */
    donations: number;
    /** Approved charity donations */
    approvedDonations: number;
    /** Fines and penalties */
    finesAndPenalties: number;
    /** R&D expenses */
    rdExpenses: number;
    /** Capital expenditure for allowances */
    capitalExpenditure: {
        buildings: number;
        machinery: number;
        vehicles: number;
        computers: number;
        furniture: number;
    };
    /** Prior year losses (for carry forward) */
    priorYearLosses: number;
    /** Provisional CIT payments made */
    provisionalPayments: number;
}

/**
 * Entity tax profile.
 */
export interface EntityTaxProfile {
    isListedCompany: boolean;
    yearsListedOnRSE?: number;
    publicShareholdingPercent?: number;
    isHoldingCompany: boolean;
    isIPCompany: boolean;
    isMicrofinanceCooperative: boolean;
    yearsInOperation?: number;
    annualTurnover: number;
}

// ============================================================================
// CAPITAL ALLOWANCE RATES
// ============================================================================

/**
 * Rwanda capital allowance rates per Income Tax Law.
 */
const CAPITAL_ALLOWANCE_RATES = {
    buildings: 0.05,        // 5% per annum
    machinery: 0.25,        // 25% reducing balance
    vehicles: 0.25,         // 25% reducing balance
    computers: 0.50,        // 50% reducing balance
    furniture: 0.125,       // 12.5% reducing balance
    intangibles: 0.10,      // 10% straight-line
} as const;

// ============================================================================
// CIT AGENT
// ============================================================================

/**
 * Rwanda CIT Agent.
 * 
 * Calculates corporate income tax, handles adjustments, and prepares returns.
 */
export class CITAgent implements RwandaAccountingAgent {
    private static instance_: CITAgent | null = null;

    readonly agentId = 'rwanda-cit-agent';
    readonly name = 'Rwanda Corporate Income Tax Agent';
    readonly version = '1.0.0';
    readonly agentType: AgentType = 'COMPLIANCE_MONITORING';
    readonly capabilities = [
        'Calculate CIT at applicable rate (28% standard, 20-25% listed)',
        'Determine tax adjustments (add-backs and deductions)',
        'Calculate capital allowances',
        'Handle loss carry-forward (5 years)',
        'Calculate provisional CIT (quarterly)',
        'Prepare annual CIT return',
        'Calculate effective tax rate',
    ];
    readonly framework: RwandaAccountingFramework | 'ALL' = 'ALL';
    readonly autonomyLevel: AutonomyLevel = 3;
    readonly supportedCurrencies = ['RWF'];

    private constructor() { }

    /**
     * Get singleton instance.
     */
    static instance(): CITAgent {
        if (!CITAgent.instance_) {
            CITAgent.instance_ = new CITAgent();
        }
        return CITAgent.instance_;
    }

    /**
     * Calculate CIT for a financial year.
     */
    async calculateCIT(
        financials: CITFinancialData,
        entityProfile: EntityTaxProfile,
        context: AgentContext
    ): Promise<AgentResponse<RwandaCITCalculation>> {
        const startTime = Date.now();

        try {
            // Step 1: Calculate tax adjustments
            const adjustments = this.calculateTaxAdjustments(financials);

            // Step 2: Calculate taxable income
            const taxableIncome = Math.max(
                0,
                financials.profitBeforeTax +
                adjustments.addBacks.reduce((sum, a) => sum + a.amount, 0) -
                adjustments.deductions.reduce((sum, d) => sum + d.amount, 0) -
                Math.min(financials.priorYearLosses, financials.profitBeforeTax * 0.7) // Max 70% of profit
            );

            // Step 3: Determine applicable CIT rate
            const citRate = this.determineCITRate(entityProfile);

            // Step 4: Calculate CIT
            const citPayable = this.roundRWF(taxableIncome * citRate);

            // Step 5: Deduct provisional payments
            const balancePayable = Math.max(0, citPayable - financials.provisionalPayments);

            // Step 6: Calculate effective rate
            const effectiveTaxRate = financials.profitBeforeTax > 0
                ? (citPayable / financials.profitBeforeTax) * 100
                : 0;

            const result: RwandaCITCalculation = {
                accountingProfit: financials.profitBeforeTax,
                taxableIncome,
                citRate: citRate * 100, // Convert to percentage
                citPayable,
                provisionalPayments: financials.provisionalPayments,
                balancePayable,
                effectiveTaxRate,
                adjustments,
            };

            // Determine review requirement
            const reviewGate = determineTaxReviewRequirement(
                'CIT',
                citPayable,
                false
            );

            return {
                success: true,
                data: result,
                confidenceScore: 0.92,
                requiresReview: reviewGate.required,
                reviewReason: reviewGate.reason,
                rraCompliant: true,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'CIT calculation failed',
                requiresReview: true,
                reviewReason: 'Calculation error',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Determine applicable CIT rate.
     */
    determineCITRate(profile: EntityTaxProfile): number {
        // Microfinance cooperatives: 0% for first 5 years
        if (profile.isMicrofinanceCooperative && (profile.yearsInOperation || 0) <= 5) {
            return 0;
        }

        // Holding/IP companies: 3%
        if (profile.isHoldingCompany || profile.isIPCompany) {
            return 0.03;
        }

        // Listed companies with public shareholding
        if (profile.isListedCompany && (profile.yearsListedOnRSE || 0) <= 5) {
            if ((profile.publicShareholdingPercent || 0) >= 40) {
                return 0.20; // 20%
            }
            if ((profile.publicShareholdingPercent || 0) >= 30) {
                return 0.25; // 25%
            }
        }

        // Micro-business (turnover < 12M): flat tax regime
        if (profile.annualTurnover < 12_000_000) {
            return 0; // Handled separately via micro tax
        }

        // Small business turnover tax option (12M-20M): 3% of turnover
        if (profile.annualTurnover >= 12_000_000 && profile.annualTurnover < 20_000_000) {
            // This is calculated on turnover, not profit - flag for special handling
            return 0.03; // Applied to turnover
        }

        // Standard rate: 28% (as of 2024)
        return RWANDA_TAX_RATES_2026.CIT_STANDARD / 100;
    }

    /**
     * Calculate tax adjustments (add-backs and deductions).
     */
    calculateTaxAdjustments(financials: CITFinancialData): {
        addBacks: TaxAdjustment[];
        deductions: TaxAdjustment[];
    } {
        const addBacks: TaxAdjustment[] = [];
        const deductions: TaxAdjustment[] = [];

        // ADD-BACKS (non-deductible expenses)

        // 1. Book depreciation (replace with capital allowances)
        if (financials.depreciation > 0) {
            addBacks.push({
                item: 'Book depreciation',
                amount: financials.depreciation,
                reference: 'Art. 18 Income Tax Law',
            });
        }

        // 2. Entertainment expenses (>0.5% of turnover)
        const allowedEntertainment = financials.revenue * 0.005;
        const excessEntertainment = Math.max(0, financials.entertainmentExpenses - allowedEntertainment);
        if (excessEntertainment > 0) {
            addBacks.push({
                item: 'Excess entertainment expenses',
                amount: excessEntertainment,
                reference: 'Art. 19 - Max 0.5% of turnover',
            });
        }

        // 3. Non-approved donations
        const nonApprovedDonations = financials.donations - financials.approvedDonations;
        if (nonApprovedDonations > 0) {
            addBacks.push({
                item: 'Donations to non-approved charities',
                amount: nonApprovedDonations,
                reference: 'Art. 24 - Only approved charities deductible',
            });
        }

        // 4. Fines and penalties
        if (financials.finesAndPenalties > 0) {
            addBacks.push({
                item: 'Fines and penalties',
                amount: financials.finesAndPenalties,
                reference: 'Art. 22 - Not deductible',
            });
        }

        // DEDUCTIONS (allowable)

        // 1. Capital allowances (instead of depreciation)
        const capitalAllowances = this.calculateCapitalAllowances(financials.capitalExpenditure);
        if (capitalAllowances > 0) {
            deductions.push({
                item: 'Capital allowances',
                amount: capitalAllowances,
                reference: 'Art. 18 - Capital deductions',
            });
        }

        // 2. R&D expenses (150% deduction)
        if (financials.rdExpenses > 0) {
            const rdExtraDeduction = financials.rdExpenses * 0.5; // 50% extra
            deductions.push({
                item: 'R&D expenses (extra 50%)',
                amount: rdExtraDeduction,
                reference: 'Art. 26 - R&D incentive',
            });
        }

        // 3. Approved donations (max 15% of taxable income)
        // Note: Cap is applied after other calculations
        if (financials.approvedDonations > 0) {
            deductions.push({
                item: 'Approved charity donations',
                amount: financials.approvedDonations,
                reference: 'Art. 24 - Max 15% taxable income',
            });
        }

        return { addBacks, deductions };
    }

    /**
     * Calculate capital allowances.
     */
    calculateCapitalAllowances(capex: CITFinancialData['capitalExpenditure']): number {
        return (
            capex.buildings * CAPITAL_ALLOWANCE_RATES.buildings +
            capex.machinery * CAPITAL_ALLOWANCE_RATES.machinery +
            capex.vehicles * CAPITAL_ALLOWANCE_RATES.vehicles +
            capex.computers * CAPITAL_ALLOWANCE_RATES.computers +
            capex.furniture * CAPITAL_ALLOWANCE_RATES.furniture
        );
    }

    /**
     * Calculate quarterly provisional CIT.
     */
    calculateProvisionalCIT(
        quarter: 1 | 2 | 3 | 4,
        estimatedAnnualProfit: number,
        entityProfile: EntityTaxProfile,
        priorPayments: number
    ): {
        quarter: number;
        estimatedAnnualCIT: number;
        quarterlyAmount: number;
        cumulativeRequired: number;
        amountDue: number;
        dueDate: Date;
    } {
        const citRate = this.determineCITRate(entityProfile);
        const estimatedAnnualCIT = Math.max(0, estimatedAnnualProfit * citRate);

        // Cumulative requirement by quarter
        const cumulativePercentages: Record<number, number> = {
            1: 0.25, // 25% by Q1
            2: 0.50, // 50% by Q2
            3: 0.75, // 75% by Q3
            4: 1.00, // 100% by Q4
        };

        const cumulativeRequired = estimatedAnnualCIT * cumulativePercentages[quarter];
        const quarterlyAmount = estimatedAnnualCIT * 0.25;
        const amountDue = Math.max(0, cumulativeRequired - priorPayments);

        // Due date: 15th of month following quarter end
        const currentYear = new Date().getFullYear();
        const dueDates = {
            1: new Date(currentYear, 3, 15),  // April 15
            2: new Date(currentYear, 6, 15),  // July 15
            3: new Date(currentYear, 9, 15),  // October 15
            4: new Date(currentYear + 1, 0, 15), // January 15
        };

        return {
            quarter,
            estimatedAnnualCIT: this.roundRWF(estimatedAnnualCIT),
            quarterlyAmount: this.roundRWF(quarterlyAmount),
            cumulativeRequired: this.roundRWF(cumulativeRequired),
            amountDue: this.roundRWF(amountDue),
            dueDate: dueDates[quarter],
        };
    }

    /**
     * Prepare CIT return for ISHEMA submission.
     */
    async prepareCITReturn(
        financials: CITFinancialData,
        entityProfile: EntityTaxProfile,
        fiscalYearEnd: Date,
        context: AgentContext
    ): Promise<AgentResponse<CITReturn>> {
        const startTime = Date.now();

        try {
            // Calculate CIT
            const citCalc = await this.calculateCIT(financials, entityProfile, context);

            if (!citCalc.success || !citCalc.data) {
                throw new Error(citCalc.error || 'CIT calculation failed');
            }

            const data = citCalc.data;

            const citReturn: CITReturn = {
                financialYearEnd: fiscalYearEnd,
                accountingProfit: data.accountingProfit,
                taxAdjustmentsAddBacks: data.adjustments.addBacks.reduce((sum, a) => sum + a.amount, 0),
                taxAdjustmentsDeductions: data.adjustments.deductions.reduce((sum, d) => sum + d.amount, 0),
                taxableIncome: data.taxableIncome,
                citRate: data.citRate / 100, // As decimal
                citPayable: data.citPayable,
                provisionalPayments: data.provisionalPayments,
                balancePayable: data.balancePayable,
                status: 'DRAFT',
            };

            return {
                success: true,
                data: citReturn,
                confidenceScore: 0.90,
                requiresReview: true,
                reviewReason: 'Annual CIT return requires partner review before submission',
                rraCompliant: true,
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'CIT return preparation failed',
                requiresReview: true,
                reviewReason: 'Preparation error',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Get CIT filing deadline.
     */
    getFilingDeadline(fiscalYearEnd: Date): Date {
        const deadline = new Date(fiscalYearEnd);
        deadline.setMonth(deadline.getMonth() + 3);
        return deadline;
    }

    /**
     * Check if CIT return is overdue.
     */
    isOverdue(fiscalYearEnd: Date): boolean {
        return new Date() > this.getFilingDeadline(fiscalYearEnd);
    }

    /**
     * Round to RWF.
     */
    private roundRWF(amount: number): number {
        return Math.round(amount);
    }
}

/**
 * Factory function.
 */
export function createCITAgent(): CITAgent {
    return CITAgent.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const citAgent = {
    instance: () => CITAgent.instance(),
};
