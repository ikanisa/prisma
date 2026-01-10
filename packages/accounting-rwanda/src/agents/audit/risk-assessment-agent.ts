/**
 * Rwanda Audit Risk Assessment Agent
 * 
 * ISA 315-based risk assessment with Rwanda-specific factors.
 * Includes materiality calculation using Big Four methodology.
 * 
 * @package @prisma/accounting-rwanda
 */

import type {
    RwandaAccountingAgent,
    AgentType,
    AutonomyLevel,
} from '../../core/base-agent.js';
import type {
    RwandaAccountingFramework,
    RiskAssessment,
    RiskLevel,
    MaterialityCalculation,
    KeyAuditMatter,
    AuditAnomaly,
    ISAStandard,
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
    isaReference: ISAStandard;
}>> = {
    banking: [
        { risk: 'BNR prudential ratio compliance', impact: 'HIGH', isaReference: 'ISA_570' },
        { risk: 'IFRS 9 ECL model accuracy', impact: 'HIGH', isaReference: 'ISA_540' },
        { risk: 'FX exposure (USD, EUR, KES)', impact: 'NORMAL', isaReference: 'ISA_540' },
    ],
    telecom: [
        { risk: 'Digital Services Tax (DST) compliance', impact: 'NORMAL', isaReference: 'ISA_250' },
        { risk: 'Excise duty on telephone communication', impact: 'NORMAL', isaReference: 'ISA_250' },
    ],
    manufacturing: [
        { risk: 'EAC/AfCFTA customs valuation', impact: 'HIGH', isaReference: 'ISA_250' },
        { risk: 'VAT zero-rating documentation', impact: 'NORMAL', isaReference: 'ISA_500' },
    ],
    hospitality: [
        { risk: 'Tourism tax (3%) collection', impact: 'NORMAL', isaReference: 'ISA_250' },
        { risk: 'VAT on room charges', impact: 'LOW', isaReference: 'ISA_250' },
    ],
    services: [
        { risk: 'Withholding tax on services (15%)', impact: 'NORMAL', isaReference: 'ISA_250' },
        { risk: 'RSSB contribution compliance', impact: 'NORMAL', isaReference: 'ISA_250' },
    ],
};

// ============================================================================
// AUDIT RISK AGENT
// ============================================================================

/**
 * Rwanda Audit Risk Assessment Agent.
 */
export class AuditRiskAgent implements RwandaAccountingAgent {
    private static instance_: AuditRiskAgent | null = null;

    readonly agentId = 'rwanda-audit-risk-agent';
    readonly name = 'Rwanda Audit Risk Assessment Agent';
    readonly version = '1.0.0';
    readonly agentType: AgentType = 'AUDIT';
    readonly capabilities = [
        'ISA 315 risk assessment',
        'Rwanda-specific risk identification',
        'Materiality calculation (Big Four methodology)',
        'Industry risk analysis',
        'BNR compliance risk for banks',
        'RRA compliance risk assessment',
        'ISA 701 KAM identification',
    ];
    readonly framework: RwandaAccountingFramework | 'ALL' = 'ALL';
    readonly autonomyLevel: AutonomyLevel = 3;
    readonly supportedCurrencies = ['RWF'];

    private constructor() { }

    /**
     * Get singleton instance.
     */
    static instance(): AuditRiskAgent {
        if (!AuditRiskAgent.instance_) {
            AuditRiskAgent.instance_ = new AuditRiskAgent();
        }
        return AuditRiskAgent.instance_;
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
                area: input.industry,
                description: ir.risk,
                inherentRisk: ir.impact,
                controlRisk: 'NORMAL',
                detectionRisk: 'NORMAL',
                overallRisk: ir.impact,
                isaReference: ir.isaReference,
                rwandaSpecific: true,
            });
        }

        // Revenue recognition risk (ISA 240 presumed risk)
        risks.push({
            area: 'Revenue Recognition',
            description: 'Revenue is a presumed fraud risk per ISA 240',
            inherentRisk: 'SIGNIFICANT',
            controlRisk: 'HIGH',
            detectionRisk: 'LOW',
            overallRisk: 'SIGNIFICANT',
            isaReference: 'ISA_240',
        });

        // Management override of controls (ISA 240 presumed risk)
        risks.push({
            area: 'Management Override',
            description: 'Management override of controls is a presumed fraud risk',
            inherentRisk: 'SIGNIFICANT',
            controlRisk: 'HIGH',
            detectionRisk: 'LOW',
            overallRisk: 'SIGNIFICANT',
            isaReference: 'ISA_240',
        });

        // BNR regulated entities
        if (input.isBNRRegulated) {
            risks.push({
                area: 'BNR Prudential Compliance',
                description: 'Compliance with BNR capital adequacy and other prudential requirements',
                inherentRisk: 'HIGH',
                controlRisk: 'NORMAL',
                detectionRisk: 'NORMAL',
                overallRisk: 'HIGH',
                isaReference: 'ISA_250',
                bneComplianceRisk: true,
            });
        }

        // Related party transactions
        if (input.hasRelatedPartyTransactions) {
            risks.push({
                area: 'Related Party Transactions',
                description: 'Disclosure and arm\'s length pricing of related party transactions',
                inherentRisk: 'HIGH',
                controlRisk: 'HIGH',
                detectionRisk: 'NORMAL',
                overallRisk: 'HIGH',
                isaReference: 'ISA_550' as ISAStandard,
            });
        }

        // Significant estimates
        if (input.hasSignificantEstimates) {
            risks.push({
                area: 'Accounting Estimates',
                description: 'Significant judgement in accounting estimates (e.g., ECL, provisions)',
                inherentRisk: 'HIGH',
                controlRisk: 'NORMAL',
                detectionRisk: 'NORMAL',
                overallRisk: 'HIGH',
                isaReference: 'ISA_540',
            });
        }

        // First year audit
        if (input.isFirstYearAudit) {
            risks.push({
                area: 'Opening Balances',
                description: 'First year audit - opening balances require additional procedures',
                inherentRisk: 'NORMAL',
                controlRisk: 'NORMAL',
                detectionRisk: 'LOW',
                overallRisk: 'NORMAL',
                isaReference: 'ISA_510' as ISAStandard,
            });
        }

        // Tax compliance risks (always relevant in Rwanda)
        risks.push({
            area: 'RRA Tax Compliance',
            description: 'VAT, CIT, PAYE, and RSSB compliance per RRA requirements',
            inherentRisk: 'NORMAL',
            controlRisk: 'NORMAL',
            detectionRisk: 'NORMAL',
            overallRisk: 'NORMAL',
            isaReference: 'ISA_250',
            rraComplianceRisk: true,
            rwandaSpecific: true,
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
        let base: number;
        let baseType: 'TOTAL_ASSETS' | 'PBT' | 'REVENUE' | 'EQUITY';
        let percentage: number;

        // Determine appropriate base
        if (input.isLossmaking || input.profitBeforeTax <= 0) {
            // Use total assets for loss-making entities
            base = input.totalAssets;
            baseType = 'TOTAL_ASSETS';
            percentage = 0.01;  // 1% of total assets
        } else if (input.profitBeforeTax < input.totalAssets * 0.05) {
            // Low profit margin - use total assets
            base = input.totalAssets;
            baseType = 'TOTAL_ASSETS';
            percentage = 0.01;
        } else {
            // Use PBT as base
            base = input.profitBeforeTax;
            baseType = 'PBT';
            percentage = 0.05;  // 5% of PBT
        }

        // Adjust for PIE status
        if (input.isPIE) {
            percentage *= 0.75;  // Lower materiality for PIEs
        }

        // Calculate materiality levels
        const overallMateriality = Math.round(base * percentage);
        const performanceMateriality = Math.round(overallMateriality * 0.75);
        const clearlyTrivial = Math.round(overallMateriality * 0.03);

        // Specific materiality for sensitive items
        const specificMateriality = {
            relatedPartyTransactions: Math.round(overallMateriality * 0.25),
            directorRemuneration: Math.round(overallMateriality * 0.10),
            taxProvisions: Math.round(overallMateriality * 0.50),
            rssbContributions: Math.round(overallMateriality * 0.10),
        };

        return {
            overallMateriality,
            performanceMateriality,
            clearlyTrivial,
            base,
            baseType,
            percentage,
            specificMateriality,
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
        const significantRisks = input.risks.filter(r => r.overallRisk === 'SIGNIFICANT');

        for (const risk of significantRisks) {
            kams.push({
                id: `kam-${risk.area.toLowerCase().replace(/\s+/g, '-')}`,
                title: risk.area,
                whyKAM: risk.description,
                howAddressed: this.getKAMProcedure(risk.area),
                isaReference: risk.isaReference,
                managementJudgmentLevel: risk.inherentRisk === 'SIGNIFICANT' ? 'HIGH' : 'MEDIUM',
            });
        }

        // Add industry-specific KAMs
        if (input.industry === 'banking') {
            kams.push({
                id: 'kam-ecl-provision',
                title: 'Expected Credit Loss Provision',
                whyKAM: 'IFRS 9 ECL model involves significant management judgement',
                howAddressed: 'Engaged credit risk specialist, tested PD/LGD assumptions, challenged forward-looking scenarios',
                ifrsReference: 'IFRS 9',
                isaReference: 'ISA_540',
                managementJudgmentLevel: 'HIGH',
            });
        }

        return kams.slice(0, 5);  // Maximum 5 KAMs
    }

    /**
     * Get standard audit procedure for KAM area.
     */
    private getKAMProcedure(area: string): string {
        const procedures: Record<string, string> = {
            'Revenue Recognition': 'Performed detailed testing of revenue transactions, tested cut-off at period end, verified supporting contracts and delivery evidence',
            'Management Override': 'Tested journal entries, reviewed accounting estimates for bias, evaluated business rationale for significant transactions',
            'Related Party Transactions': 'Obtained management representation, verified arm\'s length pricing, confirmed disclosure completeness',
            'Accounting Estimates': 'Challenged key assumptions, performed sensitivity analysis, involved internal specialists where applicable',
        };

        return procedures[area] || 'Applied risk-based audit procedures tailored to the specific risk characteristics';
    }
}

/**
 * Factory function.
 */
export function createAuditRiskAgent(): AuditRiskAgent {
    return AuditRiskAgent.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const auditRiskAgent = {
    instance: () => AuditRiskAgent.instance(),
};
