/**
 * Malta Going Concern Agent
 *
 * ISA 570 (Revised) - Going Concern
 *
 * Malta-specific features:
 * - Liquidity ratio analysis with HITL triggers
 * - 12-month cash flow stress testing
 * - Management assessment evaluation
 * - December 2026 revisions readiness
 * - Opinion impact recommendations
 */

import type {
    MaltaAuditAgent,
    MaltaAgentResponse,
    MaltaGoingConcernAssessment,
    CashFlowForecast,
    StressTestResult,
    GOING_CONCERN_TRIGGERS,
} from '../../types/index.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Going concern trigger thresholds.
 */
export const GC_TRIGGERS = {
    currentRatio: 1.0,       // < 1.0 triggers HITL review
    quickRatio: 0.5,         // < 0.5 critical
    debtCoverage: 1.5,       // < 1.5 concerning
    workingCapital: 0,       // Negative triggers review
    daysOfCash: 30,          // < 30 days triggers review
} as const;

/**
 * Stress test scenarios.
 */
export const STRESS_SCENARIOS = [
    {
        name: 'Revenue decline 20%',
        revenueImpact: -0.20,
        description: 'Moderate recession scenario',
    },
    {
        name: 'Revenue decline 40%',
        revenueImpact: -0.40,
        description: 'Severe downturn scenario',
    },
    {
        name: 'Customer loss (top 3)',
        revenueImpact: -0.30,
        description: 'Loss of major customers',
    },
    {
        name: 'Cost increase 15%',
        costImpact: 0.15,
        description: 'Inflationary pressure scenario',
    },
] as const;

// ============================================================================
// GOING CONCERN AGENT
// ============================================================================

/**
 * Malta Going Concern Agent.
 *
 * Performs going concern assessment per ISA 570 (Revised).
 */
export class MaltaGoingConcernAgent implements MaltaAuditAgent {
    public readonly agentId = 'malta-going-concern-001';
    public readonly name = 'Malta Going Concern Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'GOING_CONCERN' as const;
    public readonly isaReferences = ['ISA 570 (Revised)', 'ISA 560'];
    public readonly autonomyLevel = 3 as const; // Requires more human oversight

    /**
     * Assess going concern indicators.
     */
    async assessGoingConcern(
        financials: {
            currentAssets: number;
            currentLiabilities: number;
            cash: number;
            inventory: number;
            receivables: number;
            operatingCashFlow: number;
            totalDebt: number;
            ebitda: number;
            revenue: number;
            operatingExpenses: number;
        },
        options: {
            periodEnd: Date;
            assessmentPeriodMonths?: number;
            managementAssessmentProvided?: boolean;
            priorPeriodGoingConcernIssue?: boolean;
        } = {
                periodEnd: new Date(),
            }
    ): Promise<MaltaAgentResponse<MaltaGoingConcernAssessment>> {
        const startTime = Date.now();

        try {
            const assessmentPeriodMonths = options.assessmentPeriodMonths ?? 12;

            // Calculate liquidity ratios
            const currentRatio = financials.currentLiabilities > 0
                ? financials.currentAssets / financials.currentLiabilities
                : 999;

            const quickRatio = financials.currentLiabilities > 0
                ? (financials.currentAssets - financials.inventory) / financials.currentLiabilities
                : 999;

            const cashRatio = financials.currentLiabilities > 0
                ? financials.cash / financials.currentLiabilities
                : 999;

            // Calculate working capital
            const workingCapital = financials.currentAssets - financials.currentLiabilities;

            // Calculate debt coverage ratio
            const debtCoverageRatio = financials.ebitda > 0
                ? financials.ebitda / (financials.totalDebt / 5) // Assume 5-year amortization
                : 0;

            // Calculate days of cash
            const dailyOperatingExpenses = financials.operatingExpenses / 365;
            const daysOfCash = dailyOperatingExpenses > 0
                ? financials.cash / dailyOperatingExpenses
                : 999;

            // Identify events or conditions
            const eventsOrConditions: string[] = [];

            if (currentRatio < GC_TRIGGERS.currentRatio) {
                eventsOrConditions.push(`Current ratio ${currentRatio.toFixed(2)} below 1.0`);
            }
            if (quickRatio < GC_TRIGGERS.quickRatio) {
                eventsOrConditions.push(`Quick ratio ${quickRatio.toFixed(2)} below 0.5 (critical)`);
            }
            if (workingCapital < GC_TRIGGERS.workingCapital) {
                eventsOrConditions.push(`Negative working capital of €${Math.abs(workingCapital).toLocaleString()}`);
            }
            if (debtCoverageRatio < GC_TRIGGERS.debtCoverage) {
                eventsOrConditions.push(`Debt coverage ratio ${debtCoverageRatio.toFixed(2)} below 1.5`);
            }
            if (daysOfCash < GC_TRIGGERS.daysOfCash) {
                eventsOrConditions.push(`Only ${Math.round(daysOfCash)} days of cash remaining`);
            }
            if (financials.operatingCashFlow < 0) {
                eventsOrConditions.push('Negative operating cash flow');
            }

            // Determine if HITL review is triggered
            const hitlReviewTriggered = eventsOrConditions.length > 0;

            // Assess material uncertainty
            const materialUncertainty = eventsOrConditions.length >= 2;

            // Determine opinion impact
            let opinionImpact: 'none' | 'emphasis_of_matter' | 'adverse' | 'disclaimer';
            if (eventsOrConditions.length === 0) {
                opinionImpact = 'none';
            } else if (eventsOrConditions.length === 1 && currentRatio >= 0.8) {
                opinionImpact = 'emphasis_of_matter';
            } else if (materialUncertainty && options.managementAssessmentProvided) {
                opinionImpact = 'emphasis_of_matter';
            } else if (materialUncertainty) {
                opinionImpact = 'disclaimer';
            } else {
                opinionImpact = 'emphasis_of_matter';
            }

            // Generate period assessed string
            const assessmentEnd = new Date(options.periodEnd);
            assessmentEnd.setMonth(assessmentEnd.getMonth() + assessmentPeriodMonths);
            const periodAssessed = `${assessmentPeriodMonths} months from ${options.periodEnd.toISOString().split('T')[0]} to ${assessmentEnd.toISOString().split('T')[0]}`;

            const result: MaltaGoingConcernAssessment = {
                periodAssessed,
                eventsOrConditions,
                managementPlans: [], // To be populated from management
                adequacyOfDisclosure: eventsOrConditions.length > 0 ? 'inadequate' : 'adequate',
                materialUncertainty,
                opinionImpact,
                rationale: this.generateRationale(eventsOrConditions, materialUncertainty, opinionImpact),
                liquidityRatios: {
                    currentRatio,
                    quickRatio,
                    cashRatio,
                },
                workingCapital,
                debtCoverageRatio,
                hitlReviewTriggered,
            };

            return {
                success: true,
                data: result,
                agentId: this.agentId,
                hitlGateTriggered: hitlReviewTriggered ? 'GATE_006' : undefined,
                requiresReview: hitlReviewTriggered,
                reviewReason: hitlReviewTriggered
                    ? `Going concern indicators identified: ${eventsOrConditions.length} issues`
                    : undefined,
                durationMs: Date.now() - startTime,
                nextSteps: eventsOrConditions.length > 0
                    ? [
                        'Obtain management assessment of going concern',
                        'Evaluate management plans to mitigate issues',
                        'Review cash flow forecasts',
                        'Consider need for disclosure',
                        'Discuss with engagement partner',
                    ]
                    : ['Document satisfactory going concern assessment'],
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Going concern assessment failed',
                agentId: this.agentId,
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Perform cash flow stress testing.
     */
    async performStressTest(
        baselineForecast: CashFlowForecast,
        scenarios?: typeof STRESS_SCENARIOS
    ): Promise<MaltaAgentResponse<{
        results: StressTestResult[];
        worstCase: StressTestResult;
        recommendation: string;
    }>> {
        const startTime = Date.now();

        try {
            const scenariosToTest = scenarios ?? STRESS_SCENARIOS;
            const results: StressTestResult[] = [];

            for (const scenario of scenariosToTest) {
                // Apply scenario to baseline
                let adjustedReceipts = baselineForecast.projectedReceipts;
                let adjustedPayments = baselineForecast.projectedPayments;

                if ('revenueImpact' in scenario && scenario.revenueImpact) {
                    adjustedReceipts *= 1 + scenario.revenueImpact;
                }
                if ('costImpact' in scenario && scenario.costImpact) {
                    adjustedPayments *= 1 + scenario.costImpact;
                }

                const netCashFlow = adjustedReceipts - adjustedPayments;
                const closingCash = baselineForecast.openingCash + netCashFlow;

                // Calculate days of coverage
                const dailyBurn = adjustedPayments / 365;
                const daysOfCoverage = dailyBurn > 0
                    ? Math.max(0, closingCash / dailyBurn)
                    : 999;

                // Would this breach covenants? (simplified assumption)
                const breachesCovenants = closingCash < 0 || daysOfCoverage < 30;

                let conclusion: string;
                if (closingCash < 0) {
                    conclusion = 'CRITICAL: Cash position would be negative';
                } else if (daysOfCoverage < 30) {
                    conclusion = 'WARNING: Less than 30 days cash coverage';
                } else if (daysOfCoverage < 90) {
                    conclusion = 'CONCERN: Cash coverage between 30-90 days';
                } else {
                    conclusion = 'ACCEPTABLE: Adequate cash coverage maintained';
                }

                results.push({
                    scenario: scenario.name,
                    revenueImpact: baselineForecast.projectedReceipts - adjustedReceipts,
                    cashImpact: closingCash - (baselineForecast.openingCash + baselineForecast.projectedReceipts - baselineForecast.projectedPayments),
                    daysOfCoverage: Math.round(daysOfCoverage),
                    breachesCovenants,
                    conclusion,
                });
            }

            // Find worst case
            const worstCase = results.reduce((worst, current) =>
                current.daysOfCoverage < worst.daysOfCoverage ? current : worst
            );

            // Generate recommendation
            let recommendation: string;
            if (results.every((r) => r.daysOfCoverage >= 90)) {
                recommendation = 'Going concern assessment: No material concerns under stress scenarios';
            } else if (results.some((r) => r.breachesCovenants)) {
                recommendation = 'Going concern assessment: Material uncertainty identified - management mitigating actions required';
            } else {
                recommendation = 'Going concern assessment: Some stress under adverse scenarios - monitor closely';
            }

            return {
                success: true,
                data: {
                    results,
                    worstCase,
                    recommendation,
                },
                agentId: this.agentId,
                requiresReview: results.some((r) => r.breachesCovenants),
                reviewReason: results.some((r) => r.breachesCovenants)
                    ? 'Stress testing indicates potential covenant breach'
                    : undefined,
                durationMs: Date.now() - startTime,
                nextSteps: [
                    'Document stress test assumptions',
                    'Review with management',
                    'Consider disclosure requirements',
                    'Assess adequacy of management mitigating actions',
                ],
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Stress test failed',
                agentId: this.agentId,
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Evaluate management's going concern assessment.
     */
    async evaluateManagementAssessment(
        assessment: {
            provided: boolean;
            periodCovered?: number; // months
            assumptions?: string[];
            mitigatingActions?: string[];
            cashFlowForecastIncluded?: boolean;
            sensitivityAnalysisPerformed?: boolean;
        }
    ): Promise<MaltaAgentResponse<{
        adequate: boolean;
        deficiencies: string[];
        recommendations: string[];
    }>> {
        const startTime = Date.now();

        const deficiencies: string[] = [];
        const recommendations: string[] = [];

        // Check if assessment was provided
        if (!assessment.provided) {
            deficiencies.push('Management has not provided a going concern assessment');
            recommendations.push('Request formal going concern assessment from management');
        }

        // Check period coverage (should be at least 12 months from balance sheet date)
        if (assessment.periodCovered && assessment.periodCovered < 12) {
            deficiencies.push(`Assessment only covers ${assessment.periodCovered} months (should be at least 12)`);
            recommendations.push('Request extended assessment covering 12+ months');
        }

        // Check for cash flow forecast
        if (!assessment.cashFlowForecastIncluded) {
            deficiencies.push('Cash flow forecast not included in assessment');
            recommendations.push('Obtain detailed cash flow projections');
        }

        // Check for sensitivity analysis
        if (!assessment.sensitivityAnalysisPerformed) {
            deficiencies.push('No sensitivity analysis performed');
            recommendations.push('Request sensitivity analysis under different scenarios');
        }

        // Check for mitigating actions if issues identified
        if (assessment.mitigatingActions && assessment.mitigatingActions.length === 0) {
            deficiencies.push('No mitigating actions identified despite potential going concern issues');
            recommendations.push('Discuss contingency plans with management');
        }

        const adequate = deficiencies.length === 0;

        return {
            success: true,
            data: {
                adequate,
                deficiencies,
                recommendations,
            },
            agentId: this.agentId,
            requiresReview: !adequate,
            reviewReason: !adequate ? 'Deficiencies in management going concern assessment' : undefined,
            durationMs: Date.now() - startTime,
            nextSteps: adequate
                ? ['Document evaluation of management assessment']
                : recommendations,
        };
    }

    /**
     * Recommend opinion impact based on going concern findings.
     */
    async recommendOpinionImpact(
        findings: {
            materialUncertainty: boolean;
            managementAssessmentAdequate: boolean;
            disclosuresAdequate: boolean;
            mitigatingActionsReasonable: boolean;
        }
    ): Promise<MaltaAgentResponse<{
        recommendedImpact: 'none' | 'emphasis_of_matter' | 'qualified' | 'adverse' | 'disclaimer';
        rationale: string;
        reportingRequirements: string[];
    }>> {
        const startTime = Date.now();

        let recommendedImpact: 'none' | 'emphasis_of_matter' | 'qualified' | 'adverse' | 'disclaimer';
        let rationale: string;
        const reportingRequirements: string[] = [];

        if (!findings.materialUncertainty) {
            recommendedImpact = 'none';
            rationale = 'No material uncertainty identified - standard unmodified opinion';
        } else if (findings.disclosuresAdequate && findings.managementAssessmentAdequate) {
            recommendedImpact = 'emphasis_of_matter';
            rationale = 'Material uncertainty exists but adequately disclosed - Emphasis of Matter paragraph required';
            reportingRequirements.push(
                'Include Emphasis of Matter paragraph per ISA 570.22',
                'Reference note disclosures about material uncertainty',
                'State opinion is not modified in respect of this matter'
            );
        } else if (!findings.disclosuresAdequate) {
            recommendedImpact = 'qualified';
            rationale = 'Material uncertainty exists but not adequately disclosed - Qualified opinion required';
            reportingRequirements.push(
                'Issue qualified opinion per ISA 570.23',
                'Describe material uncertainty in Basis for Qualified Opinion',
                'State that disclosures are inadequate'
            );
        } else if (!findings.mitigatingActionsReasonable) {
            recommendedImpact = 'adverse';
            rationale = 'Going concern basis inappropriate - Adverse opinion required';
            reportingRequirements.push(
                'Issue adverse opinion per ISA 570.21',
                'State that financial statements should not be prepared on going concern basis'
            );
        } else {
            recommendedImpact = 'disclaimer';
            rationale = 'Unable to conclude on going concern - Disclaimer of opinion';
            reportingRequirements.push(
                'Issue disclaimer of opinion per ISA 570.24',
                'Describe inability to obtain sufficient appropriate evidence'
            );
        }

        return {
            success: true,
            data: {
                recommendedImpact,
                rationale,
                reportingRequirements,
            },
            agentId: this.agentId,
            hitlGateTriggered: recommendedImpact !== 'none' ? 'GATE_005' : undefined,
            requiresReview: recommendedImpact !== 'none',
            reviewReason: recommendedImpact !== 'none' ? 'Modified/emphasized opinion recommendation' : undefined,
            durationMs: Date.now() - startTime,
            nextSteps: [
                'Discuss with engagement partner',
                recommendedImpact !== 'none' ? 'Consult with EQCR' : '',
                'Document conclusion rationale',
                'Communicate with management',
            ].filter(Boolean),
        };
    }

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    private generateRationale(
        eventsOrConditions: string[],
        materialUncertainty: boolean,
        opinionImpact: string
    ): string {
        if (eventsOrConditions.length === 0) {
            return 'No events or conditions identified that may cast significant doubt on the entity\'s ability to continue as a going concern.';
        }

        let rationale = `${eventsOrConditions.length} indicator(s) identified: ${eventsOrConditions.join('; ')}. `;

        if (materialUncertainty) {
            rationale += 'These collectively indicate a material uncertainty. ';
        } else {
            rationale += 'These do not individually or collectively indicate material uncertainty. ';
        }

        rationale += `Recommended opinion impact: ${opinionImpact.replace(/_/g, ' ')}.`;

        return rationale;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Malta Going Concern Agent instance.
 */
export function createMaltaGoingConcernAgent(): MaltaGoingConcernAgent {
    return new MaltaGoingConcernAgent();
}

/**
 * Lazy singleton instance.
 */
let _maltaGoingConcernAgent: MaltaGoingConcernAgent | null = null;

export const maltaGoingConcernAgent = {
    instance(): MaltaGoingConcernAgent {
        if (!_maltaGoingConcernAgent) {
            _maltaGoingConcernAgent = new MaltaGoingConcernAgent();
        }
        return _maltaGoingConcernAgent;
    },
};
