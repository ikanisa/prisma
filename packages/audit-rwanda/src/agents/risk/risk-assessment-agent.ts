/**
 * Rwanda Audit Risk Assessment Agent
 * 
 * ISA 315-based risk assessment with Rwanda-specific factors.
 * Includes materiality calculation using Big Four methodology.
 * 
 * @package @prisma/audit-rwanda
 */

import type {
    RwandaAuditAgent,
    RiskLevel,
    MaterialityCalculation,
    KeyAuditMatter,
    RiskAssessment,
    AgentConfig,
} from '../../types/index.js';

// ============================================================================
// RISK FACTORS
// ============================================================================

/**
 * Rwanda-specific risk factors by industry.
 */
const RWANDA_INDUSTRY_RISKS: Record<string, Array<{
    risk: string;
    impact: RiskLevel;
    isaReference: string;
}>> = {
    banking: [
        { risk: 'BNR prudential ratio compliance', impact: RiskLevel.HIGH, isaReference: 'ISA 570' },
        { risk: 'IFRS 9 ECL model accuracy', impact: RiskLevel.HIGH, isaReference: 'ISA 540' },
        { risk: 'FX exposure (USD, EUR, KES)', impact: RiskLevel.MODERATE, isaReference: 'ISA 540' },
    ],
    telecom: [
        { risk: 'Digital Services Tax (DST) compliance', impact: RiskLevel.MODERATE, isaReference: 'ISA 250' },
        { risk: 'Excise duty on telephone communication', impact: RiskLevel.MODERATE, isaReference: 'ISA 250' },
    ],
    manufacturing: [
        { risk: 'EAC/AfCFTA customs valuation', impact: RiskLevel.HIGH, isaReference: 'ISA 250' },
        { risk: 'VAT zero-rating documentation', impact: RiskLevel.MODERATE, isaReference: 'ISA 500' },
    ],
    hospitality: [
        { risk: 'Tourism tax (3%) collection', impact: RiskLevel.MODERATE, isaReference: 'ISA 250' },
        { risk: 'VAT on room charges', impact: RiskLevel.LOW, isaReference: 'ISA 250' },
    ],
    services: [
        { risk: 'Withholding tax on services (15%)', impact: RiskLevel.MODERATE, isaReference: 'ISA 250' },
        { risk: 'RSSB contribution compliance', impact: RiskLevel.MODERATE, isaReference: 'ISA 250' },
    ],
};

// ============================================================================
// AUDIT RISK AGENT
// ============================================================================

export class RwandaRiskAssessmentAgent implements RwandaAuditAgent {
    public readonly name = 'Rwanda Audit Risk Assessment Agent';
    public readonly version = '1.0.0';
    public readonly category = 'audit' as const;
    public readonly jurisdiction = 'RW' as const;

    constructor(_config: AgentConfig = {}) { }

    getCapabilities(): string[] {
        return [
            'ISA 315 risk assessment',
            'Rwanda-specific risk identification',
            'Materiality calculation (Big Four methodology)',
            'Industry risk analysis',
            'BNR compliance risk for banks',
            'RRA compliance risk assessment',
            'ISA 701 KAM identification',
        ];
    }

    /**
     * Perform ISA 315 risk assessment.
     */
    performRiskAssessment(input: {
        industry: string;
        annualRevenue: number;
        totalAssets: number;
        isPIE: boolean;
        isBNRRegulated: boolean;
        hasRelatedPartyTransactions: boolean;
        hasSignificantEstimates: boolean;
        isFirstYearAudit: boolean;
        priorYearAdjustments: boolean;
    }): RiskAssessment[] {
        const risks: RiskAssessment[] = [];

        // Industry-specific risks
        const industryRisks = RWANDA_INDUSTRY_RISKS[input.industry] || [];
        for (const ir of industryRisks) {
            risks.push({
                accountArea: input.industry,
                inherentRisk: ir.impact,
                controlRisk: RiskLevel.MODERATE,
                detectionRisk: RiskLevel.MODERATE,
                combinedRisk: ir.impact,
                significantRisk: ir.impact === RiskLevel.HIGH,
                riskFactors: [ir.risk],
                auditResponse: [`Apply substantive procedures focused on ${ir.risk}`],
            });
        }

        // Revenue recognition risk (ISA 240 presumed risk)
        risks.push({
            accountArea: 'Revenue Recognition',
            inherentRisk: RiskLevel.HIGH,
            controlRisk: RiskLevel.HIGH,
            detectionRisk: RiskLevel.LOW,
            combinedRisk: RiskLevel.CRITICAL,
            significantRisk: true,
            riskFactors: ['Revenue is a presumed fraud risk per ISA 240'],
            auditResponse: [
                'Perform detailed revenue testing',
                'Test revenue cut-off at period end',
                'Verify supporting contracts and delivery evidence',
            ],
        });

        // Management override of controls (ISA 240 presumed risk)
        risks.push({
            accountArea: 'Management Override',
            inherentRisk: RiskLevel.HIGH,
            controlRisk: RiskLevel.HIGH,
            detectionRisk: RiskLevel.LOW,
            combinedRisk: RiskLevel.CRITICAL,
            significantRisk: true,
            riskFactors: ['Management override of controls is a presumed fraud risk'],
            auditResponse: [
                'Test journal entries for unusual characteristics',
                'Review accounting estimates for bias',
                'Evaluate business rationale for significant transactions',
            ],
        });

        // BNR regulated entities
        if (input.isBNRRegulated) {
            risks.push({
                accountArea: 'BNR Prudential Compliance',
                inherentRisk: RiskLevel.HIGH,
                controlRisk: RiskLevel.MODERATE,
                detectionRisk: RiskLevel.MODERATE,
                combinedRisk: RiskLevel.HIGH,
                significantRisk: true,
                riskFactors: ['Compliance with BNR capital adequacy and other prudential requirements'],
                auditResponse: [
                    'Verify BNR capital adequacy calculations',
                    'Test compliance with prudential ratios',
                    'Review BNR inspection reports',
                ],
            });
        }

        // Related party transactions
        if (input.hasRelatedPartyTransactions) {
            risks.push({
                accountArea: 'Related Party Transactions',
                inherentRisk: RiskLevel.HIGH,
                controlRisk: RiskLevel.HIGH,
                detectionRisk: RiskLevel.MODERATE,
                combinedRisk: RiskLevel.HIGH,
                significantRisk: true,
                riskFactors: ['Disclosure and arm\'s length pricing of related party transactions'],
                auditResponse: [
                    'Obtain management representation for related parties',
                    'Verify arm\'s length pricing',
                    'Confirm disclosure completeness',
                ],
            });
        }

        // Significant estimates
        if (input.hasSignificantEstimates) {
            risks.push({
                accountArea: 'Accounting Estimates',
                inherentRisk: RiskLevel.HIGH,
                controlRisk: RiskLevel.MODERATE,
                detectionRisk: RiskLevel.MODERATE,
                combinedRisk: RiskLevel.HIGH,
                significantRisk: true,
                riskFactors: ['Significant judgement in accounting estimates (e.g., ECL, provisions)'],
                auditResponse: [
                    'Challenge key assumptions',
                    'Perform sensitivity analysis',
                    'Involve internal specialists where applicable',
                ],
            });
        }

        // First year audit
        if (input.isFirstYearAudit) {
            risks.push({
                accountArea: 'Opening Balances',
                inherentRisk: RiskLevel.MODERATE,
                controlRisk: RiskLevel.MODERATE,
                detectionRisk: RiskLevel.LOW,
                combinedRisk: RiskLevel.MODERATE,
                significantRisk: false,
                riskFactors: ['First year audit - opening balances require additional procedures'],
                auditResponse: [
                    'Review predecessor auditor working papers',
                    'Perform procedures on opening balances',
                    'Consider impact on comparatives',
                ],
            });
        }

        // Tax compliance risks (always relevant in Rwanda)
        risks.push({
            accountArea: 'RRA Tax Compliance',
            inherentRisk: RiskLevel.MODERATE,
            controlRisk: RiskLevel.MODERATE,
            detectionRisk: RiskLevel.MODERATE,
            combinedRisk: RiskLevel.MODERATE,
            significantRisk: false,
            riskFactors: ['VAT, CIT, PAYE, and RSSB compliance per RRA requirements'],
            auditResponse: [
                'Review tax filings for accuracy',
                'Verify tax provisions',
                'Check RSSB contribution reconciliations',
            ],
        });

        return risks;
    }

    /**
     * Calculate audit materiality using Big Four methodology.
     */
    calculateMateriality(input: {
        totalAssets: number;
        profitBeforeTax: number;
        revenue: number;
        equity: number;
        isPIE: boolean;
        isLossmaking: boolean;
    }): MaterialityCalculation {
        let benchmarkValue: number;
        let benchmarkUsed: string;
        let percentageApplied: number;

        // Determine appropriate base
        if (input.isLossmaking || input.profitBeforeTax <= 0) {
            // Use total assets for loss-making entities
            benchmarkValue = input.totalAssets;
            benchmarkUsed = 'Total Assets';
            percentageApplied = 1;  // 1% of total assets
        } else if (input.profitBeforeTax < input.totalAssets * 0.05) {
            // Low profit margin - use total assets
            benchmarkValue = input.totalAssets;
            benchmarkUsed = 'Total Assets';
            percentageApplied = 1;
        } else {
            // Use PBT as base
            benchmarkValue = input.profitBeforeTax;
            benchmarkUsed = 'Profit Before Tax';
            percentageApplied = 5;  // 5% of PBT
        }

        // Adjust for PIE status
        if (input.isPIE) {
            percentageApplied *= 0.75;  // Lower materiality for PIEs
        }

        // Calculate materiality levels
        const overallMateriality = Math.round(benchmarkValue * (percentageApplied / 100));
        const performanceMateriality = Math.round(overallMateriality * 0.75);
        const trivialThreshold = Math.round(overallMateriality * 0.03);

        return {
            overallMateriality,
            performanceMateriality,
            trivialThreshold,
            benchmarkUsed,
            benchmarkValue,
            percentageApplied,
            justification: `${benchmarkUsed} selected as benchmark based on ${input.isLossmaking ? 'loss-making status' : 'profitability'}. ${percentageApplied}% applied ${input.isPIE ? '(reduced for PIE status)' : ''}.`,
        };
    }

    /**
     * Identify potential Key Audit Matters (ISA 701).
     */
    identifyKAMCandidates(input: {
        risks: RiskAssessment[];
        materiality: MaterialityCalculation;
        industry: string;
        isPIE: boolean;
    }): KeyAuditMatter[] {
        if (!input.isPIE) {
            return [];  // KAM only required for PIEs
        }

        const kams: KeyAuditMatter[] = [];

        // Significant risks are KAM candidates
        const significantRisks = input.risks.filter(r => r.significantRisk);

        for (const risk of significantRisks) {
            kams.push({
                matter: risk.accountArea,
                whyConsidered: risk.riskFactors.join('; '),
                howAddressed: risk.auditResponse.join('; '),
                relatedAccounts: [risk.accountArea],
                isaReference: 'ISA 701',
            });
        }

        // Add industry-specific KAMs
        if (input.industry === 'banking') {
            kams.push({
                matter: 'Expected Credit Loss Provision',
                whyConsidered: 'IFRS 9 ECL model involves significant management judgement',
                howAddressed: 'Engaged credit risk specialist, tested PD/LGD assumptions, challenged forward-looking scenarios',
                relatedAccounts: ['Loans and Advances', 'ECL Provision'],
                isaReference: 'ISA 540',
            });
        }

        return kams.slice(0, 5);  // Maximum 5 KAMs
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createRwandaRiskAssessmentAgent(config?: AgentConfig): RwandaRiskAssessmentAgent {
    return new RwandaRiskAssessmentAgent(config);
}

let _riskAgent: RwandaRiskAssessmentAgent | null = null;

export const rwandaRiskAssessmentAgent = {
    instance(config?: AgentConfig): RwandaRiskAssessmentAgent {
        if (!_riskAgent) {
            _riskAgent = new RwandaRiskAssessmentAgent(config);
        }
        return _riskAgent;
    },
};
