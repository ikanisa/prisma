/**
 * Rwanda Going Concern Assessment Agent
 * 
 * ISA 570 compliant going concern assessment for Rwanda entities.
 * 
 * Features:
 * - Financial indicator analysis
 * - Operating indicator analysis
 * - Management plan assessment
 * - Disclosure evaluation
 * - Rwanda-specific considerations (BNR, RRA)
 * 
 * @package @prisma/audit-rwanda
 */

import type {
    RwandaAuditAgent,
    AgentConfig,
    RiskLevel,
    GoingConcernAssessment,
    GoingConcernIndicator,
} from '../../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface GoingConcernInput {
    // Entity information
    entityName: string;
    fiscalYearEnd: Date;
    isBNRRegulated: boolean;
    isPIE: boolean;

    // Financial data
    currentAssets: number;
    currentLiabilities: number;
    netAssets: number;
    revenue: number;
    priorYearRevenue: number;
    operatingCashFlow: number;
    netProfit: number;
    borrowings: number;
    availableFacilities: number;

    // Qualitative factors
    legalIssuesPending: boolean;
    keyCustomerLoss: boolean;
    keySupplierIssue: boolean;
    laborDisputes: boolean;
    regulatoryInvestigation: boolean;
    managementPlans?: string[];
}

export interface GoingConcernResult {
    assessment: GoingConcernAssessment;
    financialIndicators: GoingConcernIndicator[];
    operatingIndicators: GoingConcernIndicator[];
    otherIndicators: GoingConcernIndicator[];
    overallConclusion: 'no_uncertainty' | 'material_uncertainty' | 'significant_doubt';
    auditReportImpact: string;
    disclosureRequired: boolean;
    recommendedAuditProcedures: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CURRENT_RATIO_THRESHOLD = 1.0;
const DEBT_TO_EQUITY_THRESHOLD = 3.0;
const REVENUE_DECLINE_THRESHOLD = -0.20; // 20% decline

// ============================================================================
// GOING CONCERN AGENT
// ============================================================================

export class RwandaGoingConcernAgent implements RwandaAuditAgent {
    public readonly name = 'Rwanda Going Concern Assessment Agent';
    public readonly version = '1.0.0';
    public readonly category = 'audit' as const;
    public readonly jurisdiction = 'RW' as const;

    constructor(_config: AgentConfig = {}) { }

    getCapabilities(): string[] {
        return [
            'ISA 570 going concern assessment',
            'Financial indicator analysis',
            'Operating indicator analysis',
            'Cash flow projection review',
            'Management plan evaluation',
            'BNR compliance considerations for banks',
            'Audit report impact determination',
            'Disclosure requirement assessment',
        ];
    }

    /**
     * Perform comprehensive going concern assessment.
     */
    assessGoingConcern(input: GoingConcernInput): GoingConcernResult {
        const financialIndicators = this.assessFinancialIndicators(input);
        const operatingIndicators = this.assessOperatingIndicators(input);
        const otherIndicators = this.assessOtherIndicators(input);

        const allIndicators = [...financialIndicators, ...operatingIndicators, ...otherIndicators];
        const presentIndicators = allIndicators.filter(i => i.present);

        // Determine overall conclusion
        const conclusion = this.determineConclusion(presentIndicators, input);

        // Get audit procedures
        const procedures = this.getRecommendedProcedures(conclusion, input);

        // Create assessment
        const assessment: GoingConcernAssessment = {
            assessmentDate: new Date(),
            forecastPeriod: 12,
            conclusion,
            indicators: presentIndicators,
            mitigatingFactors: this.identifyMitigatingFactors(input),
            managementPlans: input.managementPlans || [],
            auditResponse: this.determineAuditResponse(conclusion),
        };

        return {
            assessment,
            financialIndicators,
            operatingIndicators,
            otherIndicators,
            overallConclusion: conclusion,
            auditReportImpact: this.determineReportImpact(conclusion),
            disclosureRequired: conclusion !== 'no_uncertainty',
            recommendedAuditProcedures: procedures,
        };
    }

    /**
     * Assess financial indicators of going concern doubt.
     */
    private assessFinancialIndicators(input: GoingConcernInput): GoingConcernIndicator[] {
        const indicators: GoingConcernIndicator[] = [];

        // Net liability position
        indicators.push({
            category: 'financial',
            description: 'Net liability or net current liability position',
            severity: RiskLevel.HIGH,
            present: input.netAssets < 0 || (input.currentAssets - input.currentLiabilities) < 0,
        });

        // Current ratio
        const currentRatio = input.currentLiabilities > 0
            ? input.currentAssets / input.currentLiabilities
            : 999;
        indicators.push({
            category: 'financial',
            description: 'Current ratio below 1.0 indicating liquidity concerns',
            severity: RiskLevel.HIGH,
            present: currentRatio < CURRENT_RATIO_THRESHOLD,
        });

        // Borrowing capacity
        indicators.push({
            category: 'financial',
            description: 'Fixed term borrowings maturing without realistic refinancing prospects',
            severity: RiskLevel.HIGH,
            present: input.borrowings > 0 && input.availableFacilities <= 0,
        });

        // Negative operating cash flow
        indicators.push({
            category: 'financial',
            description: 'Negative operating cash flows',
            severity: RiskLevel.MODERATE,
            present: input.operatingCashFlow < 0,
        });

        // Revenue decline
        const revenueChange = input.priorYearRevenue > 0
            ? (input.revenue - input.priorYearRevenue) / input.priorYearRevenue
            : 0;
        indicators.push({
            category: 'financial',
            description: 'Significant decline in revenue (>20%)',
            severity: RiskLevel.MODERATE,
            present: revenueChange < REVENUE_DECLINE_THRESHOLD,
        });

        // High debt levels
        const debtToEquity = input.netAssets > 0
            ? input.borrowings / input.netAssets
            : 999;
        indicators.push({
            category: 'financial',
            description: 'High debt-to-equity ratio indicating over-leveraging',
            severity: RiskLevel.MODERATE,
            present: debtToEquity > DEBT_TO_EQUITY_THRESHOLD,
        });

        return indicators;
    }

    /**
     * Assess operating indicators of going concern doubt.
     */
    private assessOperatingIndicators(input: GoingConcernInput): GoingConcernIndicator[] {
        const indicators: GoingConcernIndicator[] = [];

        // Loss of key customer
        indicators.push({
            category: 'operating',
            description: 'Loss of major customer or market',
            severity: RiskLevel.HIGH,
            present: input.keyCustomerLoss,
        });

        // Key supplier issues
        indicators.push({
            category: 'operating',
            description: 'Loss of key supplier without viable alternative',
            severity: RiskLevel.MODERATE,
            present: input.keySupplierIssue,
        });

        // Labor disputes
        indicators.push({
            category: 'operating',
            description: 'Significant labor disputes or unrest',
            severity: RiskLevel.MODERATE,
            present: input.laborDisputes,
        });

        return indicators;
    }

    /**
     * Assess other indicators (legal, regulatory, etc.).
     */
    private assessOtherIndicators(input: GoingConcernInput): GoingConcernIndicator[] {
        const indicators: GoingConcernIndicator[] = [];

        // Legal issues
        indicators.push({
            category: 'other',
            description: 'Pending legal or regulatory proceedings with potential material adverse outcome',
            severity: RiskLevel.HIGH,
            present: input.legalIssuesPending,
        });

        // Regulatory investigation
        indicators.push({
            category: 'other',
            description: 'Regulatory investigation (RRA, BNR, or other)',
            severity: input.isBNRRegulated ? RiskLevel.CRITICAL : RiskLevel.HIGH,
            present: input.regulatoryInvestigation,
        });

        // BNR-specific for banks
        if (input.isBNRRegulated) {
            indicators.push({
                category: 'other',
                description: 'Risk of BNR license revocation or regulatory action',
                severity: RiskLevel.CRITICAL,
                present: input.regulatoryInvestigation,
            });
        }

        return indicators;
    }

    /**
     * Determine overall going concern conclusion.
     */
    private determineConclusion(
        presentIndicators: GoingConcernIndicator[],
        input: GoingConcernInput
    ): 'no_uncertainty' | 'material_uncertainty' | 'significant_doubt' {
        const criticalCount = presentIndicators.filter(i => i.severity === RiskLevel.CRITICAL).length;
        const highCount = presentIndicators.filter(i => i.severity === RiskLevel.HIGH).length;

        // Critical issues = significant doubt
        if (criticalCount > 0) {
            return 'significant_doubt';
        }

        // Multiple high severity = material uncertainty
        if (highCount >= 2) {
            // Check if management has viable plans
            if (input.managementPlans && input.managementPlans.length > 0) {
                return 'material_uncertainty';
            }
            return 'significant_doubt';
        }

        // Single high or multiple moderate = material uncertainty
        if (highCount === 1 || presentIndicators.length >= 3) {
            return 'material_uncertainty';
        }

        return 'no_uncertainty';
    }

    /**
     * Identify mitigating factors.
     */
    private identifyMitigatingFactors(input: GoingConcernInput): string[] {
        const factors: string[] = [];

        if (input.availableFacilities > 0) {
            factors.push(`Available credit facilities of RWF ${input.availableFacilities.toLocaleString()}`);
        }

        if (input.managementPlans && input.managementPlans.length > 0) {
            factors.push('Management has developed plans to address uncertainties');
        }

        if (input.currentAssets > input.currentLiabilities * 0.8) {
            factors.push('Current assets provide reasonable liquidity coverage');
        }

        return factors;
    }

    /**
     * Determine audit response based on conclusion.
     */
    private determineAuditResponse(
        conclusion: 'no_uncertainty' | 'material_uncertainty' | 'significant_doubt'
    ): string {
        switch (conclusion) {
            case 'no_uncertainty':
                return 'Standard going concern procedures completed with no issues identified.';
            case 'material_uncertainty':
                return 'Material uncertainty exists. Obtain written management representations, evaluate adequacy of disclosure, consider emphasis of matter paragraph.';
            case 'significant_doubt':
                return 'Significant doubt exists about going concern. Consider qualified or adverse opinion if disclosures inadequate or going concern basis inappropriate.';
        }
    }

    /**
     * Determine impact on audit report.
     */
    private determineReportImpact(
        conclusion: 'no_uncertainty' | 'material_uncertainty' | 'significant_doubt'
    ): string {
        switch (conclusion) {
            case 'no_uncertainty':
                return 'No impact on audit opinion or report.';
            case 'material_uncertainty':
                return 'Include separate "Material Uncertainty Related to Going Concern" section in audit report per ISA 570.';
            case 'significant_doubt':
                return 'If entity continues as going concern basis but doubt is pervasive: consider qualified opinion. If going concern inappropriate: adverse opinion.';
        }
    }

    /**
     * Get recommended audit procedures.
     */
    private getRecommendedProcedures(
        conclusion: 'no_uncertainty' | 'material_uncertainty' | 'significant_doubt',
        input: GoingConcernInput
    ): string[] {
        const procedures: string[] = [
            'Inquire of management regarding knowledge of going concern issues',
            'Review events after reporting period for adverse indicators',
            'Analyze and discuss cash flow forecasts with management',
        ];

        if (conclusion !== 'no_uncertainty') {
            procedures.push(
                'Evaluate management\'s plans to address going concern issues',
                'Assess feasibility and realism of management\'s plans',
                'Obtain written representations regarding going concern',
                'Consider adequacy of going concern disclosures',
            );
        }

        if (input.isBNRRegulated) {
            procedures.push(
                'Review BNR correspondence and inspection reports',
                'Verify compliance with prudential requirements',
            );
        }

        if (conclusion === 'significant_doubt') {
            procedures.push(
                'Discuss with engagement partner regarding opinion implications',
                'Consider communication with those charged with governance',
                'Evaluate need for legal consultation',
            );
        }

        return procedures;
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createRwandaGoingConcernAgent(config?: AgentConfig): RwandaGoingConcernAgent {
    return new RwandaGoingConcernAgent(config);
}

let _gcAgent: RwandaGoingConcernAgent | null = null;

export const rwandaGoingConcernAgent = {
    instance(config?: AgentConfig): RwandaGoingConcernAgent {
        if (!_gcAgent) {
            _gcAgent = new RwandaGoingConcernAgent(config);
        }
        return _gcAgent;
    },
};
