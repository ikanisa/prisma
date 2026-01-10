/**
 * Malta Audit Exemption Router Agent
 *
 * Routes engagements per LN 139/2025 and Companies Act (Cap. 386) Article 185(2).
 *
 * Routing Logic:
 * - Exceeds 2+ of 3 thresholds over 2 consecutive years → FULL_AUDIT
 * - Exceeds 1 of 3 thresholds → ISRE_2400_REVIEW
 * - Exceeds 0 of 3 thresholds → NO_ASSURANCE
 *
 * Thresholds per Article 185(2):
 * - Balance sheet total: ≤ €46,600
 * - Net turnover: ≤ €93,000
 * - Average employees: ≤ 2
 *
 * Exclusions:
 * - MFSA regulated entities always require FULL_AUDIT
 * - Public Interest Entities always require FULL_AUDIT
 */

import type {
    MaltaAuditAgent,
    MaltaAgentResponse,
    MaltaEngagementType,
    ExemptionRule,
    Article185Thresholds,
    TwoYearFinancialData,
    EngagementRoutingDecision,
} from '../../types/index.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Article 185(2) exemption thresholds.
 */
export const ARTICLE_185_THRESHOLDS = {
    balanceSheet: 46600,  // €46,600
    netTurnover: 93000,   // €93,000
    employees: 2,
} as const;

/**
 * Startup incentive thresholds per LN 139/2025 Rule 6.
 */
export const STARTUP_INCENTIVE_THRESHOLDS = {
    maxTurnover: 80000,           // €80,000 pro-rated
    mqfLevel: 3,                  // Minimum MQF Level 3
    yearsFromIncorporation: 2,    // First 2 accounting periods
    yearsFromQualification: 3,    // Registered within 3 years of qualification
} as const;

// ============================================================================
// EXEMPTION ROUTER AGENT
// ============================================================================

/**
 * Malta Exemption Router Agent.
 *
 * Determines engagement type based on LN 139/2025 exemption rules.
 */
export class ExemptionRouterAgent implements MaltaAuditAgent {
    public readonly agentId = 'malta-exemption-router-001';
    public readonly name = 'Malta Exemption Router Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'ROUTING' as const;
    public readonly isaReferences = ['ISA 200', 'LN 139/2025', 'Companies Act Cap. 386'];
    public readonly autonomyLevel = 5 as const; // Fully deterministic

    /**
     * Route engagement based on LN 139/2025 criteria.
     */
    async routeEngagement(
        financialData: TwoYearFinancialData,
        options: {
            mfsaRegulated?: boolean;
            publicInterestEntity?: boolean;
            incorporationDate?: Date;
            shareholders?: Array<{
                type: 'INDIVIDUAL' | 'CORPORATE';
                mqfLevel?: number;
                registeredWithinThreeYears?: boolean;
            }>;
            registeredUnder?: 'COMPANIES_ACT' | 'MERCHANT_SHIPPING_ACT';
        } = {}
    ): Promise<MaltaAgentResponse<EngagementRoutingDecision>> {
        const startTime = Date.now();

        try {
            // MFSA regulated entities always require full audit
            if (options.mfsaRegulated) {
                return this.createResponse(
                    {
                        engagementType: 'FULL_AUDIT',
                        exemptionRule: 'NONE',
                        thresholdsExceededYear1: 0,
                        thresholdsExceededYear2: 0,
                        maxExceeded: 0,
                        startupIncentiveEligible: false,
                        mfsaRegulated: true,
                        rationale: 'MFSA regulated entities cannot claim audit exemption',
                        nextSteps: [
                            'Engage MFSA-approved auditor',
                            'Prepare ISA-compliant audit plan',
                            'Ensure compliance with MFSA reporting requirements',
                        ],
                    },
                    startTime
                );
            }

            // PIEs always require full audit with EQCR
            if (options.publicInterestEntity) {
                return this.createResponse(
                    {
                        engagementType: 'FULL_AUDIT',
                        exemptionRule: 'NONE',
                        thresholdsExceededYear1: 0,
                        thresholdsExceededYear2: 0,
                        maxExceeded: 0,
                        startupIncentiveEligible: false,
                        mfsaRegulated: false,
                        rationale: 'Public Interest Entities require full statutory audit with EQCR',
                        nextSteps: [
                            'Appoint EQCR reviewer',
                            'Prepare Key Audit Matters (KAM)',
                            'Enhanced documentation requirements',
                        ],
                    },
                    startTime
                );
            }

            // Check Merchant Shipping Act exemption (Rule 9)
            if (options.registeredUnder === 'MERCHANT_SHIPPING_ACT') {
                return this.createResponse(
                    {
                        engagementType: 'NO_ASSURANCE',
                        exemptionRule: 'RULE_9_MERCHANT_SHIPPING',
                        thresholdsExceededYear1: 0,
                        thresholdsExceededYear2: 0,
                        maxExceeded: 0,
                        startupIncentiveEligible: false,
                        mfsaRegulated: false,
                        rationale: 'Merchant Shipping Act entities exempt from audit per LN 139/2025 Rule 9',
                        nextSteps: [
                            'Prepare unaudited financial statements',
                            'File with Malta Business Registry',
                        ],
                    },
                    startTime
                );
            }

            // Check startup incentive eligibility (Rule 6)
            const startupEligible = this.checkStartupIncentive(
                options.incorporationDate,
                options.shareholders,
                financialData.year1.netTurnover
            );

            if (startupEligible.eligible) {
                return this.createResponse(
                    {
                        engagementType: 'NO_ASSURANCE',
                        exemptionRule: 'RULE_6_NEW_COMPANY',
                        thresholdsExceededYear1: 0,
                        thresholdsExceededYear2: 0,
                        maxExceeded: 0,
                        startupIncentiveEligible: true,
                        mfsaRegulated: false,
                        rationale: startupEligible.reason,
                        nextSteps: [
                            'Prepare GAPSME financial statements',
                            'Director declaration required',
                            'Eligible for 120% tax deduction on voluntary audit costs (max €700)',
                        ],
                    },
                    startTime
                );
            }

            // Calculate thresholds exceeded for each year
            const year1Exceeded = this.countThresholdsExceeded(financialData.year1);
            const year2Exceeded = this.countThresholdsExceeded(financialData.year2);
            const maxExceeded = Math.max(year1Exceeded, year2Exceeded);

            // Determine engagement type based on thresholds
            let engagementType: MaltaEngagementType;
            let exemptionRule: ExemptionRule;
            let rationale: string;
            let nextSteps: string[];

            if (maxExceeded >= 2) {
                // Exceeds 2+ thresholds in either year → Full audit
                engagementType = 'FULL_AUDIT';
                exemptionRule = 'NONE';
                rationale = `Exceeds ${maxExceeded} of 3 Article 185(2) thresholds - full statutory audit required`;
                nextSteps = [
                    'Engage registered auditor',
                    'Prepare ISA-compliant financial statements',
                    'Schedule audit planning meeting',
                    'File audited accounts with MBR within 10 months + 42 days of year end',
                ];
            } else if (maxExceeded === 1) {
                // Exceeds exactly 1 threshold → Review engagement
                engagementType = 'ISRE_2400_REVIEW';
                exemptionRule = 'NONE';
                rationale = 'Exceeds 1 of 3 Article 185(2) thresholds - limited review engagement applies';
                nextSteps = [
                    'Engage practitioner for ISRE 2400 review',
                    'Prepare financial statements',
                    'Limited assurance procedures only',
                    'File reviewed accounts with MBR',
                ];
            } else {
                // Exceeds 0 thresholds → Micro entity exemption
                engagementType = 'NO_ASSURANCE';
                exemptionRule = 'RULE_7_MICRO_ENTITY';
                rationale = 'Meets all Article 185(2) micro entity thresholds - audit/review exemption applies';
                nextSteps = [
                    'Prepare GAPSME financial statements',
                    'File unaudited accounts with MBR',
                    'Shareholders may still request voluntary audit',
                ];
            }

            return this.createResponse(
                {
                    engagementType,
                    exemptionRule,
                    thresholdsExceededYear1: year1Exceeded,
                    thresholdsExceededYear2: year2Exceeded,
                    maxExceeded,
                    startupIncentiveEligible: false,
                    mfsaRegulated: false,
                    rationale,
                    nextSteps,
                },
                startTime
            );
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Routing failed',
                agentId: this.agentId,
                requiresReview: true,
                reviewReason: 'Exception during routing calculation',
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Count how many Article 185(2) thresholds are exceeded.
     */
    private countThresholdsExceeded(data: Article185Thresholds): number {
        let count = 0;

        if (data.balanceSheet > ARTICLE_185_THRESHOLDS.balanceSheet) {
            count++;
        }
        if (data.netTurnover > ARTICLE_185_THRESHOLDS.netTurnover) {
            count++;
        }
        if (data.averageEmployees > ARTICLE_185_THRESHOLDS.employees) {
            count++;
        }

        return count;
    }

    /**
     * Check startup incentive eligibility per LN 139/2025 Rule 6.
     */
    private checkStartupIncentive(
        incorporationDate?: Date,
        shareholders?: Array<{
            type: 'INDIVIDUAL' | 'CORPORATE';
            mqfLevel?: number;
            registeredWithinThreeYears?: boolean;
        }>,
        turnover?: number
    ): { eligible: boolean; reason: string } {
        if (!incorporationDate || !shareholders || shareholders.length === 0) {
            return { eligible: false, reason: 'Insufficient data for startup assessment' };
        }

        // Check within first 2 accounting periods
        const now = new Date();
        const yearsIncorporated =
            (now.getTime() - incorporationDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

        if (yearsIncorporated > STARTUP_INCENTIVE_THRESHOLDS.yearsFromIncorporation) {
            return { eligible: false, reason: 'Beyond first 2 accounting periods' };
        }

        // All shareholders must be individuals
        const allIndividuals = shareholders.every((sh) => sh.type === 'INDIVIDUAL');
        if (!allIndividuals) {
            return { eligible: false, reason: 'Corporate shareholders present' };
        }

        // All shareholders must have MQF Level 3+
        const allQualified = shareholders.every(
            (sh) => (sh.mqfLevel ?? 0) >= STARTUP_INCENTIVE_THRESHOLDS.mqfLevel
        );
        if (!allQualified) {
            return { eligible: false, reason: 'Not all shareholders have MQF Level 3+ qualifications' };
        }

        // Shareholders registered within 3 years of qualification
        const allRecentlyRegistered = shareholders.every(
            (sh) => sh.registeredWithinThreeYears !== false
        );
        if (!allRecentlyRegistered) {
            return {
                eligible: false,
                reason: 'Shareholders not registered within 3 years of qualification',
            };
        }

        // Turnover check
        if (turnover && turnover > STARTUP_INCENTIVE_THRESHOLDS.maxTurnover) {
            return {
                eligible: false,
                reason: `Turnover €${turnover.toLocaleString()} exceeds €80,000 threshold`,
            };
        }

        return {
            eligible: true,
            reason: `Eligible for LN 139/2025 Rule 6 new company exemption (Year ${Math.ceil(yearsIncorporated)} of 2)`,
        };
    }

    /**
     * Create standardized response.
     */
    private createResponse(
        data: EngagementRoutingDecision,
        startTime: number
    ): MaltaAgentResponse<EngagementRoutingDecision> {
        return {
            success: true,
            data,
            agentId: this.agentId,
            requiresReview: data.engagementType === 'FULL_AUDIT',
            reviewReason: data.engagementType === 'FULL_AUDIT' ? 'Full audit requires partner review' : undefined,
            durationMs: Date.now() - startTime,
            nextSteps: data.nextSteps,
        };
    }

    /**
     * Evaluate borderline cases (within 5% of threshold).
     */
    async evaluateBorderline(
        financialData: TwoYearFinancialData
    ): Promise<MaltaAgentResponse<{
        isBorderline: boolean;
        borderlineThresholds: string[];
        recommendation: string;
    }>> {
        const startTime = Date.now();
        const borderlineThresholds: string[] = [];
        const marginPercent = 0.05; // 5% margin

        // Check Year 1
        const y1 = financialData.year1;
        if (
            Math.abs(y1.balanceSheet - ARTICLE_185_THRESHOLDS.balanceSheet) /
            ARTICLE_185_THRESHOLDS.balanceSheet <=
            marginPercent
        ) {
            borderlineThresholds.push('Year 1 Balance Sheet (within 5% of €46,600)');
        }
        if (
            Math.abs(y1.netTurnover - ARTICLE_185_THRESHOLDS.netTurnover) /
            ARTICLE_185_THRESHOLDS.netTurnover <=
            marginPercent
        ) {
            borderlineThresholds.push('Year 1 Turnover (within 5% of €93,000)');
        }

        // Check Year 2
        const y2 = financialData.year2;
        if (
            Math.abs(y2.balanceSheet - ARTICLE_185_THRESHOLDS.balanceSheet) /
            ARTICLE_185_THRESHOLDS.balanceSheet <=
            marginPercent
        ) {
            borderlineThresholds.push('Year 2 Balance Sheet (within 5% of €46,600)');
        }
        if (
            Math.abs(y2.netTurnover - ARTICLE_185_THRESHOLDS.netTurnover) /
            ARTICLE_185_THRESHOLDS.netTurnover <=
            marginPercent
        ) {
            borderlineThresholds.push('Year 2 Turnover (within 5% of €93,000)');
        }

        const isBorderline = borderlineThresholds.length > 0;

        return {
            success: true,
            data: {
                isBorderline,
                borderlineThresholds,
                recommendation: isBorderline
                    ? 'HITL review recommended - threshold values are borderline'
                    : 'Clear threshold determination - no borderline concerns',
            },
            agentId: this.agentId,
            requiresReview: isBorderline,
            reviewReason: isBorderline ? 'Borderline threshold values require human review' : undefined,
            durationMs: Date.now() - startTime,
        };
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create an Exemption Router Agent instance.
 */
export function createExemptionRouterAgent(): ExemptionRouterAgent {
    return new ExemptionRouterAgent();
}

/**
 * Lazy singleton instance.
 */
let _exemptionRouterAgent: ExemptionRouterAgent | null = null;

export const exemptionRouterAgent = {
    instance(): ExemptionRouterAgent {
        if (!_exemptionRouterAgent) {
            _exemptionRouterAgent = new ExemptionRouterAgent();
        }
        return _exemptionRouterAgent;
    },
};
