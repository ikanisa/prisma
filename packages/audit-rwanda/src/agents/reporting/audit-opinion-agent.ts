/**
 * Rwanda Audit Opinion Agent
 * 
 * Generates ISA-compliant audit reports:
 * - Audit opinions (unqualified, qualified, adverse, disclaimer)
 * - Key Audit Matters (ISA 701) for PIEs
 * - Going concern assessments (ISA 570)
 * - Management letter points
 * 
 * ISA Standards: 700, 701, 705, 706, 570
 * 
 * @package @prisma/audit-rwanda
 */

import {
    RiskLevel,
    OpinionType,
} from '../../types/index.js';

import type {
    RwandaAuditAgent,
    AgentConfig,
    KeyAuditMatter,
    AuditFinding,
    AuditReport,
    GoingConcernAssessment,
} from '../../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface AuditOpinionInput {
    entityName: string;
    fiscalYearEnd: Date;
    auditorFirmName: string;
    engagementPartner: string;
    icparNumber: string;
    isPublicInterestEntity: boolean;
    findings: AuditFinding[];
    goingConcernAssessment: GoingConcernAssessment;
    materialityLevel: number;
    correctedMisstatements: number;
    uncorrectedMisstatements: number;
    significantRisks?: string[];
    auditHoursByArea?: Record<string, number>;
}

export interface OpinionDetermination {
    opinionType: OpinionType;
    basisForOpinion: string;
    requiresKAM: boolean;
    emphasisOfMatter?: string[];
    otherMatter?: string[];
}

// ============================================================================
// AUDIT OPINION AGENT
// ============================================================================

export class RwandaAuditOpinionAgent implements RwandaAuditAgent {
    public readonly name = 'Rwanda Audit Opinion Agent';
    public readonly version = '1.0.0';
    public readonly category = 'audit' as const;
    public readonly jurisdiction = 'RW' as const;

    constructor(_config: AgentConfig = {}) { }

    getCapabilities(): string[] {
        return [
            'Audit opinion determination (ISA 700/705)',
            'Key Audit Matters generation (ISA 701)',
            'Going concern paragraph (ISA 570)',
            'Emphasis of Matter paragraphs (ISA 706)',
            'Full audit report generation',
            'Rwanda/ICPAR regulatory compliance',
        ];
    }

    /**
     * Determine appropriate audit opinion based on findings.
     */
    determineOpinion(input: {
        findings: AuditFinding[];
        materialityLevel: number;
        goingConcernAssessment: GoingConcernAssessment;
    }): OpinionDetermination {
        const { findings, materialityLevel, goingConcernAssessment } = input;

        // Separate findings by type
        const materialMisstatements = findings.filter(f =>
            f.status !== 'resolved' &&
            (f.severity === RiskLevel.HIGH || f.severity === RiskLevel.CRITICAL)
        );

        const scopeLimitations = findings.filter(f =>
            f.description.toLowerCase().includes('scope limitation') ||
            f.description.toLowerCase().includes('unable to obtain')
        );

        // Check for pervasive issues
        const hasPervasive = materialMisstatements.some(f =>
            f.severity === RiskLevel.CRITICAL
        );

        // Determine opinion
        let opinionType: OpinionType;
        let basisForOpinion: string;
        const emphasisOfMatter: string[] = [];

        // Going concern impacts opinion
        if (goingConcernAssessment.conclusion === 'significant_doubt' &&
            goingConcernAssessment.managementPlans.length === 0) {
            opinionType = OpinionType.ADVERSE;
            basisForOpinion = 'The entity\'s use of the going concern basis of accounting is inappropriate.';
        } else if (scopeLimitations.length > 0 && hasPervasive) {
            opinionType = OpinionType.DISCLAIMER;
            basisForOpinion = 'We were unable to obtain sufficient appropriate audit evidence. The possible effects are material and pervasive.';
        } else if (materialMisstatements.length > 0 && hasPervasive) {
            opinionType = OpinionType.ADVERSE;
            basisForOpinion = 'The misstatements are material and pervasive to the financial statements.';
        } else if (scopeLimitations.length > 0 || materialMisstatements.length > 0) {
            opinionType = OpinionType.QUALIFIED;
            basisForOpinion = scopeLimitations.length > 0
                ? 'We were unable to obtain sufficient appropriate audit evidence regarding certain matters.'
                : 'The financial statements are materially misstated in respect of certain matters.';
        } else {
            opinionType = OpinionType.UNMODIFIED;
            basisForOpinion = 'We conducted our audit in accordance with International Standards on Auditing (ISAs). Our responsibilities under those standards are further described in the Auditor\'s Responsibilities section.';
        }

        // Going concern emphasis
        if (goingConcernAssessment.conclusion === 'material_uncertainty') {
            emphasisOfMatter.push(
                'We draw attention to Note X in the financial statements, which indicates that the entity incurred conditions that may cast significant doubt on the entity\'s ability to continue as a going concern.'
            );
        }

        return {
            opinionType,
            basisForOpinion,
            requiresKAM: opinionType === OpinionType.UNMODIFIED, // KAM only for unmodified/qualified
            emphasisOfMatter: emphasisOfMatter.length > 0 ? emphasisOfMatter : undefined,
        };
    }

    /**
     * Generate Key Audit Matters (ISA 701).
     */
    generateKeyAuditMatters(input: {
        findings: AuditFinding[];
        significantRisks: string[];
        auditHoursByArea: Record<string, number>;
        isPublicInterestEntity: boolean;
    }): KeyAuditMatter[] {
        if (!input.isPublicInterestEntity) {
            return []; // KAM only required for PIEs
        }

        const kams: KeyAuditMatter[] = [];

        // High-risk findings become KAM candidates
        const highRiskFindings = input.findings.filter(f =>
            f.severity === RiskLevel.HIGH || f.severity === RiskLevel.CRITICAL
        );

        for (const finding of highRiskFindings.slice(0, 3)) {
            kams.push({
                matter: finding.description.split('.')[0],
                whyConsidered: `This matter required significant auditor attention due to ${finding.severity === RiskLevel.CRITICAL ? 'critical' : 'high'} risk assessment.`,
                howAddressed: finding.recommendation || 'We performed extended substantive procedures and obtained additional audit evidence.',
                relatedAccounts: [],
                isaReference: 'ISA 315',
            });
        }

        // Significant risks become KAMs
        for (const risk of input.significantRisks.slice(0, 2)) {
            if (!kams.some(k => k.matter.toLowerCase().includes(risk.toLowerCase()))) {
                kams.push({
                    matter: risk,
                    whyConsidered: 'Identified as a significant risk during risk assessment.',
                    howAddressed: 'Applied risk-based audit procedures tailored to the specific risk characteristics.',
                    relatedAccounts: [],
                    isaReference: 'ISA 315',
                });
            }
        }

        // Rwanda-specific KAMs
        if (input.auditHoursByArea['revenue'] && input.auditHoursByArea['revenue'] > 50) {
            if (!kams.some(k => k.matter.toLowerCase().includes('revenue'))) {
                kams.push({
                    matter: 'Revenue Recognition',
                    whyConsidered: 'Revenue is a presumed fraud risk per ISA 240 and required significant audit attention.',
                    howAddressed: 'Performed detailed revenue testing, cut-off procedures, and contract reviews. Validated EBM invoices to ISHEMA.',
                    relatedAccounts: ['Revenue', 'Trade Receivables'],
                    isaReference: 'ISA 240',
                });
            }
        }

        return kams.slice(0, 5); // Maximum 5 KAMs
    }

    /**
     * Generate full audit report.
     */
    generateAuditReport(input: AuditOpinionInput): AuditReport {
        // Determine opinion
        const opinion = this.determineOpinion({
            findings: input.findings,
            materialityLevel: input.materialityLevel,
            goingConcernAssessment: input.goingConcernAssessment,
        });

        // Generate KAMs
        const kams = this.generateKeyAuditMatters({
            findings: input.findings,
            significantRisks: input.significantRisks || [],
            auditHoursByArea: input.auditHoursByArea || {},
            isPublicInterestEntity: input.isPublicInterestEntity,
        });

        // Generate opinion paragraph
        const opinionParagraph = this.formatOpinionParagraph(opinion.opinionType, input.entityName);

        // Going concern paragraph
        const goingConcernParagraph = input.goingConcernAssessment.conclusion !== 'no_uncertainty'
            ? this.formatGoingConcernParagraph(input.goingConcernAssessment)
            : undefined;

        // Responsibilities paragraphs
        const managementResponsibilities = this.getManagementResponsibilities();
        const auditorResponsibilities = this.getAuditorResponsibilities(input.isPublicInterestEntity);

        return {
            reportId: this.generateReportId(input.entityName),
            entityName: input.entityName,
            fiscalYearEnd: input.fiscalYearEnd,
            reportDate: new Date(),
            opinionType: opinion.opinionType,
            opinionParagraph,
            basisForOpinion: opinion.basisForOpinion,
            goingConcernParagraph,
            keyAuditMatters: kams.length > 0 ? kams : undefined,
            emphasisOfMatter: opinion.emphasisOfMatter,
            otherInformation: 'Management is responsible for the other information. Our opinion does not cover the other information.',
            responsibilitiesOfManagement: managementResponsibilities,
            auditorResponsibilities,
            auditorSignature: input.engagementPartner,
            auditorFirmName: input.auditorFirmName,
            icparNumber: input.icparNumber,
        };
    }

    /**
     * Format opinion paragraph.
     */
    private formatOpinionParagraph(opinionType: OpinionType, entityName: string): string {
        switch (opinionType) {
            case OpinionType.UNMODIFIED:
                return `In our opinion, the accompanying financial statements present fairly, in all material respects, the financial position of ${entityName} as at year end, and its financial performance and cash flows for the year then ended in accordance with International Financial Reporting Standards and the requirements of the Companies Act of Rwanda.`;

            case OpinionType.QUALIFIED:
                return `In our opinion, except for the effects of the matter described in the Basis for Qualified Opinion section, the financial statements present fairly, in all material respects, the financial position of ${entityName} as at year end.`;

            case OpinionType.ADVERSE:
                return `In our opinion, because of the significance of the matter described in the Basis for Adverse Opinion section, the financial statements do not present fairly the financial position of ${entityName} as at year end.`;

            case OpinionType.DISCLAIMER:
                return `Because of the significance of the matter described in the Basis for Disclaimer of Opinion section, we have not been able to obtain sufficient appropriate audit evidence to provide a basis for an audit opinion.`;
        }
    }

    /**
     * Format going concern paragraph.
     */
    private formatGoingConcernParagraph(assessment: GoingConcernAssessment): string {
        if (assessment.conclusion === 'material_uncertainty') {
            return `We draw attention to Note [X] in the financial statements, which describes the principal conditions that raise significant doubt about the entity's ability to continue as a going concern. These events or conditions indicate that a material uncertainty exists that may cast significant doubt on the entity's ability to continue as a going concern. Our opinion is not modified in respect of this matter.`;
        } else if (assessment.conclusion === 'significant_doubt') {
            return `The entity has been unable to refinance borrowings when they fall due, and management has determined that it is not appropriate to prepare the financial statements on a going concern basis. Accordingly, the financial statements have been prepared on a liquidation basis.`;
        }
        return '';
    }

    /**
     * Get management responsibilities.
     */
    private getManagementResponsibilities(): string {
        return 'Management is responsible for the preparation and fair presentation of the financial statements in accordance with IFRSs, and for such internal control as management determines is necessary to enable the preparation of financial statements that are free from material misstatement, whether due to fraud or error.';
    }

    /**
     * Get auditor responsibilities.
     */
    private getAuditorResponsibilities(isPIE: boolean): string {
        let responsibilities = 'Our objectives are to obtain reasonable assurance about whether the financial statements as a whole are free from material misstatement, whether due to fraud or error, and to issue an auditor\'s report that includes our opinion.';

        if (isPIE) {
            responsibilities += ' We also communicate with those charged with governance regarding the planned scope and timing of the audit and significant audit findings, including any significant deficiencies in internal control that we identify.';
        }

        return responsibilities;
    }

    /**
     * Generate report ID.
     */
    private generateReportId(entityName: string): string {
        const year = new Date().getFullYear();
        const prefix = entityName.substring(0, 3).toUpperCase();
        return `RW-RPT-${prefix}-${year}-${Date.now().toString(36).toUpperCase()}`;
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createRwandaAuditOpinionAgent(config?: AgentConfig): RwandaAuditOpinionAgent {
    return new RwandaAuditOpinionAgent(config);
}

let _opinionAgent: RwandaAuditOpinionAgent | null = null;

export const rwandaAuditOpinionAgent = {
    instance(config?: AgentConfig): RwandaAuditOpinionAgent {
        if (!_opinionAgent) {
            _opinionAgent = new RwandaAuditOpinionAgent(config);
        }
        return _opinionAgent;
    },
};
