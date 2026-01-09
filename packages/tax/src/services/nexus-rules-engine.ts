/**
 * Nexus Rules Engine
 * 
 * Core engine for evaluating nexus status based on jurisdiction rules
 * and entity activity data. Supports US economic nexus (Wayfair standards),
 * Canadian GST/HST/PST nexus, and physical presence rules.
 * 
 * @example
 * ```typescript
 * const engine = new NexusRulesEngine();
 * 
 * // Check nexus for a single jurisdiction
 * const result = engine.evaluateNexus('CA', activityData);
 * 
 * // Get all jurisdictions with nexus
 * const allExposures = engine.evaluateAllJurisdictions(activityData);
 * ```
 */

import type {
    JurisdictionCode,
    USStateCode,
    CAProvinceCode,
    Country,
    JurisdictionNexusRules,
    EconomicNexusThreshold,
    PhysicalNexusRules,
    PeriodActivity,
    JurisdictionNexusExposure,
    NexusStatus,
    NexusFactorType,
    NexusAlert,
} from '../types/nexus.js';

// ============================================================================
// US STATE NEXUS RULES (Post-Wayfair)
// ============================================================================

const US_STATE_NEXUS_RULES: Partial<Record<USStateCode, JurisdictionNexusRules>> = {
    CA: {
        jurisdictionCode: 'CA',
        jurisdictionName: 'California',
        country: 'US',
        hasSalesTax: true,
        economicNexus: {
            salesThreshold: 500000,
            transactionThreshold: undefined, // CA doesn't use transaction count
            thresholdType: 'sales',
            measurementPeriod: 'current_or_prior',
            includesMarketplaceSales: false,
            effectiveDate: new Date('2019-04-01'),
        },
        physicalNexus: {
            employeeThreshold: 1,
            inventoryCreatesNexus: true,
            remoteEmployeeCreatesNexus: true,
            independentContractorCreatesNexus: false,
        },
        hasIncomeTax: true,
        incomeTaxNexusRules: {
            factorApportionment: true,
            throwbackRule: true,
            marketBasedSourcing: true,
        },
        registrationRequired: true,
        filingFrequency: 'quarterly',
        lastUpdated: new Date('2024-01-01'),
    },
    TX: {
        jurisdictionCode: 'TX',
        jurisdictionName: 'Texas',
        country: 'US',
        hasSalesTax: true,
        economicNexus: {
            salesThreshold: 500000,
            transactionThreshold: undefined,
            thresholdType: 'sales',
            measurementPeriod: 'rolling_12',
            includesMarketplaceSales: false,
            effectiveDate: new Date('2019-10-01'),
        },
        physicalNexus: {
            employeeThreshold: 1,
            inventoryCreatesNexus: true,
            remoteEmployeeCreatesNexus: true,
            independentContractorCreatesNexus: true,
        },
        hasIncomeTax: false,  // Texas has no state income tax
        registrationRequired: true,
        filingFrequency: 'quarterly',
        lastUpdated: new Date('2024-01-01'),
    },
    NY: {
        jurisdictionCode: 'NY',
        jurisdictionName: 'New York',
        country: 'US',
        hasSalesTax: true,
        economicNexus: {
            salesThreshold: 500000,
            transactionThreshold: 100,
            thresholdType: 'combined', // Must meet BOTH thresholds
            measurementPeriod: 'rolling_12',
            includesMarketplaceSales: false,
            effectiveDate: new Date('2019-06-21'),
        },
        physicalNexus: {
            employeeThreshold: 1,
            inventoryCreatesNexus: true,
            remoteEmployeeCreatesNexus: true,
            independentContractorCreatesNexus: false,
        },
        hasIncomeTax: true,
        incomeTaxNexusRules: {
            factorApportionment: true,
            throwbackRule: false,
            marketBasedSourcing: true,
        },
        registrationRequired: true,
        filingFrequency: 'quarterly',
        lastUpdated: new Date('2024-01-01'),
    },
    FL: {
        jurisdictionCode: 'FL',
        jurisdictionName: 'Florida',
        country: 'US',
        hasSalesTax: true,
        economicNexus: {
            salesThreshold: 100000,
            transactionThreshold: undefined,
            thresholdType: 'sales',
            measurementPeriod: 'prior_year',
            includesMarketplaceSales: false,
            effectiveDate: new Date('2021-07-01'),
        },
        physicalNexus: {
            employeeThreshold: 1,
            inventoryCreatesNexus: true,
            remoteEmployeeCreatesNexus: true,
            independentContractorCreatesNexus: false,
        },
        hasIncomeTax: false,  // No personal income tax
        registrationRequired: true,
        filingFrequency: 'monthly',
        lastUpdated: new Date('2024-01-01'),
    },
    WA: {
        jurisdictionCode: 'WA',
        jurisdictionName: 'Washington',
        country: 'US',
        hasSalesTax: true,
        economicNexus: {
            salesThreshold: 100000,
            transactionThreshold: undefined,
            thresholdType: 'sales',
            measurementPeriod: 'current_or_prior',
            includesMarketplaceSales: false,
            effectiveDate: new Date('2018-10-01'),
        },
        physicalNexus: {
            employeeThreshold: 1,
            inventoryCreatesNexus: true,
            remoteEmployeeCreatesNexus: true,
            independentContractorCreatesNexus: false,
        },
        hasIncomeTax: false,
        registrationRequired: true,
        filingFrequency: 'monthly',
        lastUpdated: new Date('2024-01-01'),
    },
    // Add more states as needed...
};

// Default rules for states not explicitly defined
const DEFAULT_US_ECONOMIC_NEXUS: EconomicNexusThreshold = {
    salesThreshold: 100000,
    transactionThreshold: 200,
    thresholdType: 'sales',  // Meet either threshold
    measurementPeriod: 'current_or_prior',
    includesMarketplaceSales: false,
    effectiveDate: new Date('2019-01-01'),
};

// ============================================================================
// CANADIAN PROVINCE NEXUS RULES
// ============================================================================

const CA_PROVINCE_NEXUS_RULES: Partial<Record<CAProvinceCode, JurisdictionNexusRules>> = {
    ON: {
        jurisdictionCode: 'ON',
        jurisdictionName: 'Ontario',
        country: 'CA',
        hasSalesTax: true,  // HST
        economicNexus: {
            salesThreshold: 30000,  // CAD, GST/HST threshold
            transactionThreshold: undefined,
            thresholdType: 'sales',
            measurementPeriod: 'rolling_12',
            includesMarketplaceSales: true,
            effectiveDate: new Date('2021-07-01'),
        },
        hasIncomeTax: true,
        registrationRequired: true,
        filingFrequency: 'quarterly',
        lastUpdated: new Date('2024-01-01'),
    },
    BC: {
        jurisdictionCode: 'BC',
        jurisdictionName: 'British Columbia',
        country: 'CA',
        hasSalesTax: true,  // GST + PST
        economicNexus: {
            salesThreshold: 10000,  // PST threshold
            transactionThreshold: undefined,
            thresholdType: 'sales',
            measurementPeriod: 'rolling_12',
            includesMarketplaceSales: true,
            effectiveDate: new Date('2021-04-01'),
        },
        hasIncomeTax: true,
        registrationRequired: true,
        filingFrequency: 'quarterly',
        lastUpdated: new Date('2024-01-01'),
    },
    QC: {
        jurisdictionCode: 'QC',
        jurisdictionName: 'Quebec',
        country: 'CA',
        hasSalesTax: true,  // GST + QST
        economicNexus: {
            salesThreshold: 30000,  // QST threshold
            transactionThreshold: undefined,
            thresholdType: 'sales',
            measurementPeriod: 'rolling_12',
            includesMarketplaceSales: true,
            effectiveDate: new Date('2019-01-01'),
        },
        hasIncomeTax: true,
        registrationRequired: true,
        filingFrequency: 'quarterly',
        lastUpdated: new Date('2024-01-01'),
    },
    AB: {
        jurisdictionCode: 'AB',
        jurisdictionName: 'Alberta',
        country: 'CA',
        hasSalesTax: false,  // No provincial sales tax, only GST
        economicNexus: {
            salesThreshold: 30000,  // Federal GST threshold
            transactionThreshold: undefined,
            thresholdType: 'sales',
            measurementPeriod: 'rolling_12',
            includesMarketplaceSales: true,
            effectiveDate: new Date('2021-07-01'),
        },
        hasIncomeTax: true,
        registrationRequired: true,
        filingFrequency: 'quarterly',
        lastUpdated: new Date('2024-01-01'),
    },
};

// ============================================================================
// NEXUS RULES ENGINE
// ============================================================================

export class NexusRulesEngine {
    private alertThreshold = 0.75;  // Alert at 75% of threshold

    /**
     * Get nexus rules for a jurisdiction
     */
    getRules(jurisdictionCode: JurisdictionCode): JurisdictionNexusRules | undefined {
        // Check US states
        if (this.isUSState(jurisdictionCode)) {
            const rules = US_STATE_NEXUS_RULES[jurisdictionCode];
            if (rules) return rules;

            // Return default rules for undefined states
            return this.getDefaultUSRules(jurisdictionCode);
        }

        // Check Canadian provinces
        if (this.isCAProvince(jurisdictionCode)) {
            return CA_PROVINCE_NEXUS_RULES[jurisdictionCode];
        }

        return undefined;
    }

    /**
     * Get all jurisdiction rules
     */
    getAllRules(): JurisdictionNexusRules[] {
        const rules: JurisdictionNexusRules[] = [];

        // Add US states
        const usStates: USStateCode[] = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
        ];

        for (const state of usStates) {
            const stateRules = this.getRules(state);
            if (stateRules) rules.push(stateRules);
        }

        // Add Canadian provinces
        for (const province of Object.values(CA_PROVINCE_NEXUS_RULES)) {
            if (province) rules.push(province);
        }

        return rules;
    }

    /**
     * Evaluate nexus for a single jurisdiction
     */
    evaluateNexus(
        jurisdictionCode: JurisdictionCode,
        currentPeriod: PeriodActivity,
        trailingMetrics: { grossSales: number; transactionCount: number; employeeDays: number; propertyValue: number }
    ): JurisdictionNexusExposure {
        const rules = this.getRules(jurisdictionCode);

        // Determine sales tax nexus
        const salesTaxResult = this.evaluateSalesTaxNexus(rules, currentPeriod, trailingMetrics);

        // Determine income tax nexus
        const incomeTaxResult = this.evaluateIncomeTaxNexus(rules, currentPeriod, trailingMetrics);

        // Calculate risk score
        const riskScore = this.calculateRiskScore(salesTaxResult, incomeTaxResult, rules);
        const riskFactors = this.identifyRiskFactors(salesTaxResult, incomeTaxResult, rules);

        return {
            jurisdictionCode,
            jurisdictionName: rules?.jurisdictionName ?? jurisdictionCode,
            currentPeriod,
            trailingMetrics,
            salesTaxNexus: salesTaxResult,
            incomeTaxNexus: incomeTaxResult,
            riskScore,
            riskFactors,
            isRegistered: false,  // To be populated from entity data
            isCompliant: false,   // To be populated from compliance data
        };
    }

    /**
     * Evaluate nexus across all relevant jurisdictions
     */
    evaluateAllJurisdictions(
        activityByJurisdiction: Map<JurisdictionCode, { current: PeriodActivity; trailing: { grossSales: number; transactionCount: number; employeeDays: number; propertyValue: number } }>
    ): JurisdictionNexusExposure[] {
        const exposures: JurisdictionNexusExposure[] = [];

        for (const [jurisdictionCode, data] of activityByJurisdiction) {
            const exposure = this.evaluateNexus(jurisdictionCode, data.current, data.trailing);
            exposures.push(exposure);
        }

        // Sort by risk score (highest first)
        return exposures.sort((a, b) => b.riskScore - a.riskScore);
    }

    /**
     * Generate alerts for approaching/breached thresholds
     */
    generateAlerts(
        entityId: string,
        exposures: JurisdictionNexusExposure[]
    ): NexusAlert[] {
        const alerts: NexusAlert[] = [];
        const now = new Date();

        for (const exposure of exposures) {
            // Threshold approaching alerts
            if (exposure.salesTaxNexus.status === 'approaching') {
                alerts.push({
                    id: crypto.randomUUID(),
                    entityId,
                    jurisdictionCode: exposure.jurisdictionCode,
                    alertType: 'threshold_approaching',
                    severity: 'warning',
                    title: `Sales Tax Nexus Threshold Approaching in ${exposure.jurisdictionName}`,
                    message: `You have reached ${Math.round(exposure.salesTaxNexus.salesThresholdPercent)}% of the economic nexus threshold.`,
                    metrics: {
                        currentValue: exposure.trailingMetrics.grossSales,
                        thresholdValue: this.getRules(exposure.jurisdictionCode)?.economicNexus?.salesThreshold ?? 0,
                        percentOfThreshold: exposure.salesTaxNexus.salesThresholdPercent,
                    },
                    recommendedAction: 'Monitor sales activity and prepare for registration',
                    createdAt: now,
                });
            }

            // Threshold breached alerts
            if (exposure.salesTaxNexus.status === 'established' && !exposure.isRegistered) {
                alerts.push({
                    id: crypto.randomUUID(),
                    entityId,
                    jurisdictionCode: exposure.jurisdictionCode,
                    alertType: 'registration_required',
                    severity: 'critical',
                    title: `Sales Tax Registration Required in ${exposure.jurisdictionName}`,
                    message: `Economic nexus threshold has been exceeded. Registration and tax collection required.`,
                    metrics: {
                        currentValue: exposure.trailingMetrics.grossSales,
                        thresholdValue: this.getRules(exposure.jurisdictionCode)?.economicNexus?.salesThreshold ?? 0,
                        percentOfThreshold: exposure.salesTaxNexus.salesThresholdPercent,
                    },
                    recommendedAction: 'Register for sales tax permit immediately',
                    actionDeadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    createdAt: now,
                });
            }
        }

        return alerts.sort((a, b) => {
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private evaluateSalesTaxNexus(
        rules: JurisdictionNexusRules | undefined,
        currentPeriod: PeriodActivity,
        trailingMetrics: { grossSales: number; transactionCount: number; employeeDays: number; propertyValue: number }
    ): JurisdictionNexusExposure['salesTaxNexus'] {
        const factors: NexusFactorType[] = [];
        let status: NexusStatus = 'none';
        let salesThresholdPercent = 0;
        let transactionThresholdPercent = 0;

        if (!rules?.hasSalesTax) {
            return { status: 'none', factors: [], salesThresholdPercent: 0, transactionThresholdPercent: 0 };
        }

        // Check physical presence first
        if (rules.physicalNexus) {
            if (currentPeriod.employeeCount > 0 || trailingMetrics.employeeDays > 0) {
                factors.push('employee');
                status = 'established';
            }
            if (currentPeriod.inventoryValue > 0 && rules.physicalNexus.inventoryCreatesNexus) {
                factors.push('inventory');
                status = 'established';
            }
            if (currentPeriod.propertyValue > 0 || trailingMetrics.propertyValue > 0) {
                factors.push('property');
                status = 'established';
            }
        }

        // Check economic nexus
        if (rules.economicNexus) {
            const threshold = rules.economicNexus;

            if (threshold.salesThreshold) {
                salesThresholdPercent = (trailingMetrics.grossSales / threshold.salesThreshold) * 100;

                if (trailingMetrics.grossSales >= threshold.salesThreshold) {
                    factors.push('sales');
                    status = 'established';
                } else if (salesThresholdPercent >= this.alertThreshold * 100) {
                    if (status !== 'established') status = 'approaching';
                }
            }

            if (threshold.transactionThreshold) {
                transactionThresholdPercent = (trailingMetrics.transactionCount / threshold.transactionThreshold) * 100;

                if (trailingMetrics.transactionCount >= threshold.transactionThreshold) {
                    factors.push('transactions');
                    if (threshold.thresholdType !== 'combined' || factors.includes('sales')) {
                        status = 'established';
                    }
                } else if (transactionThresholdPercent >= this.alertThreshold * 100) {
                    if (status !== 'established') status = 'approaching';
                }
            }
        }

        return { status, factors, salesThresholdPercent, transactionThresholdPercent };
    }

    private evaluateIncomeTaxNexus(
        rules: JurisdictionNexusRules | undefined,
        currentPeriod: PeriodActivity,
        trailingMetrics: { grossSales: number; transactionCount: number; employeeDays: number; propertyValue: number }
    ): JurisdictionNexusExposure['incomeTaxNexus'] {
        const factors: NexusFactorType[] = [];
        let status: NexusStatus = 'none';

        if (!rules?.hasIncomeTax) {
            return { status: 'none', factors: [] };
        }

        // Generally, income tax nexus requires more substantial presence
        if (currentPeriod.employeeCount > 0 || trailingMetrics.employeeDays > 30) {
            factors.push('employee');
            status = 'established';
        }

        if (currentPeriod.propertyValue > 0 || trailingMetrics.propertyValue > 0) {
            factors.push('property');
            status = 'established';
        }

        if (currentPeriod.servicesRevenue > 0) {
            factors.push('services');
            if (rules.incomeTaxNexusRules?.marketBasedSourcing) {
                status = 'established';
            }
        }

        // Calculate apportionment if nexus established
        let apportionmentPercent: number | undefined;
        if (status === 'established' && rules.incomeTaxNexusRules?.factorApportionment) {
            apportionmentPercent = this.calculateApportionment(currentPeriod, trailingMetrics);
        }

        return { status, factors, apportionmentPercent };
    }

    private calculateApportionment(
        currentPeriod: PeriodActivity,
        trailingMetrics: { grossSales: number; transactionCount: number; employeeDays: number; propertyValue: number }
    ): number {
        // Simplified single-factor (sales) apportionment
        // In reality this would need total company figures
        // For now, return placeholder
        return 0;
    }

    private calculateRiskScore(
        salesTax: JurisdictionNexusExposure['salesTaxNexus'],
        incomeTax: JurisdictionNexusExposure['incomeTaxNexus'],
        rules: JurisdictionNexusRules | undefined
    ): number {
        let score = 0;

        // Sales tax nexus scoring
        if (salesTax.status === 'established') {
            score += 50;
        } else if (salesTax.status === 'approaching') {
            score += Math.round((salesTax.salesThresholdPercent / 100) * 40);
        }

        // Income tax nexus scoring
        if (incomeTax.status === 'established') {
            score += 30;
        }

        // Additional factors
        if (salesTax.factors.includes('employee')) score += 10;
        if (salesTax.factors.includes('property')) score += 10;

        return Math.min(100, score);
    }

    private identifyRiskFactors(
        salesTax: JurisdictionNexusExposure['salesTaxNexus'],
        incomeTax: JurisdictionNexusExposure['incomeTaxNexus'],
        rules: JurisdictionNexusRules | undefined
    ): string[] {
        const factors: string[] = [];

        if (salesTax.status === 'established') {
            factors.push('Sales tax nexus established');
        }
        if (salesTax.status === 'approaching') {
            factors.push(`Approaching sales threshold (${Math.round(salesTax.salesThresholdPercent)}%)`);
        }
        if (incomeTax.status === 'established') {
            factors.push('Income tax nexus established');
        }
        if (salesTax.factors.includes('employee')) {
            factors.push('Physical presence via employees');
        }
        if (salesTax.factors.includes('inventory')) {
            factors.push('Inventory stored in jurisdiction');
        }

        return factors;
    }

    private isUSState(code: JurisdictionCode): code is USStateCode {
        return /^[A-Z]{2}$/.test(code) && !this.isCAProvince(code);
    }

    private isCAProvince(code: JurisdictionCode): code is CAProvinceCode {
        const caProvinces: CAProvinceCode[] = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
        return caProvinces.includes(code as CAProvinceCode);
    }

    private getDefaultUSRules(stateCode: USStateCode): JurisdictionNexusRules {
        // States without sales tax
        const noSalesTaxStates: USStateCode[] = ['AK', 'DE', 'MT', 'NH', 'OR'];

        return {
            jurisdictionCode: stateCode,
            jurisdictionName: stateCode, // Would have full name lookup
            country: 'US',
            hasSalesTax: !noSalesTaxStates.includes(stateCode),
            economicNexus: noSalesTaxStates.includes(stateCode) ? undefined : DEFAULT_US_ECONOMIC_NEXUS,
            physicalNexus: {
                employeeThreshold: 1,
                inventoryCreatesNexus: true,
                remoteEmployeeCreatesNexus: true,
                independentContractorCreatesNexus: false,
            },
            hasIncomeTax: !['AK', 'FL', 'NV', 'SD', 'TX', 'WA', 'WY'].includes(stateCode),
            registrationRequired: true,
            filingFrequency: 'quarterly',
            lastUpdated: new Date('2024-01-01'),
        };
    }
}

// Export singleton
export const nexusRulesEngine = new NexusRulesEngine();
