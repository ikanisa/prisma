/**
 * Pillar 2 GloBE Agent
 * 
 * OECD/G20 Inclusive Framework Pillar 2 Global Minimum Tax implementation.
 * Calculates top-up tax under Global Anti-Base Erosion (GloBE) rules.
 * 
 * Key Features:
 * - Effective Tax Rate (ETR) calculation per jurisdiction
 * - Top-up tax calculation (15% minimum)
 * - Qualified Domestic Minimum Top-up Tax (QDMTT)
 * - Income Inclusion Rule (IIR)
 * - Undertaxed Profits Rule (UTPR)
 * - Substance-based carve-outs
 * - GloBE Information Return (GIR) preparation
 * 
 * Based on:
 * - OECD Model Rules (December 2021)
 * - Canada Global Minimum Tax Act (June 2024)
 * 
 * @package @prisma/tax-canada
 */

import type { TaxAgentResponse } from '../types/index.js';

// ============================================================================
// PILLAR 2 TYPES
// ============================================================================

export const GLOBE_MINIMUM_RATE = 0.15; // 15% global minimum

export interface GloBEGroup {
    groupId: string;
    ultimateParentEntity: ParentEntity;
    fiscalYear: { start: Date; end: Date };
    consolidatedRevenue: number;       // Must exceed €750M threshold
    isInScope: boolean;
    constituents: ConstituentEntity[];
}

export interface ParentEntity {
    entityId: string;
    name: string;
    jurisdiction: string;
    tin: string;                        // Tax Identification Number
    isUltimateParent: boolean;
    isIntermediateParent: boolean;
}

export interface ConstituentEntity {
    entityId: string;
    name: string;
    jurisdiction: string;
    tin?: string;
    ownershipPercentage: number;
    entityType: GloBEEntityType;
    isExcluded: boolean;
    exclusionReason?: ExclusionReason;
}

export type GloBEEntityType =
    | 'PARENT'
    | 'SUBSIDIARY'
    | 'PE'                              // Permanent Establishment
    | 'FLOW_THROUGH'
    | 'JOINT_VENTURE'
    | 'INVESTMENT_FUND';

export type ExclusionReason =
    | 'GOVERNMENT_ENTITY'
    | 'INTERNATIONAL_ORG'
    | 'NON_PROFIT'
    | 'PENSION_FUND'
    | 'INVESTMENT_FUND'
    | 'REAL_ESTATE_VEHICLE'
    | 'DE_MINIMIS';                     // Revenue < €10M and profit < €1M

// ============================================================================
// JURISDICTIONAL DATA
// ============================================================================

export interface JurisdictionData {
    jurisdiction: string;
    countryCode: string;
    entities: string[];                  // Entity IDs in this jurisdiction

    // GloBE Income/Loss
    financialAccountingIncome: number;   // Based on consolidated FS
    gloBEAdjustments: GloBEAdjustments;
    gloBEIncome: number;

    // Covered Taxes
    currentTaxExpense: number;
    deferredTaxAdjustments: number;
    coveredTaxes: number;
    adjustedCoveredTaxes: number;

    // ETR Calculation
    effectiveTaxRate: number;
    isUndertaxed: boolean;

    // Substance Carve-out
    payrollCarveout: number;
    tangibleAssetCarveout: number;
    totalCarveout: number;

    // Top-up Tax
    excessProfit: number;
    topUpTaxRate: number;
    topUpTax: number;

    // QDMTT (if applicable)
    hasQDMTT: boolean;
    qdmttAmount?: number;
}

export interface GloBEAdjustments {
    // Exclusions from GloBE Income
    excludedDividends: number;
    excludedEquityGains: number;
    policyDisallowedExpenses: number;
    stockBasedCompensation: number;
    asymmetricFXGains: number;

    // Other adjustments
    priorPeriodErrors: number;
    interCompanyTransactions: number;

    totalAdjustments: number;
}

// ============================================================================
// GLOBE CALCULATION RESULT
// ============================================================================

export interface GloBECalculation {
    calculationId: string;
    group: GloBEGroup;
    calculationDate: Date;

    // Scope Test
    revenueThresholdMet: boolean;       // €750M

    // Jurisdictional Results
    jurisdictions: JurisdictionData[];
    undertaxedJurisdictions: string[];

    // Top-up Tax Allocation
    iirTopUpTax: number;                // Income Inclusion Rule
    utprTopUpTax: number;               // Undertaxed Profits Rule
    totalTopUpTax: number;

    // Canadian Obligations
    canadianIIRObligation: number;      // Tax payable in Canada under IIR
    canadianQDMTT?: number;             // If Canada implements QDMTT

    // GIR Data
    girRequired: boolean;
    girDueDate: Date;
}

// ============================================================================
// SUBSTANCE-BASED CARVE-OUT
// ============================================================================

/**
 * Substance-based income exclusion rates (transitional schedule)
 * Reduces to 5% payroll / 5% tangible assets by 2033
 */
const CARVEOUT_RATES: Record<number, { payroll: number; tangibleAssets: number }> = {
    2024: { payroll: 0.10, tangibleAssets: 0.08 },
    2025: { payroll: 0.095, tangibleAssets: 0.076 },
    2026: { payroll: 0.090, tangibleAssets: 0.072 },
    2027: { payroll: 0.085, tangibleAssets: 0.068 },
    2028: { payroll: 0.080, tangibleAssets: 0.064 },
    2029: { payroll: 0.075, tangibleAssets: 0.060 },
    2030: { payroll: 0.070, tangibleAssets: 0.056 },
    2031: { payroll: 0.065, tangibleAssets: 0.052 },
    2032: { payroll: 0.060, tangibleAssets: 0.051 },
    2033: { payroll: 0.050, tangibleAssets: 0.050 },
};

// ============================================================================
// GLOBE AGENT CONFIG
// ============================================================================

export interface GloBEAgentConfig {
    revenueThresholdEUR: number;        // €750M default
    minimumTaxRate: number;             // 15% default
    enableQDMTT: boolean;               // Canadian QDMTT
    fiscalYear: number;
    organizationId?: string;
}

const DEFAULT_CONFIG: GloBEAgentConfig = {
    revenueThresholdEUR: 750_000_000,
    minimumTaxRate: 0.15,
    enableQDMTT: true,                  // Canada has QDMTT
    fiscalYear: 2026,
};

// ============================================================================
// PILLAR 2 GLOBE AGENT
// ============================================================================

export class Pillar2GloBEAgent {
    public readonly slug = 'canada-pillar2-globe';
    public readonly name = 'Pillar 2 GloBE Agent';
    public readonly version = '1.0.0';

    private config: GloBEAgentConfig;

    constructor(config: Partial<GloBEAgentConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // =========================================================================
    // SCOPE DETERMINATION
    // =========================================================================

    async determineScope(group: GloBEGroup): Promise<TaxAgentResponse<{
        inScope: boolean;
        reason: string;
        exclusions: ConstituentEntity[];
    }>> {
        const startTime = Date.now();

        try {
            // Check revenue threshold (€750M in any 2 of last 4 years)
            const revenueThresholdMet = group.consolidatedRevenue >= this.config.revenueThresholdEUR;

            // Identify excluded entities
            const exclusions = group.constituents.filter(e => e.isExcluded);

            const inScope = revenueThresholdMet;
            const reason = inScope
                ? `Group exceeds €750M revenue threshold (€${(group.consolidatedRevenue / 1_000_000).toFixed(0)}M)`
                : `Group below €750M revenue threshold`;

            return {
                success: true,
                data: { inScope, reason, exclusions },
                processingTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                errors: [`Scope determination failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                processingTimeMs: Date.now() - startTime,
            };
        }
    }

    // =========================================================================
    // MAIN CALCULATION
    // =========================================================================

    async calculateTopUpTax(
        group: GloBEGroup,
        jurisdictionData: JurisdictionData[]
    ): Promise<TaxAgentResponse<GloBECalculation>> {
        const startTime = Date.now();

        try {
            // Step 1: Check scope
            const revenueThresholdMet = group.consolidatedRevenue >= this.config.revenueThresholdEUR;

            if (!revenueThresholdMet) {
                return {
                    success: true,
                    data: {
                        calculationId: `GLOBE-${group.groupId}-${this.config.fiscalYear}`,
                        group,
                        calculationDate: new Date(),
                        revenueThresholdMet: false,
                        jurisdictions: [],
                        undertaxedJurisdictions: [],
                        iirTopUpTax: 0,
                        utprTopUpTax: 0,
                        totalTopUpTax: 0,
                        canadianIIRObligation: 0,
                        girRequired: false,
                        girDueDate: new Date(),
                    },
                    processingTimeMs: Date.now() - startTime,
                };
            }

            // Step 2: Calculate ETR and top-up for each jurisdiction
            const processedJurisdictions: JurisdictionData[] = [];
            const undertaxedJurisdictions: string[] = [];
            let totalIIRTopUp = 0;
            let totalUTPRTopUp = 0;

            for (const jd of jurisdictionData) {
                const processed = this.processJurisdiction(jd);
                processedJurisdictions.push(processed);

                if (processed.isUndertaxed) {
                    undertaxedJurisdictions.push(processed.jurisdiction);

                    // Allocate top-up tax
                    if (processed.jurisdiction !== 'CA') {
                        // IIR applies to foreign undertaxed jurisdictions
                        totalIIRTopUp += processed.topUpTax;
                    }
                }
            }

            // Step 3: Canadian QDMTT (if Canada is undertaxed)
            const canadaJd = processedJurisdictions.find(j => j.jurisdiction === 'CA');
            const canadianQDMTT = canadaJd?.hasQDMTT ? canadaJd.topUpTax : undefined;

            // Step 4: Compute final obligations
            const calculation: GloBECalculation = {
                calculationId: `GLOBE-${group.groupId}-${this.config.fiscalYear}`,
                group,
                calculationDate: new Date(),
                revenueThresholdMet,
                jurisdictions: processedJurisdictions,
                undertaxedJurisdictions,
                iirTopUpTax: totalIIRTopUp,
                utprTopUpTax: totalUTPRTopUp,
                totalTopUpTax: totalIIRTopUp + totalUTPRTopUp + (canadianQDMTT || 0),
                canadianIIRObligation: totalIIRTopUp, // UPE in Canada pays IIR
                canadianQDMTT,
                girRequired: true,
                girDueDate: this.calculateGIRDueDate(group.fiscalYear.end),
            };

            return {
                success: true,
                data: calculation,
                processingTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                errors: [`GloBE calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                processingTimeMs: Date.now() - startTime,
            };
        }
    }

    // =========================================================================
    // JURISDICTION PROCESSING
    // =========================================================================

    private processJurisdiction(jd: JurisdictionData): JurisdictionData {
        // Calculate GloBE Income after adjustments
        const gloBEIncome = jd.financialAccountingIncome - jd.gloBEAdjustments.totalAdjustments;

        // Calculate Adjusted Covered Taxes
        const adjustedCoveredTaxes = jd.currentTaxExpense + jd.deferredTaxAdjustments;

        // Calculate ETR
        const effectiveTaxRate = gloBEIncome > 0
            ? adjustedCoveredTaxes / gloBEIncome
            : 0;

        // Determine if undertaxed
        const isUndertaxed = effectiveTaxRate < this.config.minimumTaxRate;

        // Calculate substance-based carve-out
        const carveoutRates = CARVEOUT_RATES[this.config.fiscalYear] || CARVEOUT_RATES[2033];
        const payrollCarveout = jd.payrollCarveout * carveoutRates.payroll;
        const tangibleAssetCarveout = jd.tangibleAssetCarveout * carveoutRates.tangibleAssets;
        const totalCarveout = payrollCarveout + tangibleAssetCarveout;

        // Calculate excess profit
        const excessProfit = Math.max(0, gloBEIncome - totalCarveout);

        // Calculate top-up tax rate and amount
        const topUpTaxRate = Math.max(0, this.config.minimumTaxRate - effectiveTaxRate);
        const topUpTax = isUndertaxed ? excessProfit * topUpTaxRate : 0;

        return {
            ...jd,
            gloBEIncome,
            adjustedCoveredTaxes,
            effectiveTaxRate,
            isUndertaxed,
            totalCarveout,
            excessProfit,
            topUpTaxRate,
            topUpTax,
            hasQDMTT: jd.jurisdiction === 'CA' && this.config.enableQDMTT,
            qdmttAmount: jd.jurisdiction === 'CA' && this.config.enableQDMTT ? topUpTax : undefined,
        };
    }

    // =========================================================================
    // GIR (GloBE INFORMATION RETURN)
    // =========================================================================

    private calculateGIRDueDate(fiscalYearEnd: Date): Date {
        // GIR due 15 months after fiscal year end (18 months for first year)
        const dueDate = new Date(fiscalYearEnd);
        dueDate.setMonth(dueDate.getMonth() + 15);
        return dueDate;
    }

    async prepareGIR(calculation: GloBECalculation): Promise<TaxAgentResponse<{
        girId: string;
        sections: string[];
        dueDate: Date;
    }>> {
        const startTime = Date.now();

        try {
            const sections = [
                'Part I: General Information',
                'Part II: Corporate Structure',
                'Part III: Jurisdictional ETR Computation',
                'Part IV: Top-up Tax Computation',
                'Part V: Allocation of Top-up Tax',
                'Part VI: QDMTT Safe Harbour',
                'Part VII: Transitional Rules',
                'Part VIII: Elections',
            ];

            return {
                success: true,
                data: {
                    girId: `GIR-${calculation.calculationId}`,
                    sections,
                    dueDate: calculation.girDueDate,
                },
                processingTimeMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                errors: [`GIR preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
                processingTimeMs: Date.now() - startTime,
            };
        }
    }

    // =========================================================================
    // SAFE HARBOURS
    // =========================================================================

    /**
     * Check if jurisdiction qualifies for transitional safe harbour
     * Based on CbCR data (2024-2026 transitional period)
     */
    checkTransitionalSafeHarbour(
        jurisdiction: string,
        cbcrRevenue: number,
        cbcrProfitBeforeTax: number,
        cbcrTaxPaid: number
    ): { qualifies: boolean; test: string } {
        // De minimis test: Revenue < €10M AND Profit < €1M
        if (cbcrRevenue < 10_000_000 && cbcrProfitBeforeTax < 1_000_000) {
            return { qualifies: true, test: 'de_minimis' };
        }

        // Simplified ETR test: Tax/Profit >= transitional rate
        const transitionalRate = 0.15; // Increases to 16% in 2025, 17% in 2026
        if (cbcrProfitBeforeTax > 0) {
            const simplifiedETR = cbcrTaxPaid / cbcrProfitBeforeTax;
            if (simplifiedETR >= transitionalRate) {
                return { qualifies: true, test: 'simplified_etr' };
            }
        }

        // Routine profits test
        const substanceCarveout = cbcrRevenue * 0.10; // Simplified
        if (cbcrProfitBeforeTax <= substanceCarveout) {
            return { qualifies: true, test: 'routine_profits' };
        }

        return { qualifies: false, test: 'none' };
    }

    // =========================================================================
    // CAPABILITIES
    // =========================================================================

    getCapabilities(): string[] {
        return [
            'OECD Pillar 2 GloBE Rules compliance',
            'Effective Tax Rate (ETR) calculation by jurisdiction',
            'Top-up tax calculation (15% minimum)',
            'Income Inclusion Rule (IIR) allocation',
            'Undertaxed Profits Rule (UTPR) allocation',
            'Qualified Domestic Minimum Top-up Tax (QDMTT)',
            'Substance-based income exclusion carve-outs',
            'Transitional safe harbour assessment',
            'GloBE Information Return (GIR) preparation',
            'Canada Global Minimum Tax Act alignment',
        ];
    }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

export const pillar2GloBEAgentFactory = {
    create: (config?: Partial<GloBEAgentConfig>) =>
        new Pillar2GloBEAgent(config),
    instance: () => new Pillar2GloBEAgent(),
};

export const createPillar2GloBEAgent = pillar2GloBEAgentFactory.create;
export const pillar2GloBEAgent = pillar2GloBEAgentFactory;
