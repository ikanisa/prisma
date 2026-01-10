/**
 * Malta MFSA Pillar 3 Reporting Agent
 * 
 * Autonomous agent for MFSA-regulated entities' Pillar 3 disclosures.
 * 
 * Legal Basis:
 * - Investment Services Act (Cap. 370)
 * - Banking Act (Cap. 371)
 * - EU Regulation 575/2013 (CRR) - Capital Requirements Regulation
 * - EU Directive 2013/36/EU (CRD IV)
 * - AIFMD - Alternative Investment Fund Managers Directive
 * - MFSA Investment Services Rules
 * 
 * Features:
 * - Capital adequacy ratios (CET1, Tier 1, Total Capital)
 * - Risk-weighted asset calculations
 * - Liquidity coverage ratio (LCR)
 * - Net stable funding ratio (NSFR)
 * - Leverage ratio calculations
 * - AIFMD risk disclosures for funds
 * - Automated disclosure template generation
 */

// ============================================================================
// TYPES
// ============================================================================

export enum EntityType {
    CREDIT_INSTITUTION = 'credit_institution',
    INVESTMENT_FIRM_CLASS_1 = 'investment_firm_class_1',
    INVESTMENT_FIRM_CLASS_2 = 'investment_firm_class_2',
    INVESTMENT_FIRM_CLASS_3 = 'investment_firm_class_3',
    AIFM = 'alternative_investment_fund_manager',
    UCITS_MANAGEMENT = 'ucits_management_company',
    PAYMENT_INSTITUTION = 'payment_institution',
    E_MONEY_INSTITUTION = 'e_money_institution',
}

export interface CapitalComponents {
    // CET1 Capital
    paidUpCapital: number;
    sharePremiun: number;
    retainedEarnings: number;
    accumulatedOCI: number;
    otherReserves: number;
    cet1Deductions: {
        goodwill: number;
        intangibles: number;
        deferredTaxAssets: number;
        otherDeductions: number;
    };

    // AT1 Capital
    at1Instruments: number;
    at1Deductions: number;

    // Tier 2 Capital
    t2Instruments: number;
    generalProvisions: number;
    t2Deductions: number;
}

export interface RiskWeightedAssets {
    creditRisk: {
        sovereigns: number;
        institutions: number;
        corporates: number;
        retail: number;
        securedByMortgages: number;
        defaulted: number;
        equityExposures: number;
        otherItems: number;
        total: number;
    };
    marketRisk: {
        interestRateRisk: number;
        equityRisk: number;
        foreignExchangeRisk: number;
        commoditiesRisk: number;
        total: number;
    };
    operationalRisk: {
        approach: 'BIA' | 'TSA' | 'AMA';  // Basic Indicator, Standardised, Advanced
        relevantIndicator: number;
        riskWeightedAmount: number;
        total: number;
    };
    totalRWA: number;
}

export interface CapitalRatios {
    cet1Ratio: number;      // Minimum 4.5%
    tier1Ratio: number;     // Minimum 6%
    totalCapitalRatio: number;  // Minimum 8%
    leverageRatio: number;  // Minimum 3%
    isCompliant: boolean;
    breaches: string[];
}

export interface LiquidityMetrics {
    // LCR Components
    highQualityLiquidAssets: number;
    netCashOutflows30Days: number;
    liquidityCoverageRatio: number;  // Minimum 100%

    // NSFR Components
    availableStableFunding: number;
    requiredStableFunding: number;
    netStableFundingRatio: number;  // Minimum 100%

    isCompliant: boolean;
    warnings: string[];
}

export interface AIFMDRiskDisclosure {
    fundId: string;
    fundName: string;
    aifmName: string;
    reportingDate: Date;

    // Assets Under Management
    aum: number;
    nav: number;

    // Leverage Information
    grossLeverage: number;
    commitmentLeverage: number;
    leverageLimit: number;

    // Risk Profile
    marketRisk: RiskLevel;
    creditRisk: RiskLevel;
    liquidityRisk: RiskLevel;
    counterpartyRisk: RiskLevel;
    operationalRisk: RiskLevel;

    // Liquidity Profile
    liquidityProfile: {
        bucket: string;
        investorRedemptionPercentage: number;
        portfolioLiquidityPercentage: number;
    }[];

    // Concentration
    largestCounterpartyExposure: number;
    top5AssetsConcentration: number;
}

export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

export interface Pillar3Disclosure {
    disclosureId: string;
    entityName: string;
    entityType: EntityType;
    referenceDate: Date;
    publicationDate: Date;

    // Capital
    capitalComponents: CapitalComponents;
    capitalRatios: CapitalRatios;

    // Risk
    riskWeightedAssets: RiskWeightedAssets;

    // Liquidity
    liquidityMetrics: LiquidityMetrics;

    // Additional Disclosures
    riskManagementObjectives: string;
    remunerationPolicy: string;

    // AIFMD (if applicable)
    aifmdDisclosures?: AIFMDRiskDisclosure[];

    status: 'draft' | 'reviewed' | 'published';
}

export interface Pillar3AgentConfig {
    openaiApiKey?: string;
    entityType?: EntityType;
    mfsaLicenseNumber?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MINIMUM_CAPITAL_RATIOS = {
    cet1: 0.045,       // 4.5%
    tier1: 0.06,       // 6%
    totalCapital: 0.08, // 8%
    leverage: 0.03,    // 3%
};

// Capital buffers (for future enhanced compliance checks)
const _CAPITAL_BUFFERS = {
    capitalConservation: 0.025,  // 2.5%
    countercyclical: 0.0,        // Malta currently 0%
    systemic: 0.01,              // 1% for significant institutions
};

const LCR_MINIMUM = 1.0;  // 100%
const NSFR_MINIMUM = 1.0; // 100%

// Risk weights per CRR Article 114-134
const CREDIT_RISK_WEIGHTS = {
    sovereigns_0: 0.00,      // EEA sovereigns, 0% risk weight
    sovereigns_20: 0.20,     // Other sovereigns CQS 2
    sovereigns_50: 0.50,     // CQS 3
    sovereigns_100: 1.00,    // CQS 4-5
    sovereigns_150: 1.50,    // CQS 6

    institutions_20: 0.20,   // CQS 1-2
    institutions_50: 0.50,   // CQS 3
    institutions_100: 1.00,  // CQS 4-5
    institutions_150: 1.50,  // CQS 6

    corporates_20: 0.20,     // CQS 1
    corporates_50: 0.50,     // CQS 2
    corporates_100: 1.00,    // CQS 3-5
    corporates_150: 1.50,    // CQS 6

    retail_75: 0.75,         // Qualifying retail
    mortgages_35: 0.35,      // Residential mortgages
    mortgages_50: 0.50,      // Commercial mortgages
    defaulted_100: 1.00,     // Defaulted (with provisions)
    defaulted_150: 1.50,     // Defaulted (without provisions)
    equity_100: 1.00,        // Listed equity
    equity_150: 1.50,        // Unlisted equity
    equity_250: 2.50,        // Speculative investments
};

// Operational risk - Basic Indicator Approach coefficient
const BIA_COEFFICIENT = 0.15;  // 15%

// ============================================================================
// MFSA PILLAR 3 AGENT
// ============================================================================

export class MFSAPillar3Agent {
    public readonly name = 'Malta MFSA Pillar 3 Reporting Agent';
    public readonly version = '1.0.0';
    public readonly category = 'regulatory';
    public readonly type = 'specialist';

    private config: Pillar3AgentConfig;

    constructor(config: Pillar3AgentConfig = {}) {
        this.config = config;
    }

    // ============================================================================
    // CAPITAL CALCULATIONS
    // ============================================================================

    /**
     * Calculate CET1, Tier 1, and Total Capital
     */
    calculateCapital(components: CapitalComponents): {
        cet1Capital: number;
        at1Capital: number;
        tier1Capital: number;
        t2Capital: number;
        totalCapital: number;
    } {
        // CET1 = paid-up + premium + retained + OCI + reserves - deductions
        const cet1Capital =
            components.paidUpCapital +
            components.sharePremiun +
            components.retainedEarnings +
            components.accumulatedOCI +
            components.otherReserves -
            components.cet1Deductions.goodwill -
            components.cet1Deductions.intangibles -
            components.cet1Deductions.deferredTaxAssets -
            components.cet1Deductions.otherDeductions;

        // AT1 = AT1 instruments - deductions
        const at1Capital = components.at1Instruments - components.at1Deductions;

        // Tier 1 = CET1 + AT1
        const tier1Capital = cet1Capital + at1Capital;

        // T2 = T2 instruments + general provisions - deductions
        const t2Capital =
            components.t2Instruments +
            components.generalProvisions -
            components.t2Deductions;

        // Total Capital = Tier 1 + T2
        const totalCapital = tier1Capital + t2Capital;

        return {
            cet1Capital: this.roundCurrency(cet1Capital),
            at1Capital: this.roundCurrency(at1Capital),
            tier1Capital: this.roundCurrency(tier1Capital),
            t2Capital: this.roundCurrency(t2Capital),
            totalCapital: this.roundCurrency(totalCapital),
        };
    }

    /**
     * Calculate Risk-Weighted Assets
     */
    calculateRWA(exposures: {
        creditExposures: {
            category: keyof typeof CREDIT_RISK_WEIGHTS;
            exposureValue: number;
        }[];
        marketRiskExposures?: {
            interestRate: number;
            equity: number;
            forex: number;
            commodities: number;
        };
        operationalRiskIndicator: number;  // Gross income (3-year average)
    }): RiskWeightedAssets {
        // Credit Risk RWA
        const creditRisk = {
            sovereigns: 0,
            institutions: 0,
            corporates: 0,
            retail: 0,
            securedByMortgages: 0,
            defaulted: 0,
            equityExposures: 0,
            otherItems: 0,
            total: 0,
        };

        for (const exposure of exposures.creditExposures) {
            const riskWeight = CREDIT_RISK_WEIGHTS[exposure.category] || 1.0;
            const rwa = exposure.exposureValue * riskWeight;

            // Categorize based on exposure type
            if (exposure.category.startsWith('sovereigns')) {
                creditRisk.sovereigns += rwa;
            } else if (exposure.category.startsWith('institutions')) {
                creditRisk.institutions += rwa;
            } else if (exposure.category.startsWith('corporates')) {
                creditRisk.corporates += rwa;
            } else if (exposure.category.startsWith('retail')) {
                creditRisk.retail += rwa;
            } else if (exposure.category.startsWith('mortgages')) {
                creditRisk.securedByMortgages += rwa;
            } else if (exposure.category.startsWith('defaulted')) {
                creditRisk.defaulted += rwa;
            } else if (exposure.category.startsWith('equity')) {
                creditRisk.equityExposures += rwa;
            } else {
                creditRisk.otherItems += rwa;
            }
        }

        creditRisk.total =
            creditRisk.sovereigns +
            creditRisk.institutions +
            creditRisk.corporates +
            creditRisk.retail +
            creditRisk.securedByMortgages +
            creditRisk.defaulted +
            creditRisk.equityExposures +
            creditRisk.otherItems;

        // Market Risk RWA (simplified)
        const marketRisk = {
            interestRateRisk: (exposures.marketRiskExposures?.interestRate || 0) * 0.08,
            equityRisk: (exposures.marketRiskExposures?.equity || 0) * 0.08,
            foreignExchangeRisk: (exposures.marketRiskExposures?.forex || 0) * 0.08,
            commoditiesRisk: (exposures.marketRiskExposures?.commodities || 0) * 0.15,
            total: 0,
        };
        marketRisk.total =
            marketRisk.interestRateRisk +
            marketRisk.equityRisk +
            marketRisk.foreignExchangeRisk +
            marketRisk.commoditiesRisk;

        // Operational Risk RWA (Basic Indicator Approach)
        const operationalRisk = {
            approach: 'BIA' as const,
            relevantIndicator: exposures.operationalRiskIndicator,
            riskWeightedAmount: exposures.operationalRiskIndicator * BIA_COEFFICIENT,
            total: exposures.operationalRiskIndicator * BIA_COEFFICIENT * 12.5,  // Convert K to RWA
        };

        const totalRWA = creditRisk.total + marketRisk.total + operationalRisk.total;

        // Round all values in creditRisk
        const roundedCreditRisk = {
            sovereigns: this.roundCurrency(creditRisk.sovereigns),
            institutions: this.roundCurrency(creditRisk.institutions),
            corporates: this.roundCurrency(creditRisk.corporates),
            retail: this.roundCurrency(creditRisk.retail),
            securedByMortgages: this.roundCurrency(creditRisk.securedByMortgages),
            defaulted: this.roundCurrency(creditRisk.defaulted),
            equityExposures: this.roundCurrency(creditRisk.equityExposures),
            otherItems: this.roundCurrency(creditRisk.otherItems),
            total: this.roundCurrency(creditRisk.total),
        };

        // Round all values in marketRisk
        const roundedMarketRisk = {
            interestRateRisk: this.roundCurrency(marketRisk.interestRateRisk),
            equityRisk: this.roundCurrency(marketRisk.equityRisk),
            foreignExchangeRisk: this.roundCurrency(marketRisk.foreignExchangeRisk),
            commoditiesRisk: this.roundCurrency(marketRisk.commoditiesRisk),
            total: this.roundCurrency(marketRisk.total),
        };

        return {
            creditRisk: roundedCreditRisk,
            marketRisk: roundedMarketRisk,
            operationalRisk: {
                ...operationalRisk,
                relevantIndicator: this.roundCurrency(operationalRisk.relevantIndicator),
                riskWeightedAmount: this.roundCurrency(operationalRisk.riskWeightedAmount),
                total: this.roundCurrency(operationalRisk.total),
            },
            totalRWA: this.roundCurrency(totalRWA),
        };
    }

    /**
     * Calculate Capital Ratios
     */
    calculateCapitalRatios(
        capital: {
            cet1Capital: number;
            tier1Capital: number;
            totalCapital: number;
        },
        rwa: { totalRWA: number },
        totalExposure: number  // For leverage ratio
    ): CapitalRatios {
        const cet1Ratio = rwa.totalRWA > 0 ? capital.cet1Capital / rwa.totalRWA : 0;
        const tier1Ratio = rwa.totalRWA > 0 ? capital.tier1Capital / rwa.totalRWA : 0;
        const totalCapitalRatio = rwa.totalRWA > 0 ? capital.totalCapital / rwa.totalRWA : 0;
        const leverageRatio = totalExposure > 0 ? capital.tier1Capital / totalExposure : 0;

        const breaches: string[] = [];

        if (cet1Ratio < MINIMUM_CAPITAL_RATIOS.cet1) {
            breaches.push(`CET1 ratio ${(cet1Ratio * 100).toFixed(2)}% below minimum 4.5%`);
        }
        if (tier1Ratio < MINIMUM_CAPITAL_RATIOS.tier1) {
            breaches.push(`Tier 1 ratio ${(tier1Ratio * 100).toFixed(2)}% below minimum 6%`);
        }
        if (totalCapitalRatio < MINIMUM_CAPITAL_RATIOS.totalCapital) {
            breaches.push(`Total capital ratio ${(totalCapitalRatio * 100).toFixed(2)}% below minimum 8%`);
        }
        if (leverageRatio < MINIMUM_CAPITAL_RATIOS.leverage) {
            breaches.push(`Leverage ratio ${(leverageRatio * 100).toFixed(2)}% below minimum 3%`);
        }

        return {
            cet1Ratio: Math.round(cet1Ratio * 10000) / 100,  // e.g., 12.50%
            tier1Ratio: Math.round(tier1Ratio * 10000) / 100,
            totalCapitalRatio: Math.round(totalCapitalRatio * 10000) / 100,
            leverageRatio: Math.round(leverageRatio * 10000) / 100,
            isCompliant: breaches.length === 0,
            breaches,
        };
    }

    // ============================================================================
    // LIQUIDITY CALCULATIONS
    // ============================================================================

    /**
     * Calculate Liquidity Coverage Ratio (LCR)
     */
    calculateLCR(hqla: {
        level1: number;  // Cash, central bank reserves, sovereign bonds
        level2A: number; // Covered bonds, corporate bonds AA-
        level2B: number; // Lower grade bonds, equities
    }, outflows: {
        retailDepositsStable: number;
        retailDepositsLessStable: number;
        unsecuredWholesale: number;
        securedWholesale: number;
        derivativeOutflows: number;
        otherOutflows: number;
    }, inflows: {
        securedLending: number;
        retailInflows: number;
        wholesaleInflows: number;
        otherInflows: number;
    }): LiquidityMetrics {
        // HQLA calculation with haircuts
        const hqlaTotal =
            hqla.level1 * 1.00 +  // No haircut
            hqla.level2A * 0.85 + // 15% haircut
            hqla.level2B * 0.50;  // 50% haircut

        // Outflow calculation with run-off rates
        const totalOutflows =
            outflows.retailDepositsStable * 0.05 +    // 5% run-off
            outflows.retailDepositsLessStable * 0.10 + // 10% run-off
            outflows.unsecuredWholesale * 0.40 +       // 40% run-off
            outflows.securedWholesale * 0.25 +         // 25% run-off
            outflows.derivativeOutflows * 1.00 +       // 100%
            outflows.otherOutflows * 0.50;             // 50%

        // Inflow calculation (capped at 75% of outflows)
        const grossInflows =
            inflows.securedLending * 0.00 +    // 0% for Level 1 collateral
            inflows.retailInflows * 0.50 +     // 50%
            inflows.wholesaleInflows * 1.00 +  // 100%
            inflows.otherInflows * 0.50;       // 50%

        const cappedInflows = Math.min(grossInflows, totalOutflows * 0.75);
        const netOutflows = Math.max(totalOutflows - cappedInflows, totalOutflows * 0.25);

        const lcr = netOutflows > 0 ? hqlaTotal / netOutflows : 1;

        // Simplified NSFR (would need more detailed inputs in production)
        const asf = hqla.level1 + hqla.level2A + hqla.level2B;  // Simplified
        const rsf = totalOutflows * 0.5;  // Simplified
        const nsfr = rsf > 0 ? asf / rsf : 1;

        const warnings: string[] = [];
        if (lcr < LCR_MINIMUM) {
            warnings.push(`LCR ${(lcr * 100).toFixed(1)}% below minimum 100%`);
        }
        if (nsfr < NSFR_MINIMUM) {
            warnings.push(`NSFR ${(nsfr * 100).toFixed(1)}% below minimum 100%`);
        }

        return {
            highQualityLiquidAssets: this.roundCurrency(hqlaTotal),
            netCashOutflows30Days: this.roundCurrency(netOutflows),
            liquidityCoverageRatio: Math.round(lcr * 10000) / 100,
            availableStableFunding: this.roundCurrency(asf),
            requiredStableFunding: this.roundCurrency(rsf),
            netStableFundingRatio: Math.round(nsfr * 10000) / 100,
            isCompliant: lcr >= LCR_MINIMUM && nsfr >= NSFR_MINIMUM,
            warnings,
        };
    }

    // ============================================================================
    // AIFMD DISCLOSURES
    // ============================================================================

    /**
     * Generate AIFMD risk disclosure for alternative investment fund
     */
    generateAIFMDDisclosure(fund: {
        fundId: string;
        fundName: string;
        aifmName: string;
        nav: number;
        aum: number;
        grossExposure: number;
        commitmentExposure: number;
        leverageLimit: number;
        liquidityProfile: { bucket: string; investorPercentage: number; portfolioPercentage: number }[];
        largestCounterpartyExposure: number;
        top5AssetsValue: number;
        riskAssessments: {
            market: RiskLevel;
            credit: RiskLevel;
            liquidity: RiskLevel;
            counterparty: RiskLevel;
            operational: RiskLevel;
        };
    }): AIFMDRiskDisclosure {
        // Calculate leverage ratios
        const grossLeverage = fund.nav > 0 ? fund.grossExposure / fund.nav : 1;
        const commitmentLeverage = fund.nav > 0 ? fund.commitmentExposure / fund.nav : 1;

        return {
            fundId: fund.fundId,
            fundName: fund.fundName,
            aifmName: fund.aifmName,
            reportingDate: new Date(),
            aum: this.roundCurrency(fund.aum),
            nav: this.roundCurrency(fund.nav),
            grossLeverage: Math.round(grossLeverage * 100) / 100,
            commitmentLeverage: Math.round(commitmentLeverage * 100) / 100,
            leverageLimit: fund.leverageLimit,
            marketRisk: fund.riskAssessments.market,
            creditRisk: fund.riskAssessments.credit,
            liquidityRisk: fund.riskAssessments.liquidity,
            counterpartyRisk: fund.riskAssessments.counterparty,
            operationalRisk: fund.riskAssessments.operational,
            liquidityProfile: fund.liquidityProfile.map(lp => ({
                bucket: lp.bucket,
                investorRedemptionPercentage: lp.investorPercentage,
                portfolioLiquidityPercentage: lp.portfolioPercentage,
            })),
            largestCounterpartyExposure: Math.round((fund.largestCounterpartyExposure / fund.nav) * 10000) / 100,
            top5AssetsConcentration: Math.round((fund.top5AssetsValue / fund.nav) * 10000) / 100,
        };
    }

    // ============================================================================
    // DISCLOSURE GENERATION
    // ============================================================================

    /**
     * Generate complete Pillar 3 disclosure document
     */
    generatePillar3Disclosure(
        entityName: string,
        entityType: EntityType,
        referenceDate: Date,
        capitalComponents: CapitalComponents,
        exposures: {
            creditExposures: { category: keyof typeof CREDIT_RISK_WEIGHTS; exposureValue: number }[];
            marketRiskExposures?: { interestRate: number; equity: number; forex: number; commodities: number };
            operationalRiskIndicator: number;
        },
        liquidityData: {
            hqla: { level1: number; level2A: number; level2B: number };
            outflows: {
                retailDepositsStable: number;
                retailDepositsLessStable: number;
                unsecuredWholesale: number;
                securedWholesale: number;
                derivativeOutflows: number;
                otherOutflows: number;
            };
            inflows: {
                securedLending: number;
                retailInflows: number;
                wholesaleInflows: number;
                otherInflows: number;
            };
        },
        totalExposure: number,
        aifmdFunds?: Parameters<typeof this.generateAIFMDDisclosure>[0][]
    ): Pillar3Disclosure {
        const capital = this.calculateCapital(capitalComponents);
        const rwa = this.calculateRWA(exposures);
        const capitalRatios = this.calculateCapitalRatios(capital, rwa, totalExposure);
        const liquidity = this.calculateLCR(liquidityData.hqla, liquidityData.outflows, liquidityData.inflows);

        const aifmdDisclosures = aifmdFunds?.map(fund => this.generateAIFMDDisclosure(fund));

        return {
            disclosureId: this.generateDisclosureId(entityName, referenceDate),
            entityName,
            entityType,
            referenceDate,
            publicationDate: new Date(),
            capitalComponents,
            capitalRatios,
            riskWeightedAssets: rwa,
            liquidityMetrics: liquidity,
            riskManagementObjectives: this.generateRiskManagementSection(entityType),
            remunerationPolicy: this.generateRemunerationSection(),
            aifmdDisclosures,
            status: 'draft',
        };
    }

    /**
     * Generate disclosure in MFSA-compliant format
     */
    generateDisclosureDocument(disclosure: Pillar3Disclosure): string {
        return `
================================================================================
                        PILLAR 3 DISCLOSURE
                     ${disclosure.entityName}
                  Reference Date: ${disclosure.referenceDate.toISOString().split('T')[0]}
================================================================================

1. OVERVIEW
-----------
Entity Type: ${disclosure.entityType}
Disclosure ID: ${disclosure.disclosureId}
Publication Date: ${disclosure.publicationDate.toISOString().split('T')[0]}

2. CAPITAL ADEQUACY
-------------------

2.1 Capital Composition

CET1 Capital:
  - Paid-up capital: €${disclosure.capitalComponents.paidUpCapital.toLocaleString()}
  - Share premium: €${disclosure.capitalComponents.sharePremiun.toLocaleString()}
  - Retained earnings: €${disclosure.capitalComponents.retainedEarnings.toLocaleString()}
  - Other comprehensive income: €${disclosure.capitalComponents.accumulatedOCI.toLocaleString()}
  - Less: Deductions
    - Goodwill: (€${disclosure.capitalComponents.cet1Deductions.goodwill.toLocaleString()})
    - Intangibles: (€${disclosure.capitalComponents.cet1Deductions.intangibles.toLocaleString()})
    - DTA: (€${disclosure.capitalComponents.cet1Deductions.deferredTaxAssets.toLocaleString()})

AT1 Capital: €${disclosure.capitalComponents.at1Instruments.toLocaleString()}
Tier 2 Capital: €${(disclosure.capitalComponents.t2Instruments + disclosure.capitalComponents.generalProvisions).toLocaleString()}

2.2 Capital Ratios

| Ratio              | Actual  | Minimum | Status |
|--------------------|---------|---------|--------|
| CET1 Ratio         | ${disclosure.capitalRatios.cet1Ratio.toFixed(2)}% | 4.50%   | ${disclosure.capitalRatios.cet1Ratio >= 4.5 ? '✓' : '✗'} |
| Tier 1 Ratio       | ${disclosure.capitalRatios.tier1Ratio.toFixed(2)}% | 6.00%   | ${disclosure.capitalRatios.tier1Ratio >= 6 ? '✓' : '✗'} |
| Total Capital Ratio| ${disclosure.capitalRatios.totalCapitalRatio.toFixed(2)}% | 8.00%   | ${disclosure.capitalRatios.totalCapitalRatio >= 8 ? '✓' : '✗'} |
| Leverage Ratio     | ${disclosure.capitalRatios.leverageRatio.toFixed(2)}% | 3.00%   | ${disclosure.capitalRatios.leverageRatio >= 3 ? '✓' : '✗'} |

Compliance Status: ${disclosure.capitalRatios.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
${disclosure.capitalRatios.breaches.length > 0 ? 'Breaches:\n' + disclosure.capitalRatios.breaches.map(b => '  - ' + b).join('\n') : ''}

3. RISK-WEIGHTED ASSETS
-----------------------

3.1 Credit Risk

| Exposure Class        | RWA (€)            |
|-----------------------|--------------------|
| Sovereigns            | ${disclosure.riskWeightedAssets.creditRisk.sovereigns.toLocaleString()} |
| Institutions          | ${disclosure.riskWeightedAssets.creditRisk.institutions.toLocaleString()} |
| Corporates            | ${disclosure.riskWeightedAssets.creditRisk.corporates.toLocaleString()} |
| Retail                | ${disclosure.riskWeightedAssets.creditRisk.retail.toLocaleString()} |
| Secured by Mortgages  | ${disclosure.riskWeightedAssets.creditRisk.securedByMortgages.toLocaleString()} |
| Defaulted             | ${disclosure.riskWeightedAssets.creditRisk.defaulted.toLocaleString()} |
| Equity                | ${disclosure.riskWeightedAssets.creditRisk.equityExposures.toLocaleString()} |
| Other                 | ${disclosure.riskWeightedAssets.creditRisk.otherItems.toLocaleString()} |
|-----------------------|--------------------|
| TOTAL CREDIT RWA      | ${disclosure.riskWeightedAssets.creditRisk.total.toLocaleString()} |

3.2 Market Risk RWA: €${disclosure.riskWeightedAssets.marketRisk.total.toLocaleString()}
3.3 Operational Risk RWA: €${disclosure.riskWeightedAssets.operationalRisk.total.toLocaleString()}

TOTAL RWA: €${disclosure.riskWeightedAssets.totalRWA.toLocaleString()}

4. LIQUIDITY
------------

4.1 Liquidity Coverage Ratio (LCR)

HQLA: €${disclosure.liquidityMetrics.highQualityLiquidAssets.toLocaleString()}
Net Cash Outflows (30 days): €${disclosure.liquidityMetrics.netCashOutflows30Days.toLocaleString()}
LCR: ${disclosure.liquidityMetrics.liquidityCoverageRatio.toFixed(1)}% (Minimum: 100%)

4.2 Net Stable Funding Ratio (NSFR)

Available Stable Funding: €${disclosure.liquidityMetrics.availableStableFunding.toLocaleString()}
Required Stable Funding: €${disclosure.liquidityMetrics.requiredStableFunding.toLocaleString()}
NSFR: ${disclosure.liquidityMetrics.netStableFundingRatio.toFixed(1)}% (Minimum: 100%)

Liquidity Compliance: ${disclosure.liquidityMetrics.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}

5. RISK MANAGEMENT
------------------

${disclosure.riskManagementObjectives}

6. REMUNERATION POLICY
----------------------

${disclosure.remunerationPolicy}

${disclosure.aifmdDisclosures && disclosure.aifmdDisclosures.length > 0 ? `
7. AIFMD DISCLOSURES
--------------------

${disclosure.aifmdDisclosures.map(aif => `
Fund: ${aif.fundName}
NAV: €${aif.nav.toLocaleString()}
AUM: €${aif.aum.toLocaleString()}
Gross Leverage: ${aif.grossLeverage}x
Commitment Leverage: ${aif.commitmentLeverage}x
Leverage Limit: ${aif.leverageLimit}x
Risk Profile:
  - Market Risk: ${aif.marketRisk}
  - Credit Risk: ${aif.creditRisk}
  - Liquidity Risk: ${aif.liquidityRisk}
  - Counterparty Risk: ${aif.counterpartyRisk}
  - Operational Risk: ${aif.operationalRisk}
Largest Counterparty Exposure: ${aif.largestCounterpartyExposure}%
Top 5 Assets Concentration: ${aif.top5AssetsConcentration}%
`).join('\n')}` : ''}

================================================================================
                           END OF DISCLOSURE
================================================================================
`;
    }

    // ============================================================================
    // UTILITIES
    // ============================================================================

    private generateRiskManagementSection(entityType: EntityType): string {
        return `The ${entityType.replace(/_/g, ' ')} maintains a comprehensive risk management framework aligned with MFSA requirements and EU regulations. Risk management objectives include:

- Identification, measurement, and monitoring of all material risks
- Establishment of appropriate risk limits and controls
- Regular stress testing and scenario analysis
- Independent risk oversight function
- Board-level risk committee oversight`;
    }

    private generateRemunerationSection(): string {
        return `The entity's remuneration policy is designed to:

- Align remuneration with prudent risk management
- Avoid incentives for excessive risk-taking
- Ensure fixed and variable remuneration are appropriately balanced
- Include deferral mechanisms for variable remuneration
- Apply clawback provisions where appropriate

Details of remuneration to identified staff are disclosed in accordance with Article 450 CRR.`;
    }

    private generateDisclosureId(entityName: string, referenceDate: Date): string {
        const shortName = entityName.substring(0, 10).toUpperCase().replace(/\s/g, '');
        const dateStr = referenceDate.toISOString().split('T')[0].replace(/-/g, '');
        return `P3-${shortName}-${dateStr}`;
    }

    private roundCurrency(value: number): number {
        return Math.round(value * 100) / 100;
    }

    /**
     * Get agent capabilities
     */
    getCapabilities(): string[] {
        return [
            'CET1, Tier 1, Total Capital calculation',
            'Risk-weighted asset computation (credit, market, operational)',
            'Capital ratio assessment (CET1, Tier 1, Total, Leverage)',
            'Liquidity Coverage Ratio (LCR) calculation',
            'Net Stable Funding Ratio (NSFR) calculation',
            'AIFMD risk disclosure generation',
            'Pillar 3 disclosure document generation',
            'Regulatory compliance assessment',
        ];
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createMFSAPillar3Agent(config?: Pillar3AgentConfig): MFSAPillar3Agent {
    return new MFSAPillar3Agent(config);
}

// Lazy singleton
let _pillar3Agent: MFSAPillar3Agent | null = null;

export const mfsaPillar3Agent = {
    instance(config?: Pillar3AgentConfig): MFSAPillar3Agent {
        if (!_pillar3Agent) {
            _pillar3Agent = new MFSAPillar3Agent(config);
        }
        return _pillar3Agent;
    },
};

export default MFSAPillar3Agent;
