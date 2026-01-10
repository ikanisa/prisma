/**
 * Malta Planning Agent
 *
 * ISA 300 - Planning an Audit of Financial Statements
 * ISA 315 - Identifying and Assessing RoMM
 * ISA 320 - Materiality in Planning and Performing an Audit
 *
 * Malta-specific features:
 * - Companies Act (Cap. 386) awareness
 * - GAPSME/IFRS materiality benchmarks
 * - Malta industry risk profiles (gaming, crypto, shipping, financial services)
 * - Creditinfo Malta integration stub
 * - Independence/conflict checking
 */

import type {
    MaltaAuditAgent,
    MaltaAgentResponse,
    MaltaAuditContext,
    MaltaMaterialityCalculation,
    MaltaIndustryRiskProfile,
    ClientAcceptanceResult,
    MALTA_HIGH_RISK_INDUSTRIES,
} from '../../types/index.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Materiality benchmarks per entity type.
 */
export const MATERIALITY_BENCHMARKS = {
    profit_oriented: {
        benchmark: 'profit_before_tax',
        minPercentage: 0.03,  // 3%
        maxPercentage: 0.05,  // 5%
        defaultPercentage: 0.05,
    },
    loss_making: {
        benchmark: 'revenue',
        minPercentage: 0.005, // 0.5%
        maxPercentage: 0.01,  // 1%
        defaultPercentage: 0.0075,
    },
    non_profit: {
        benchmark: 'total_expenses',
        minPercentage: 0.01,  // 1%
        maxPercentage: 0.015, // 1.5%
        defaultPercentage: 0.0125,
    },
    asset_heavy: {
        benchmark: 'total_assets',
        minPercentage: 0.005, // 0.5%
        maxPercentage: 0.01,  // 1%
        defaultPercentage: 0.0075,
    },
} as const;

/**
 * Performance materiality factors based on risk.
 */
export const PERFORMANCE_MATERIALITY_FACTORS = {
    LOW: 0.85,      // 85% of overall materiality
    MODERATE: 0.75, // 75% of overall materiality
    HIGH: 0.60,     // 60% of overall materiality
} as const;

/**
 * Malta industry risk profiles.
 */
export const MALTA_INDUSTRY_PROFILES: Record<string, MaltaIndustryRiskProfile> = {
    remote_gaming: {
        industry: 'Remote Gaming',
        inherentRiskLevel: 'VERY_HIGH',
        regulatoryBody: 'Malta Gaming Authority (MGA)',
        specificRisks: [
            'Revenue manipulation through player bonuses',
            'AML/CFT exposure from high-volume transactions',
            'Regulatory compliance complexity',
            'IT systems integrity',
            'Multi-jurisdictional licensing',
        ],
        requiredProcedures: [
            'IT general controls testing',
            'Revenue reconciliation to gaming systems',
            'AML/CFT procedures review',
            'Player liability verification',
            'Bonus accrual testing',
        ],
    },
    crypto_assets: {
        industry: 'Virtual Financial Assets',
        inherentRiskLevel: 'VERY_HIGH',
        regulatoryBody: 'MFSA (VFA Framework)',
        specificRisks: [
            'Asset valuation volatility',
            'Custody and control of private keys',
            'Regulatory uncertainty',
            'AML/CFT exposure',
            'Smart contract risks',
        ],
        requiredProcedures: [
            'Blockchain transaction verification',
            'Wallet balance confirmation',
            'Fair value assessment',
            'Custody controls testing',
            'Smart contract audit review',
        ],
    },
    shipping: {
        industry: 'Shipping & Maritime',
        inherentRiskLevel: 'HIGH',
        regulatoryBody: 'Transport Malta',
        specificRisks: [
            'Revenue recognition (voyage vs time charter)',
            'Asset valuations (vessels)',
            'Impairment considerations',
            'Multi-currency transactions',
            'Environmental liabilities',
        ],
        requiredProcedures: [
            'Voyage revenue cutoff testing',
            'Vessel valuation review',
            'Impairment indicator assessment',
            'Bunker inventory verification',
            'Environmental provision review',
        ],
    },
    financial_services: {
        industry: 'Financial Services',
        inherentRiskLevel: 'HIGH',
        regulatoryBody: 'MFSA',
        specificRisks: [
            'Complex financial instruments',
            'Regulatory capital requirements',
            'Client money segregation',
            'Credit risk provisioning',
            'Fair value measurements',
        ],
        requiredProcedures: [
            'Regulatory capital computation',
            'Client money reconciliation',
            'ECL model validation',
            'Derivative valuations',
            'Solvency ratio verification',
        ],
    },
    real_estate: {
        industry: 'Real Estate',
        inherentRiskLevel: 'MODERATE',
        specificRisks: [
            'Property valuations',
            'Revenue recognition (development sales)',
            'Lease accounting (IFRS 16)',
            'Impairment of investment property',
            'Related party transactions',
        ],
        requiredProcedures: [
            'Property valuation review',
            'Development profit recognition',
            'Lease modification testing',
            'Investment property fair value',
            'Related party disclosure review',
        ],
    },
    manufacturing: {
        industry: 'Manufacturing',
        inherentRiskLevel: 'MODERATE',
        specificRisks: [
            'Inventory valuation (WIP, overhead absorption)',
            'Revenue recognition cutoff',
            'Fixed asset capitalization',
            'Warranty provisions',
            'Supply chain risks',
        ],
        requiredProcedures: [
            'Inventory count observation',
            'Cost buildup testing',
            'Cutoff procedures',
            'Warranty provision review',
            'Transfer pricing documentation',
        ],
    },
    retail: {
        industry: 'Retail & Distribution',
        inherentRiskLevel: 'LOW',
        specificRisks: [
            'Inventory shrinkage',
            'Revenue recognition (multiple deliverables)',
            'Lease accounting',
            'Provision for slow-moving stock',
        ],
        requiredProcedures: [
            'Inventory count attendance',
            'Cash sales verification',
            'Stock provision review',
            'Lease modification testing',
        ],
    },
};

// ============================================================================
// PLANNING AGENT
// ============================================================================

/**
 * Malta Planning Agent.
 *
 * Handles audit planning per ISA 300/315/320 with Malta-specific considerations.
 */
export class MaltaPlanningAgent implements MaltaAuditAgent {
    public readonly agentId = 'malta-planning-001';
    public readonly name = 'Malta Planning Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'PLANNING' as const;
    public readonly isaReferences = ['ISA 300', 'ISA 315', 'ISA 320'];
    public readonly autonomyLevel = 4 as const;

    /**
     * Calculate materiality per ISA 320 with Malta benchmarks.
     */
    async calculateMateriality(
        financials: {
            profitBeforeTax?: number;
            revenue?: number;
            totalAssets?: number;
            totalExpenses?: number;
            equity?: number;
        },
        options: {
            entityType?: 'profit_oriented' | 'loss_making' | 'non_profit' | 'asset_heavy';
            riskLevel?: 'LOW' | 'MODERATE' | 'HIGH';
            industry?: string;
            firstYearAudit?: boolean;
        } = {}
    ): Promise<MaltaAgentResponse<MaltaMaterialityCalculation>> {
        const startTime = Date.now();

        try {
            // Determine entity type
            let entityType = options.entityType;
            if (!entityType) {
                if (financials.profitBeforeTax && financials.profitBeforeTax > 0) {
                    entityType = 'profit_oriented';
                } else if (financials.totalExpenses && !financials.revenue) {
                    entityType = 'non_profit';
                } else if (financials.totalAssets && financials.totalAssets > (financials.revenue ?? 0) * 3) {
                    entityType = 'asset_heavy';
                } else {
                    entityType = 'loss_making';
                }
            }

            const benchmark = MATERIALITY_BENCHMARKS[entityType];
            let benchmarkAmount: number;
            let benchmarkName: string;

            // Select benchmark amount
            switch (benchmark.benchmark) {
                case 'profit_before_tax':
                    benchmarkAmount = financials.profitBeforeTax ?? 0;
                    benchmarkName = 'Profit Before Tax';
                    break;
                case 'revenue':
                    benchmarkAmount = financials.revenue ?? 0;
                    benchmarkName = 'Revenue';
                    break;
                case 'total_expenses':
                    benchmarkAmount = financials.totalExpenses ?? 0;
                    benchmarkName = 'Total Expenses';
                    break;
                case 'total_assets':
                    benchmarkAmount = financials.totalAssets ?? 0;
                    benchmarkName = 'Total Assets';
                    break;
                default:
                    benchmarkAmount = financials.revenue ?? financials.totalAssets ?? 0;
                    benchmarkName = 'Revenue/Assets';
            }

            if (benchmarkAmount <= 0) {
                return {
                    success: false,
                    error: 'Cannot calculate materiality - no valid benchmark amount',
                    agentId: this.agentId,
                    requiresReview: true,
                    reviewReason: 'Invalid financial data for materiality calculation',
                    durationMs: Date.now() - startTime,
                };
            }

            // Apply percentage
            let percentage: number = benchmark.defaultPercentage;

            // Adjust for industry risk
            if (options.industry) {
                const industryProfile = MALTA_INDUSTRY_PROFILES[options.industry.toLowerCase().replace(/\s+/g, '_')];
                if (industryProfile?.inherentRiskLevel === 'VERY_HIGH' || industryProfile?.inherentRiskLevel === 'HIGH') {
                    percentage = benchmark.minPercentage; // Use lower percentage for high-risk
                }
            }

            // First year audit adjustment
            if (options.firstYearAudit) {
                percentage = Math.max(benchmark.minPercentage, percentage * 0.9);
            }

            const overallMateriality = Math.round(benchmarkAmount * percentage);

            // Calculate performance materiality
            const riskLevel = options.riskLevel ?? 'MODERATE';
            const performanceFactor = PERFORMANCE_MATERIALITY_FACTORS[riskLevel];
            const performanceMateriality = Math.round(overallMateriality * performanceFactor);

            // Trivial threshold (5% of overall)
            const trivialThreshold = Math.round(overallMateriality * 0.05);

            const result: MaltaMaterialityCalculation = {
                overallMateriality,
                performanceMateriality,
                trivialThreshold,
                basis: benchmarkName,
                percentage: percentage * 100,
                rationale: this.generateMaterialityRationale(
                    entityType,
                    benchmarkName,
                    percentage,
                    options.industry,
                    options.firstYearAudit
                ),
                entityType,
                benchmark: benchmarkName,
                benchmarkAmount,
                percentageApplied: percentage * 100,
                maltaAdjustments: this.getMaltaAdjustments(options),
            };

            return {
                success: true,
                data: result,
                agentId: this.agentId,
                requiresReview: overallMateriality > benchmarkAmount * 0.1, // >10% requires review
                reviewReason:
                    overallMateriality > benchmarkAmount * 0.1
                        ? 'Materiality exceeds 10% of benchmark - HITL review required'
                        : undefined,
                durationMs: Date.now() - startTime,
                nextSteps: [
                    'Document materiality in planning memorandum',
                    'Communicate to engagement team',
                    'Review with engagement partner',
                ],
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Materiality calculation failed',
                agentId: this.agentId,
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Assess client acceptance per ISQC 1.
     */
    async assessClientAcceptance(
        company: {
            name: string;
            registrationNo: string;
            industry: string;
            mfsaRegulated?: boolean;
            previousAuditor?: string;
            managementIntegrity?: 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
        },
        existingClients: string[] = [],
        firmCapabilities: {
            hasIndustryExpertise?: boolean;
            hasCapacity?: boolean;
            specialistAvailable?: boolean;
        } = {}
    ): Promise<MaltaAgentResponse<ClientAcceptanceResult>> {
        const startTime = Date.now();

        try {
            const conflicts: string[] = [];
            let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
            let independenceConfirmed = true;

            // Check for conflicts with existing clients
            // (In production, this would check against a proper database)
            if (existingClients.includes(company.name)) {
                conflicts.push('Potential conflict - company appears in existing client list');
                independenceConfirmed = false;
            }

            // Industry risk assessment
            const industryKey = company.industry.toLowerCase().replace(/\s+/g, '_');
            const industryProfile = MALTA_INDUSTRY_PROFILES[industryKey];

            if (industryProfile?.inherentRiskLevel === 'VERY_HIGH') {
                riskLevel = 'HIGH';
            } else if (industryProfile?.inherentRiskLevel === 'HIGH' || industryProfile?.inherentRiskLevel === 'MODERATE') {
                riskLevel = 'MODERATE';
            }

            // MFSA regulated adds complexity
            if (company.mfsaRegulated) {
                if (!firmCapabilities.specialistAvailable) {
                    conflicts.push('MFSA regulated entity - regulatory specialist may be required');
                }
                riskLevel = riskLevel === 'LOW' ? 'MODERATE' : riskLevel;
            }

            // Management integrity concerns
            if (company.managementIntegrity === 'LOW') {
                riskLevel = 'HIGH';
                conflicts.push('Concerns about management integrity identified');
            } else if (company.managementIntegrity === 'UNKNOWN') {
                conflicts.push('Unable to assess management integrity - predecessor auditor inquiry needed');
            }

            // Competence check
            const competenceAssessed = firmCapabilities.hasIndustryExpertise ?? true;
            const resourcesAvailable = firmCapabilities.hasCapacity ?? true;

            if (!competenceAssessed) {
                conflicts.push('Insufficient industry expertise');
            }
            if (!resourcesAvailable) {
                conflicts.push('Insufficient resources/capacity');
            }

            // Determine acceptance
            const criticalConflicts = conflicts.filter(
                (c) => c.includes('integrity') || c.includes('independence')
            );
            const accepted = criticalConflicts.length === 0 && competenceAssessed && resourcesAvailable;

            const result: ClientAcceptanceResult = {
                accepted,
                independenceConfirmed,
                conflictsIdentified: conflicts,
                competenceAssessed,
                resourcesAvailable,
                riskLevel,
                partnerApprovalRequired: riskLevel === 'HIGH' || !accepted || conflicts.length > 0,
                rationale: this.generateAcceptanceRationale(accepted, conflicts, riskLevel),
            };

            return {
                success: true,
                data: result,
                agentId: this.agentId,
                hitlGateTriggered: result.partnerApprovalRequired ? 'GATE_001' : undefined,
                requiresReview: result.partnerApprovalRequired,
                reviewReason: result.partnerApprovalRequired ? 'New client acceptance requires partner approval' : undefined,
                durationMs: Date.now() - startTime,
                nextSteps: result.accepted
                    ? [
                        'Document acceptance in engagement file',
                        'Send engagement letter',
                        'Communicate with predecessor auditor',
                        'Commence planning procedures',
                    ]
                    : [
                        'Document rejection rationale',
                        'Notify prospective client',
                        'Consider referral to appropriate firm',
                    ],
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Client acceptance assessment failed',
                agentId: this.agentId,
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Get industry risk profile.
     */
    async getIndustryRiskProfile(
        industry: string
    ): Promise<MaltaAgentResponse<MaltaIndustryRiskProfile | null>> {
        const startTime = Date.now();
        const industryKey = industry.toLowerCase().replace(/\s+/g, '_');
        const profile = MALTA_INDUSTRY_PROFILES[industryKey] ?? null;

        return {
            success: true,
            data: profile,
            agentId: this.agentId,
            requiresReview: false,
            durationMs: Date.now() - startTime,
        };
    }

    /**
     * Estimate audit hours based on entity classification and risk.
     */
    async estimateAuditHours(
        classification: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE',
        riskLevel: 'LOW' | 'MODERATE' | 'HIGH',
        options: {
            firstYearAudit?: boolean;
            mfsaRegulated?: boolean;
            groupAudit?: boolean;
            complexTransactions?: number;
        } = {}
    ): Promise<MaltaAgentResponse<{
        totalHours: number;
        breakdown: Record<string, number>;
        riskPremium: number;
    }>> {
        const startTime = Date.now();

        // Base hours by classification
        const baseHours: Record<string, number> = {
            MICRO: 40,
            SMALL: 80,
            MEDIUM: 200,
            LARGE: 500,
        };

        let total = baseHours[classification] ?? 100;

        // Risk premium
        const riskMultipliers = { LOW: 1.0, MODERATE: 1.15, HIGH: 1.35 };
        const riskPremium = (riskMultipliers[riskLevel] - 1) * total;
        total *= riskMultipliers[riskLevel];

        // First year premium
        if (options.firstYearAudit) {
            total *= 1.25;
        }

        // MFSA regulated premium
        if (options.mfsaRegulated) {
            total *= 1.20;
        }

        // Group audit premium
        if (options.groupAudit) {
            total *= 1.30;
        }

        // Complex transactions
        if (options.complexTransactions) {
            total += options.complexTransactions * 4;
        }

        total = Math.round(total);

        // Breakdown
        const breakdown = {
            planning: Math.round(total * 0.15),
            riskAssessment: Math.round(total * 0.10),
            controlsTesting: Math.round(total * 0.15),
            substantiveTesting: Math.round(total * 0.35),
            completion: Math.round(total * 0.15),
            review: Math.round(total * 0.10),
        };

        return {
            success: true,
            data: {
                totalHours: total,
                breakdown,
                riskPremium: Math.round(riskPremium),
            },
            agentId: this.agentId,
            requiresReview: false,
            durationMs: Date.now() - startTime,
        };
    }

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    private generateMaterialityRationale(
        entityType: string,
        benchmark: string,
        percentage: number,
        industry?: string,
        firstYearAudit?: boolean
    ): string {
        let rationale = `Materiality calculated using ${(percentage * 100).toFixed(1)}% of ${benchmark} `;
        rationale += `based on ${entityType.replace(/_/g, ' ')} entity classification.`;

        if (industry) {
            const profile = MALTA_INDUSTRY_PROFILES[industry.toLowerCase().replace(/\s+/g, '_')];
            if (profile?.inherentRiskLevel === 'HIGH' || profile?.inherentRiskLevel === 'VERY_HIGH') {
                rationale += ` Lower percentage applied due to high-risk ${profile.industry} industry.`;
            }
        }

        if (firstYearAudit) {
            rationale += ' Additional reduction applied for first year audit.';
        }

        return rationale;
    }

    private getMaltaAdjustments(options: {
        industry?: string;
        firstYearAudit?: boolean;
        riskLevel?: string;
    }): string[] {
        const adjustments: string[] = [];

        if (options.industry) {
            const profile = MALTA_INDUSTRY_PROFILES[options.industry.toLowerCase().replace(/\s+/g, '_')];
            if (profile?.regulatoryBody) {
                adjustments.push(`Regulated by ${profile.regulatoryBody}`);
            }
        }

        if (options.firstYearAudit) {
            adjustments.push('First year audit - enhanced procedures');
        }

        if (options.riskLevel === 'HIGH') {
            adjustments.push('High-risk engagement - reduced performance materiality');
        }

        return adjustments;
    }

    private generateAcceptanceRationale(
        accepted: boolean,
        conflicts: string[],
        riskLevel: string
    ): string {
        if (accepted && conflicts.length === 0) {
            return `Client accepted. Risk level assessed as ${riskLevel}. No conflicts identified.`;
        } else if (accepted) {
            return `Client accepted with conditions. Risk level: ${riskLevel}. Issues noted: ${conflicts.join('; ')}`;
        } else {
            return `Client not accepted. Risk level: ${riskLevel}. Rejection factors: ${conflicts.join('; ')}`;
        }
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Malta Planning Agent instance.
 */
export function createMaltaPlanningAgent(): MaltaPlanningAgent {
    return new MaltaPlanningAgent();
}

/**
 * Lazy singleton instance.
 */
let _maltaPlanningAgent: MaltaPlanningAgent | null = null;

export const maltaPlanningAgent = {
    instance(): MaltaPlanningAgent {
        if (!_maltaPlanningAgent) {
            _maltaPlanningAgent = new MaltaPlanningAgent();
        }
        return _maltaPlanningAgent;
    },
};
