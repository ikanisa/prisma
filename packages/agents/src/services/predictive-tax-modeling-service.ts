/**
 * Predictive Tax Modeling Service
 * 
 * AI-powered tax forecasting and scenario analysis for Malta, Canada, and Rwanda.
 * Provides tax projections, optimization recommendations, and what-if modeling.
 */

// ============================================================================
// TYPES
// ============================================================================

export type JurisdictionCode = 'MT' | 'CA' | 'RW';

export interface TaxForecast {
    id: string;
    jurisdiction: JurisdictionCode;
    forecastType: 'annual' | 'quarterly' | 'monthly';
    period: string;
    createdAt: Date;
    projections: TaxProjection[];
    assumptions: ForecastAssumption[];
    confidence: number;
    scenario: 'base' | 'optimistic' | 'pessimistic';
}

export interface TaxProjection {
    taxType: TaxType;
    projectedAmount: number;
    comparisonAmount?: number;
    variance?: number;
    variancePercent?: number;
    drivers: string[];
}

export type TaxType =
    | 'corporate_income_tax'
    | 'vat_gst'
    | 'withholding_tax'
    | 'payroll_tax'
    | 'capital_gains'
    | 'digital_services_tax'
    | 'minimum_tax';

export interface ForecastAssumption {
    name: string;
    value: number | string;
    sensitivity: 'low' | 'medium' | 'high';
    description?: string;
}

export interface ScenarioAnalysis {
    baseCase: TaxForecast;
    scenarios: {
        name: string;
        description: string;
        adjustments: { parameter: string; change: number }[];
        result: TaxForecast;
        impact: number;
    }[];
    recommendation: string;
}

export interface OptimizationOpportunity {
    id: string;
    jurisdiction: JurisdictionCode;
    opportunity: string;
    description: string;
    estimatedSavings: number;
    implementationComplexity: 'simple' | 'moderate' | 'complex';
    riskLevel: 'low' | 'medium' | 'high';
    requirements: string[];
    timeline: string;
}

// ============================================================================
// TAX RATE KNOWLEDGE BASE
// ============================================================================

interface JurisdictionTaxRates {
    jurisdiction: JurisdictionCode;
    corporateTax: { rate: number; smallBusiness?: number; effectiveRate?: number };
    vat: { standard: number; reduced?: number[]; zero?: boolean };
    withholding: { dividends: number; interest: number; royalties: number; services: number };
    payroll: { employerRate: number; employeeRate: number };
    other: { name: string; rate: number }[];
}

const TAX_RATES: Record<JurisdictionCode, JurisdictionTaxRates> = {
    MT: {
        jurisdiction: 'MT',
        corporateTax: { rate: 35, effectiveRate: 5 },  // With imputation refund
        vat: { standard: 18, reduced: [12, 7, 5], zero: true },
        withholding: { dividends: 0, interest: 0, royalties: 0, services: 0 },  // EU directives
        payroll: { employerRate: 10, employeeRate: 10 },  // SSC
        other: [],
    },
    CA: {
        jurisdiction: 'CA',
        corporateTax: { rate: 15, smallBusiness: 9 },  // Federal only
        vat: { standard: 5, zero: true },  // GST only
        withholding: { dividends: 25, interest: 25, royalties: 25, services: 15 },  // Non-resident rates
        payroll: { employerRate: 7.65, employeeRate: 7.65 },  // CPP + EI
        other: [{ name: 'Provincial CIT', rate: 11.5 }],  // Ontario example
    },
    RW: {
        jurisdiction: 'RW',
        corporateTax: { rate: 30 },
        vat: { standard: 18, zero: true },
        withholding: { dividends: 15, interest: 15, royalties: 15, services: 15 },
        payroll: { employerRate: 5, employeeRate: 3 },  // RSSB
        other: [
            { name: 'Digital Services Tax', rate: 1.5 },
            { name: 'Tourism Levy', rate: 3 },
        ],
    },
};

// ============================================================================
// PREDICTIVE TAX MODELING SERVICE
// ============================================================================

export interface PredictiveTaxModelingConfig {
    organizationId?: string;
    userId?: string;
    defaultJurisdiction?: JurisdictionCode;
}

export interface FinancialInputs {
    revenue: number;
    costOfGoodsSold: number;
    operatingExpenses: number;
    interestExpense?: number;
    depreciation?: number;
    capitalGains?: number;
    dividendsReceived?: number;
    dividendsPaid?: number;
    interestPaid?: number;
    royaltiesPaid?: number;
    servicesPaid?: number;
    payrollCosts?: number;
    employeeCount?: number;
    digitalServicesRevenue?: number;
    tourismRevenue?: number;
    euSales?: number;
    domesticSales?: number;
    exportSales?: number;
}

export class PredictiveTaxModelingService {
    constructor(private config: PredictiveTaxModelingConfig = {}) { }

    /**
     * Generate full tax forecast for a jurisdiction
     */
    generateForecast(
        jurisdiction: JurisdictionCode,
        financials: FinancialInputs,
        options?: {
            forecastType?: 'annual' | 'quarterly' | 'monthly';
            period?: string;
            scenario?: 'base' | 'optimistic' | 'pessimistic';
        }
    ): TaxForecast {
        const rates = TAX_RATES[jurisdiction];
        const assumptions = this.buildAssumptions(jurisdiction, financials);
        const projections = this.calculateProjections(jurisdiction, financials, rates, options?.scenario);

        return {
            id: `forecast-${Date.now()}`,
            jurisdiction,
            forecastType: options?.forecastType || 'annual',
            period: options?.period || new Date().getFullYear().toString(),
            createdAt: new Date(),
            projections,
            assumptions,
            confidence: this.calculateConfidence(projections),
            scenario: options?.scenario || 'base',
        };
    }

    /**
     * Calculate tax projections
     */
    private calculateProjections(
        jurisdiction: JurisdictionCode,
        financials: FinancialInputs,
        rates: JurisdictionTaxRates,
        scenario?: 'base' | 'optimistic' | 'pessimistic'
    ): TaxProjection[] {
        const projections: TaxProjection[] = [];
        const scenarioMultiplier = scenario === 'optimistic' ? 0.9 : scenario === 'pessimistic' ? 1.1 : 1;

        // Corporate Income Tax
        const taxableIncome = this.calculateTaxableIncome(financials);
        const citRate = taxableIncome > 500000 ? rates.corporateTax.rate : (rates.corporateTax.smallBusiness || rates.corporateTax.rate);
        const effectiveRate = rates.corporateTax.effectiveRate || citRate;
        const citAmount = Math.max(0, taxableIncome * (effectiveRate / 100) * scenarioMultiplier);

        projections.push({
            taxType: 'corporate_income_tax',
            projectedAmount: Math.round(citAmount),
            drivers: this.identifyDrivers(jurisdiction, 'corporate_income_tax', financials),
        });

        // VAT/GST
        const vatableRevenue = financials.domesticSales || financials.revenue * 0.8;
        const vatAmount = vatableRevenue * (rates.vat.standard / 100);
        projections.push({
            taxType: 'vat_gst',
            projectedAmount: Math.round(vatAmount * scenarioMultiplier),
            drivers: this.identifyDrivers(jurisdiction, 'vat_gst', financials),
        });

        // Withholding Tax
        const withholdingBase = (financials.dividendsPaid || 0) + (financials.interestPaid || 0) + (financials.royaltiesPaid || 0) + (financials.servicesPaid || 0);
        if (withholdingBase > 0) {
            const avgWhtRate = (rates.withholding.dividends + rates.withholding.interest + rates.withholding.services) / 3;
            projections.push({
                taxType: 'withholding_tax',
                projectedAmount: Math.round(withholdingBase * (avgWhtRate / 100) * scenarioMultiplier),
                drivers: ['Cross-border payments', 'Dividend distributions', 'Service payments'],
            });
        }

        // Payroll Tax
        if (financials.payrollCosts) {
            const payrollTax = financials.payrollCosts * ((rates.payroll.employerRate + rates.payroll.employeeRate) / 100);
            projections.push({
                taxType: 'payroll_tax',
                projectedAmount: Math.round(payrollTax * scenarioMultiplier),
                drivers: ['Employee headcount', 'Salary levels', 'Bonus payments'],
            });
        }

        // Jurisdiction-specific taxes
        if (jurisdiction === 'RW' && financials.digitalServicesRevenue) {
            projections.push({
                taxType: 'digital_services_tax',
                projectedAmount: Math.round(financials.digitalServicesRevenue * 0.015 * scenarioMultiplier),
                drivers: ['Digital platform revenue', 'Online advertising', 'Digital content sales'],
            });
        }

        return projections;
    }

    /**
     * Calculate taxable income
     */
    private calculateTaxableIncome(financials: FinancialInputs): number {
        const grossProfit = financials.revenue - financials.costOfGoodsSold;
        const operatingIncome = grossProfit - financials.operatingExpenses;
        const ebit = operatingIncome + (financials.capitalGains || 0);
        const taxableIncome = ebit - (financials.interestExpense || 0);
        return Math.max(0, taxableIncome);
    }

    /**
     * Build forecast assumptions
     */
    private buildAssumptions(jurisdiction: JurisdictionCode, financials: FinancialInputs): ForecastAssumption[] {
        const rates = TAX_RATES[jurisdiction];
        return [
            { name: 'Corporate Tax Rate', value: rates.corporateTax.rate, sensitivity: 'high', description: `Statutory rate for ${jurisdiction}` },
            { name: 'Effective Tax Rate', value: rates.corporateTax.effectiveRate || rates.corporateTax.rate, sensitivity: 'high' },
            { name: 'VAT/GST Rate', value: rates.vat.standard, sensitivity: 'medium' },
            { name: 'Revenue', value: financials.revenue, sensitivity: 'high', description: 'Total projected revenue' },
            { name: 'Operating Margin', value: `${((financials.revenue - financials.costOfGoodsSold - financials.operatingExpenses) / financials.revenue * 100).toFixed(1)}%`, sensitivity: 'high' },
        ];
    }

    /**
     * Identify key drivers for each tax type
     */
    private identifyDrivers(jurisdiction: JurisdictionCode, taxType: TaxType, financials: FinancialInputs): string[] {
        const driverMap: Record<TaxType, string[]> = {
            corporate_income_tax: ['Profitability', 'Operating expenses', 'Interest deductions', 'Depreciation'],
            vat_gst: ['Domestic sales', 'B2C transactions', 'Exempt supplies ratio'],
            withholding_tax: ['Cross-border payments', 'Dividend policy', 'Treaty benefits'],
            payroll_tax: ['Headcount', 'Average salary', 'Bonus accruals'],
            capital_gains: ['Asset disposals', 'Investment gains'],
            digital_services_tax: ['Platform revenue', 'User base in jurisdiction'],
            minimum_tax: ['Global revenue', 'Effective tax rate by jurisdiction'],
        };
        return driverMap[taxType] || ['General business activity'];
    }

    /**
     * Calculate forecast confidence
     */
    private calculateConfidence(projections: TaxProjection[]): number {
        // Base confidence starts at 85%
        let confidence = 0.85;

        // Adjust based on number of projections (more projections = more complex = lower confidence)
        confidence -= projections.length * 0.02;

        // Ensure between 0.6 and 0.95
        return Math.max(0.6, Math.min(0.95, confidence));
    }

    /**
     * Run scenario analysis
     */
    runScenarioAnalysis(
        jurisdiction: JurisdictionCode,
        baseFinancials: FinancialInputs
    ): ScenarioAnalysis {
        const baseCase = this.generateForecast(jurisdiction, baseFinancials, { scenario: 'base' });

        const scenarios = [
            {
                name: 'Revenue +10%',
                description: 'Assume revenue increases by 10%',
                adjustments: [{ parameter: 'revenue', change: 0.1 }],
                result: this.generateForecast(jurisdiction, { ...baseFinancials, revenue: baseFinancials.revenue * 1.1 }),
                impact: 0,
            },
            {
                name: 'Revenue -10%',
                description: 'Assume revenue decreases by 10%',
                adjustments: [{ parameter: 'revenue', change: -0.1 }],
                result: this.generateForecast(jurisdiction, { ...baseFinancials, revenue: baseFinancials.revenue * 0.9 }),
                impact: 0,
            },
            {
                name: 'Cost Optimization',
                description: 'Reduce operating expenses by 5%',
                adjustments: [{ parameter: 'operatingExpenses', change: -0.05 }],
                result: this.generateForecast(jurisdiction, { ...baseFinancials, operatingExpenses: baseFinancials.operatingExpenses * 0.95 }),
                impact: 0,
            },
        ];

        // Calculate impact for each scenario
        const baseTotalTax = baseCase.projections.reduce((sum, p) => sum + p.projectedAmount, 0);
        for (const scenario of scenarios) {
            const scenarioTotalTax = scenario.result.projections.reduce((sum, p) => sum + p.projectedAmount, 0);
            scenario.impact = scenarioTotalTax - baseTotalTax;
        }

        return {
            baseCase,
            scenarios,
            recommendation: this.generateRecommendation(scenarios),
        };
    }

    /**
     * Generate optimization recommendation
     */
    private generateRecommendation(scenarios: ScenarioAnalysis['scenarios']): string {
        const bestScenario = scenarios.reduce((best, current) =>
            current.impact < best.impact ? current : best
        );

        if (bestScenario.impact < 0) {
            return `Consider "${bestScenario.name}" strategy to potentially reduce tax burden by ${Math.abs(bestScenario.impact).toLocaleString()}`;
        }
        return 'Current tax position appears optimized based on scenarios analyzed';
    }

    /**
     * Identify optimization opportunities
     */
    findOptimizationOpportunities(
        jurisdiction: JurisdictionCode,
        financials: FinancialInputs
    ): OptimizationOpportunity[] {
        const opportunities: OptimizationOpportunity[] = [];

        // Jurisdiction-specific opportunities
        if (jurisdiction === 'MT') {
            if (this.calculateTaxableIncome(financials) > 100000) {
                opportunities.push({
                    id: 'mt-opt-001',
                    jurisdiction: 'MT',
                    opportunity: 'Malta Holding Company Structure',
                    description: 'Utilize Malta imputation system for effective 5% tax rate on distributed profits',
                    estimatedSavings: this.calculateTaxableIncome(financials) * 0.30,  // 35% - 5% = 30% savings
                    implementationComplexity: 'complex',
                    riskLevel: 'low',
                    requirements: ['Shareholder structure review', 'Substance requirements', 'EU parent entity'],
                    timeline: '3-6 months',
                });
            }
        }

        if (jurisdiction === 'CA') {
            opportunities.push({
                id: 'ca-opt-001',
                jurisdiction: 'CA',
                opportunity: 'SR&ED Tax Credits',
                description: 'Scientific Research and Experimental Development tax incentive program',
                estimatedSavings: financials.operatingExpenses * 0.15 * 0.35,  // Assume 15% of opex qualifies for 35% credit
                implementationComplexity: 'moderate',
                riskLevel: 'low',
                requirements: ['Identify qualifying R&D activities', 'Documentation of projects', 'Technical narrative'],
                timeline: '2-4 months',
            });
        }

        if (jurisdiction === 'RW') {
            if (financials.employeeCount && financials.employeeCount > 100) {
                opportunities.push({
                    id: 'rw-opt-001',
                    jurisdiction: 'RW',
                    opportunity: 'Export Processing Zone Benefits',
                    description: 'Tax incentives for businesses operating in Rwanda Special Economic Zones',
                    estimatedSavings: this.calculateTaxableIncome(financials) * 0.15,  // 15% CIT rate vs 30%
                    implementationComplexity: 'complex',
                    riskLevel: 'medium',
                    requirements: ['SEZ registration', 'Export requirements', 'Investment commitments'],
                    timeline: '6-12 months',
                });
            }
        }

        return opportunities;
    }

    /**
     * Get tax rates for jurisdiction
     */
    getTaxRates(jurisdiction: JurisdictionCode): JurisdictionTaxRates {
        return TAX_RATES[jurisdiction];
    }
}

// Factory function
export function createPredictiveTaxModelingService(
    config?: PredictiveTaxModelingConfig
): PredictiveTaxModelingService {
    return new PredictiveTaxModelingService(config);
}
