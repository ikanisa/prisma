/**
 * Rwanda Audit Opinion Agent
 * 
 * Generates ISA-compliant audit reports:
 * - Key Audit Matters (ISA 701) for PIEs
 * - Audit opinions (unqualified, qualified, adverse, disclaimer)
 * - Going concern assessments (ISA 570)
 * - Management representation letters
 * 
 * @package @prisma/accounting-rwanda
 */

import type {
    RwandaAccountingAgent,
    AgentType,
    AutonomyLevel,
    AgentContext,
    AgentResponse,
} from '../../core/base-agent.js';
import { determineReviewRequirement } from '../../core/base-agent.js';
import type { RwandaAccountingFramework, RwandaEntityClassification } from '../../types/index.js';

// ============================================================================
// AUDIT OPINION TYPES
// ============================================================================

/**
 * Audit opinion types per ISA 700/705.
 */
export type AuditOpinionType =
    | 'UNQUALIFIED'          // Clean opinion
    | 'UNQUALIFIED_EMP'      // Unqualified with Emphasis of Matter
    | 'QUALIFIED'            // Except for...
    | 'ADVERSE'              // Not present fairly
    | 'DISCLAIMER';          // Unable to obtain sufficient evidence

/**
 * Audit finding for opinion determination.
 */
export interface AuditFinding {
    id: string;
    area: string;
    description: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

    // Financial impact
    misstatementAmount?: number;
    isPervasive: boolean;
    isMaterial: boolean;

    // Classification
    type: 'MISSTATEMENT' | 'SCOPE_LIMITATION' | 'UNCERTAINTY' | 'GOING_CONCERN' | 'CONTROL_DEFICIENCY';

    // ISA reference
    isaStandard?: string;
    ifrsStandard?: string;

    // Resolution
    resolved: boolean;
    managementResponse?: string;
    auditorConclusion?: string;
}

/**
 * Key Audit Matter (ISA 701).
 */
export interface KeyAuditMatter {
    id: string;
    title: string;

    // Why it's a KAM
    whyKAM: string;
    significantRisk: boolean;
    significantJudgment: boolean;
    complexTransaction: boolean;

    // How addressed
    auditProceduresPerformed: string[];
    conclusion: string;

    // References
    ifrsStandard?: string;
    isaStandard?: string;
    financialStatementReference?: string;

    // Effort
    auditHours: number;
}

/**
 * Going concern assessment (ISA 570).
 */
export interface GoingConcernAssessment {
    hasUncertainty: boolean;
    uncertaintyLevel?: 'MATERIAL' | 'SIGNIFICANT' | 'MODERATE' | 'LOW';

    indicators: Array<{
        type: 'FINANCIAL' | 'OPERATIONAL' | 'EXTERNAL';
        description: string;
        severity: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;

    mitigatingFactors: string[];
    managementPlans: string[];

    // Conclusion
    conclusion: 'NO_MATERIAL_UNCERTAINTY' | 'MATERIAL_UNCERTAINTY_DISCLOSED' | 'MATERIAL_UNCERTAINTY_NOT_DISCLOSED' | 'INAPPROPRIATE_BASIS';

    // Report impact
    impactOnOpinion: 'NONE' | 'EMPHASIS_OF_MATTER' | 'QUALIFIED' | 'ADVERSE';
}

/**
 * Complete audit opinion/report.
 */
export interface AuditOpinionReport {
    // Header
    entityName: string;
    financialYearEnd: Date;
    reportDate: Date;
    auditorFirm: string;
    engagementPartner: string;

    // Classification
    entityClassification: RwandaEntityClassification;
    isPIE: boolean;  // Public Interest Entity - requires KAM

    // Opinion section
    opinionType: AuditOpinionType;
    opinionBasis: string;

    // KAM (for PIEs per ISA 701)
    keyAuditMatters?: KeyAuditMatter[];

    // Going concern
    goingConcernAssessment: GoingConcernAssessment;

    // Emphasis of Matter / Other Matter
    emphasisOfMatterParagraphs: string[];
    otherMatterParagraphs: string[];

    // Misstatements summary
    correctedMisstatements: number;
    uncorrectedMisstatements: number;
    aggregateMisstatementAmount: number;

    // Management responsibilities
    managementResponsibilities: string[];

    // Auditor responsibilities  
    auditorResponsibilities: string[];

    // Report text (final formatted report)
    fullReportText?: string;

    // Metadata
    materialityUsed: number;
    signatureDate: Date;
    requiresPartnerReview: boolean;
}

// ============================================================================
// AUDIT OPINION AGENT
// ============================================================================

/**
 * Rwanda Audit Opinion Agent.
 * 
 * Generates ISA-compliant audit opinions and reports.
 */
export class AuditOpinionAgent implements RwandaAccountingAgent {
    private static instance_: AuditOpinionAgent | null = null;

    readonly agentId = 'rwanda-audit-opinion-agent';
    readonly name = 'Rwanda Audit Opinion Agent';
    readonly version = '1.0.0';
    readonly agentType: AgentType = 'AUDIT';
    readonly capabilities = [
        'Determine audit opinion type (ISA 700/705)',
        'Generate Key Audit Matters (ISA 701)',
        'Assess going concern (ISA 570)',
        'Draft audit report sections',
        'Evaluate misstatement materiality',
        'Generate emphasis of matter paragraphs',
    ];
    readonly framework: RwandaAccountingFramework | 'ALL' = 'ALL';
    readonly autonomyLevel: AutonomyLevel = 2;  // Lower autonomy - critical process
    readonly supportedCurrencies = ['RWF'];

    private constructor() { }

    /**
     * Get singleton instance.
     */
    static instance(): AuditOpinionAgent {
        if (!AuditOpinionAgent.instance_) {
            AuditOpinionAgent.instance_ = new AuditOpinionAgent();
        }
        return AuditOpinionAgent.instance_;
    }

    /**
     * Determine audit opinion based on findings.
     */
    determineOpinion(
        findings: AuditFinding[],
        materialityLevel: number,
        goingConcern: GoingConcernAssessment
    ): { opinion: AuditOpinionType; basis: string; requiresKAM: boolean } {
        // Analyze material misstatements
        const materialMisstatements = findings.filter(f =>
            f.isMaterial && f.type === 'MISSTATEMENT' && !f.resolved
        );
        const pervasiveMisstatements = materialMisstatements.filter(f => f.isPervasive);

        // Analyze scope limitations
        const scopeLimitations = findings.filter(f =>
            f.type === 'SCOPE_LIMITATION' && !f.resolved
        );
        const materialScopeLimitations = scopeLimitations.filter(f => f.isMaterial);
        const pervasiveScopeLimitations = scopeLimitations.filter(f => f.isPervasive);

        // Going concern impact
        const gcIssue = goingConcern.conclusion !== 'NO_MATERIAL_UNCERTAINTY';

        // Decision tree per ISA 700/705

        // 1. Adverse opinion - pervasive material misstatements
        if (pervasiveMisstatements.length > 0) {
            return {
                opinion: 'ADVERSE',
                basis: 'Material and pervasive misstatements exist that affect the overall presentation of the financial statements.',
                requiresKAM: true,
            };
        }

        // 2. Disclaimer - pervasive scope limitation
        if (pervasiveScopeLimitations.length > 0) {
            return {
                opinion: 'DISCLAIMER',
                basis: 'Unable to obtain sufficient appropriate audit evidence due to pervasive limitations on the scope of the audit.',
                requiresKAM: false,  // No KAM when disclaiming
            };
        }

        // 3. Qualified opinion - material but not pervasive issues
        if (materialMisstatements.length > 0 || materialScopeLimitations.length > 0) {
            const reasons: string[] = [];
            if (materialMisstatements.length > 0) {
                reasons.push(`material misstatements in ${materialMisstatements.map(m => m.area).join(', ')}`);
            }
            if (materialScopeLimitations.length > 0) {
                reasons.push(`scope limitations affecting ${materialScopeLimitations.map(s => s.area).join(', ')}`);
            }

            return {
                opinion: 'QUALIFIED',
                basis: `Except for the effects of ${reasons.join(' and ')}, the financial statements present fairly.`,
                requiresKAM: true,
            };
        }

        // 4. Going concern - material uncertainty
        if (goingConcern.conclusion === 'MATERIAL_UNCERTAINTY_NOT_DISCLOSED') {
            return {
                opinion: 'QUALIFIED',
                basis: 'Material uncertainty related to going concern exists but is not adequately disclosed in the financial statements.',
                requiresKAM: true,
            };
        }

        if (goingConcern.conclusion === 'INAPPROPRIATE_BASIS') {
            return {
                opinion: 'ADVERSE',
                basis: 'The use of the going concern basis of accounting is inappropriate.',
                requiresKAM: true,
            };
        }

        // 5. Unqualified with Emphasis of Matter
        if (goingConcern.conclusion === 'MATERIAL_UNCERTAINTY_DISCLOSED') {
            return {
                opinion: 'UNQUALIFIED_EMP',
                basis: 'The financial statements present fairly. We draw attention to Note [X] which describes the material uncertainty related to going concern.',
                requiresKAM: true,
            };
        }

        // 6. Clean unqualified opinion
        return {
            opinion: 'UNQUALIFIED',
            basis: 'The financial statements present fairly, in all material respects, the financial position and financial performance in accordance with IFRS.',
            requiresKAM: true,
        };
    }

    /**
     * Generate Key Audit Matters (ISA 701).
     * Required for PIEs in Rwanda.
     */
    generateKeyAuditMatters(
        findings: AuditFinding[],
        significantRisks: string[],
        auditHoursByArea: Record<string, number>
    ): KeyAuditMatter[] {
        const kams: KeyAuditMatter[] = [];

        // Identify KAM candidates (matters of most significance)

        // 1. Significant risk areas
        for (const risk of significantRisks) {
            const relatedFindings = findings.filter(f =>
                f.area.toLowerCase().includes(risk.toLowerCase())
            );

            kams.push({
                id: `kam-${risk.toLowerCase().replace(/\s+/g, '-')}`,
                title: risk,
                whyKAM: `This matter was identified as a significant risk during our risk assessment and required significant auditor attention.`,
                significantRisk: true,
                significantJudgment: relatedFindings.some(f => f.type === 'UNCERTAINTY'),
                complexTransaction: false,
                auditProceduresPerformed: this.getDefaultProcedures(risk),
                conclusion: 'Based on our audit procedures, we found no material misstatement in this area.',
                isaStandard: 'ISA 315',
                auditHours: auditHoursByArea[risk] || 20,
            });
        }

        // 2. Areas with high judgment/estimates
        const estimateAreas = findings.filter(f =>
            f.type === 'UNCERTAINTY' && f.severity !== 'LOW'
        );

        for (const estimate of estimateAreas) {
            if (!kams.some(k => k.title.toLowerCase().includes(estimate.area.toLowerCase()))) {
                kams.push({
                    id: `kam-${estimate.id}`,
                    title: estimate.area,
                    whyKAM: `This area involves significant management judgment and estimation uncertainty, requiring substantial auditor attention.`,
                    significantRisk: false,
                    significantJudgment: true,
                    complexTransaction: false,
                    auditProceduresPerformed: [
                        'Evaluated management\'s methodology and assumptions',
                        'Tested key inputs to the estimates',
                        'Assessed sensitivity of estimates to changes in assumptions',
                        'Evaluated disclosure adequacy',
                    ],
                    conclusion: estimate.auditorConclusion || 'We found the estimates to be within an acceptable range.',
                    ifrsStandard: estimate.ifrsStandard,
                    isaStandard: 'ISA 540',
                    auditHours: auditHoursByArea[estimate.area] || 15,
                });
            }
        }

        // Rwanda-specific KAMs
        const rwandaKAMs = this.getRwandaSpecificKAMs(findings);
        kams.push(...rwandaKAMs);

        // Limit to 3-5 KAMs (typical range)
        return kams.slice(0, 5);
    }

    /**
     * Rwanda-specific Key Audit Matters.
     */
    private getRwandaSpecificKAMs(findings: AuditFinding[]): KeyAuditMatter[] {
        const kams: KeyAuditMatter[] = [];

        // Check for VAT-related issues
        const vatIssues = findings.filter(f =>
            f.area.toLowerCase().includes('vat') ||
            f.description.toLowerCase().includes('value added tax')
        );
        if (vatIssues.length > 0) {
            kams.push({
                id: 'kam-vat-compliance',
                title: 'VAT Compliance and RRA Reconciliation',
                whyKAM: 'VAT compliance in Rwanda requires reconciliation with RRA ISHEMA platform data and involves significant transaction volumes subject to 18% standard rate.',
                significantRisk: true,
                significantJudgment: false,
                complexTransaction: true,
                auditProceduresPerformed: [
                    'Reconciled VAT records to ISHEMA submissions',
                    'Tested classification of zero-rated and exempt supplies',
                    'Verified EBM invoice completeness',
                    'Reviewed VAT return filings and payments',
                ],
                conclusion: 'VAT transactions are materially recorded and reported.',
                ifrsStandard: 'IAS 1',
                isaStandard: 'ISA 250',
                auditHours: 25,
            });
        }

        // Check for RSSB issues
        const rssbIssues = findings.filter(f =>
            f.area.toLowerCase().includes('rssb') ||
            f.description.toLowerCase().includes('social security')
        );
        if (rssbIssues.length > 0) {
            kams.push({
                id: 'kam-rssb',
                title: 'RSSB Contributions Compliance',
                whyKAM: 'RSSB contributions represent a significant payroll liability with employer rates of 8.3% (6% pension + 2% hazard + 0.3% maternity) and employee deductions.',
                significantRisk: false,
                significantJudgment: false,
                complexTransaction: true,
                auditProceduresPerformed: [
                    'Recalculated RSSB contributions based on payroll records',
                    'Verified timely remittance to RSSB',
                    'Agreed contributions to RSSB statements',
                    'Tested employee deduction accuracy',
                ],
                conclusion: 'RSSB obligations are properly calculated and recorded.',
                ifrsStandard: 'IAS 19',
                isaStandard: 'ISA 315',
                auditHours: 15,
            });
        }

        return kams;
    }

    /**
     * Assess going concern (ISA 570).
     */
    assessGoingConcern(
        financials: {
            currentRatio: number;
            debtToEquity: number;
            operatingCashFlow: number;
            netIncome: number;
            workingCapital: number;
        },
        qualitativeFactors: {
            loanCovenantBreach?: boolean;
            significantLosses?: boolean;
            keyCustomerLoss?: boolean;
            regulatoryAction?: boolean;
            litigationRisk?: boolean;
        },
        managementAssessment: {
            periodCovered: number;  // months
            conclusionByManagement: 'GOING_CONCERN' | 'NOT_GOING_CONCERN';
            mitigatingActions?: string[];
        }
    ): GoingConcernAssessment {
        const indicators: GoingConcernAssessment['indicators'] = [];

        // Financial indicators
        if (financials.currentRatio < 1.0) {
            indicators.push({
                type: 'FINANCIAL',
                description: `Current ratio of ${financials.currentRatio.toFixed(2)} indicates potential liquidity issues`,
                severity: financials.currentRatio < 0.5 ? 'HIGH' : 'MEDIUM',
            });
        }

        if (financials.workingCapital < 0) {
            indicators.push({
                type: 'FINANCIAL',
                description: 'Negative working capital',
                severity: 'HIGH',
            });
        }

        if (financials.operatingCashFlow < 0 && financials.netIncome > 0) {
            indicators.push({
                type: 'FINANCIAL',
                description: 'Operating cash flow negative despite positive net income',
                severity: 'MEDIUM',
            });
        }

        if (financials.debtToEquity > 3) {
            indicators.push({
                type: 'FINANCIAL',
                description: `High debt-to-equity ratio of ${financials.debtToEquity.toFixed(2)}`,
                severity: 'MEDIUM',
            });
        }

        // Operational indicators
        if (qualitativeFactors.keyCustomerLoss) {
            indicators.push({
                type: 'OPERATIONAL',
                description: 'Loss of major customer or contract',
                severity: 'HIGH',
            });
        }

        if (qualitativeFactors.significantLosses) {
            indicators.push({
                type: 'OPERATIONAL',
                description: 'Significant operating losses in recent periods',
                severity: 'HIGH',
            });
        }

        // External indicators
        if (qualitativeFactors.loanCovenantBreach) {
            indicators.push({
                type: 'EXTERNAL',
                description: 'Breach of loan covenants',
                severity: 'HIGH',
            });
        }

        if (qualitativeFactors.regulatoryAction) {
            indicators.push({
                type: 'EXTERNAL',
                description: 'Regulatory action threatening business operations',
                severity: 'HIGH',
            });
        }

        if (qualitativeFactors.litigationRisk) {
            indicators.push({
                type: 'EXTERNAL',
                description: 'Pending litigation with potential material adverse outcome',
                severity: 'MEDIUM',
            });
        }

        // Determine conclusion
        const highSeverityCount = indicators.filter(i => i.severity === 'HIGH').length;
        const mediumSeverityCount = indicators.filter(i => i.severity === 'MEDIUM').length;

        let conclusion: GoingConcernAssessment['conclusion'];
        let uncertaintyLevel: GoingConcernAssessment['uncertaintyLevel'];
        let impactOnOpinion: GoingConcernAssessment['impactOnOpinion'];

        if (highSeverityCount >= 3 || (highSeverityCount >= 2 && mediumSeverityCount >= 2)) {
            // Material uncertainty likely exists
            uncertaintyLevel = 'MATERIAL';
            conclusion = 'MATERIAL_UNCERTAINTY_DISCLOSED';  // Assuming proper disclosure
            impactOnOpinion = 'EMPHASIS_OF_MATTER';
        } else if (highSeverityCount >= 1 || mediumSeverityCount >= 3) {
            uncertaintyLevel = 'SIGNIFICANT';
            conclusion = 'NO_MATERIAL_UNCERTAINTY';  // But close monitoring needed
            impactOnOpinion = 'NONE';
        } else if (indicators.length > 0) {
            uncertaintyLevel = 'MODERATE';
            conclusion = 'NO_MATERIAL_UNCERTAINTY';
            impactOnOpinion = 'NONE';
        } else {
            uncertaintyLevel = 'LOW';
            conclusion = 'NO_MATERIAL_UNCERTAINTY';
            impactOnOpinion = 'NONE';
        }

        return {
            hasUncertainty: uncertaintyLevel !== 'LOW',
            uncertaintyLevel,
            indicators,
            mitigatingFactors: managementAssessment.mitigatingActions || [],
            managementPlans: [],
            conclusion,
            impactOnOpinion,
        };
    }

    /**
     * Generate full audit opinion report.
     */
    async generateAuditReport(
        input: {
            entityName: string;
            financialYearEnd: Date;
            auditorFirm: string;
            engagementPartner: string;
            entityClassification: RwandaEntityClassification;
            findings: AuditFinding[];
            significantRisks: string[];
            auditHoursByArea: Record<string, number>;
            goingConcernAssessment: GoingConcernAssessment;
            materialityLevel: number;
            correctedMisstatements: number;
            uncorrectedMisstatements: number;
        },
        context: AgentContext
    ): Promise<AgentResponse<AuditOpinionReport>> {
        const startTime = Date.now();

        try {
            // Determine if PIE (requires KAM) - using the isPIE property from classification
            const isPIE = input.entityClassification.isPIE;

            // Determine opinion
            const opinionResult = this.determineOpinion(
                input.findings,
                input.materialityLevel,
                input.goingConcernAssessment
            );

            // Generate KAMs if required (PIE or modified opinion)
            let keyAuditMatters: KeyAuditMatter[] | undefined;
            if (isPIE && opinionResult.opinion !== 'DISCLAIMER') {
                keyAuditMatters = this.generateKeyAuditMatters(
                    input.findings,
                    input.significantRisks,
                    input.auditHoursByArea
                );
            }

            // Generate emphasis of matter if needed
            const emphasisOfMatterParagraphs: string[] = [];
            if (input.goingConcernAssessment.conclusion === 'MATERIAL_UNCERTAINTY_DISCLOSED') {
                emphasisOfMatterParagraphs.push(
                    'We draw attention to Note [X] in the financial statements which describes the conditions that indicate the existence of a material uncertainty that may cast significant doubt on the Company\'s ability to continue as a going concern. Our opinion is not modified in respect of this matter.'
                );
            }

            // Calculate aggregate misstatement
            const uncorrectedFindings = input.findings.filter(f =>
                f.type === 'MISSTATEMENT' && !f.resolved && f.misstatementAmount
            );
            const aggregateMisstatementAmount = uncorrectedFindings.reduce(
                (sum, f) => sum + (f.misstatementAmount || 0), 0
            );

            const report: AuditOpinionReport = {
                entityName: input.entityName,
                financialYearEnd: input.financialYearEnd,
                reportDate: new Date(),
                auditorFirm: input.auditorFirm,
                engagementPartner: input.engagementPartner,
                entityClassification: input.entityClassification,
                isPIE,
                opinionType: opinionResult.opinion,
                opinionBasis: opinionResult.basis,
                keyAuditMatters,
                goingConcernAssessment: input.goingConcernAssessment,
                emphasisOfMatterParagraphs,
                otherMatterParagraphs: [],
                correctedMisstatements: input.correctedMisstatements,
                uncorrectedMisstatements: input.uncorrectedMisstatements,
                aggregateMisstatementAmount,
                managementResponsibilities: this.getManagementResponsibilities(),
                auditorResponsibilities: this.getAuditorResponsibilities(isPIE),
                materialityUsed: input.materialityLevel,
                signatureDate: new Date(),
                requiresPartnerReview: true,  // Always requires partner sign-off
            };

            // Generate formatted report text
            report.fullReportText = this.formatReportText(report);

            return {
                success: true,
                data: report,
                confidenceScore: opinionResult.opinion === 'UNQUALIFIED' ? 0.95 : 0.85,
                requiresReview: true,  // Audit reports always require partner review
                reviewReason: 'Audit report requires engagement partner review and sign-off',
                isaStandard: 'ISA 700',
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate audit report',
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Get default audit procedures for a risk area.
     */
    private getDefaultProcedures(riskArea: string): string[] {
        const area = riskArea.toLowerCase();

        if (area.includes('revenue')) {
            return [
                'Tested revenue cutoff at period end',
                'Performed analytical review of revenue trends',
                'Tested sample of sales transactions to supporting documentation',
                'Evaluated revenue recognition policies against IFRS 15',
            ];
        }

        if (area.includes('inventory')) {
            return [
                'Observed physical inventory count',
                'Tested inventory valuation and NRV assessment',
                'Reviewed slow-moving and obsolete inventory provisions',
                'Tested inventory costing methodology',
            ];
        }

        if (area.includes('receivable')) {
            return [
                'Tested receivables aging',
                'Evaluated expected credit loss provision',
                'Performed confirmation procedures on selected balances',
                'Reviewed subsequent cash receipts',
            ];
        }

        return [
            'Performed substantive analytical procedures',
            'Tested transactions to supporting documentation',
            'Evaluated management judgments and estimates',
            'Assessed disclosure completeness',
        ];
    }

    /**
     * Standard management responsibilities (per ISA 700).
     */
    private getManagementResponsibilities(): string[] {
        return [
            'Preparation and fair presentation of the financial statements in accordance with IFRS',
            'Internal control necessary to enable preparation of financial statements free from material misstatement',
            'Assessment of the entity\'s ability to continue as a going concern',
            'Disclosure of matters related to going concern where applicable',
        ];
    }

    /**
     * Standard auditor responsibilities (per ISA 700).
     */
    private getAuditorResponsibilities(isPIE: boolean): string[] {
        const responsibilities = [
            'Obtain reasonable assurance about whether the financial statements are free from material misstatement',
            'Issue an auditor\'s report that includes our opinion',
            'Exercise professional judgment and maintain professional skepticism',
            'Identify and assess risks of material misstatement',
            'Obtain sufficient appropriate audit evidence',
            'Evaluate the appropriateness of accounting policies and estimates',
            'Conclude on the appropriateness of management\'s use of going concern',
        ];

        if (isPIE) {
            responsibilities.push(
                'Communicate Key Audit Matters as required by ISA 701'
            );
        }

        return responsibilities;
    }

    /**
     * Format complete audit report text.
     */
    private formatReportText(report: AuditOpinionReport): string {
        let text = `INDEPENDENT AUDITOR'S REPORT\n\n`;
        text += `To the Shareholders of ${report.entityName}\n\n`;

        // Opinion section
        text += `OPINION\n\n`;
        text += `We have audited the financial statements of ${report.entityName}, which comprise the statement of financial position as at ${report.financialYearEnd.toLocaleDateString()}, and the statement of comprehensive income, statement of changes in equity and statement of cash flows for the year then ended, and notes to the financial statements, including a summary of significant accounting policies.\n\n`;
        text += `${report.opinionBasis}\n\n`;

        // Basis for Opinion
        text += `BASIS FOR OPINION\n\n`;
        text += `We conducted our audit in accordance with International Standards on Auditing (ISAs). Our responsibilities under those standards are further described in the Auditor's Responsibilities for the Audit of the Financial Statements section of our report. We are independent of the Company in accordance with the ICPAR Code of Ethics, and we have fulfilled our other ethical responsibilities in accordance with these requirements. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our opinion.\n\n`;

        // Emphasis of Matter (if any)
        if (report.emphasisOfMatterParagraphs.length > 0) {
            text += `EMPHASIS OF MATTER\n\n`;
            for (const para of report.emphasisOfMatterParagraphs) {
                text += `${para}\n\n`;
            }
        }

        // Key Audit Matters (for PIEs)
        if (report.keyAuditMatters && report.keyAuditMatters.length > 0) {
            text += `KEY AUDIT MATTERS\n\n`;
            text += `Key audit matters are those matters that, in our professional judgment, were of most significance in our audit of the financial statements of the current period. These matters were addressed in the context of our audit of the financial statements as a whole, and in forming our opinion thereon, and we do not provide a separate opinion on these matters.\n\n`;

            for (const kam of report.keyAuditMatters) {
                text += `${kam.title}\n`;
                text += `Why this is a Key Audit Matter: ${kam.whyKAM}\n`;
                text += `How our audit addressed the matter:\n`;
                for (const proc of kam.auditProceduresPerformed) {
                    text += `• ${proc}\n`;
                }
                text += `\n`;
            }
        }

        // Sign-off
        text += `\n${report.auditorFirm}\n`;
        text += `${report.engagementPartner}\n`;
        text += `Engagement Partner\n\n`;
        text += `Kigali, Rwanda\n`;
        text += `${report.signatureDate.toLocaleDateString()}\n`;

        return text;
    }
}

/**
 * Factory function.
 */
export function createAuditOpinionAgent(): AuditOpinionAgent {
    return AuditOpinionAgent.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const auditOpinionAgent = {
    instance: () => AuditOpinionAgent.instance(),
};
