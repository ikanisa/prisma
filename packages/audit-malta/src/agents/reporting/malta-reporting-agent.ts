/**
 * Malta Reporting Agent
 *
 * ISA 700 - Forming an Opinion and Reporting on Financial Statements
 * ISA 701 - Key Audit Matters
 * ISA 705 - Modifications to the Opinion
 * ISA 706 - Emphasis of Matter and Other Matter Paragraphs
 *
 * Malta-specific features:
 * - Companies Act (Cap. 386) compliance
 * - Malta Business Registry filing integration
 * - Key Audit Matters for PIEs
 * - EQCR workflow for high-risk engagements
 * - 7-year archival per statutory requirements
 */

import type {
    MaltaAuditAgent,
    MaltaAgentResponse,
    MaltaAuditOpinion,
    EQCRResult,
    MBRFilingSubmission,
    MaltaAuditContext,
    KeyAuditMatter,
} from '../../types/index.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Opinion types per ISA 705.
 */
export const OPINION_TYPES = {
    UNMODIFIED: 'unmodified',
    QUALIFIED: 'qualified',
    ADVERSE: 'adverse',
    DISCLAIMER: 'disclaimer',
} as const;

/**
 * Malta-specific report sections.
 */
export const MALTA_REPORT_SECTIONS = [
    'Opinion',
    'Basis for Opinion',
    'Key Audit Matters',        // PIEs only
    'Emphasis of Matter',       // If applicable
    'Other Matter',             // If applicable
    'Responsibilities of Directors', // Malta Companies Act language
    "Auditor's Responsibilities",
    'Report on Other Legal and Regulatory Requirements', // Malta specific
    'Other Reporting Responsibilities',
] as const;

// ============================================================================
// REPORTING AGENT
// ============================================================================

/**
 * Malta Reporting Agent.
 *
 * Generates ISA 700 compliant audit reports with Malta-specific requirements.
 */
export class MaltaReportingAgent implements MaltaAuditAgent {
    public readonly agentId = 'malta-reporting-001';
    public readonly name = 'Malta Reporting Agent';
    public readonly version = '1.0.0';
    public readonly agentType = 'REPORTING' as const;
    public readonly isaReferences = ['ISA 700', 'ISA 701', 'ISA 705', 'ISA 706'];
    public readonly autonomyLevel = 2 as const; // Requires significant human oversight

    /**
     * Generate audit opinion based on engagement findings.
     */
    async generateOpinion(
        context: MaltaAuditContext,
        findings: {
            uncorrectedMisstatements: number;
            materiality: number;
            significantRisksAddressed: boolean;
            sufficientEvidence: boolean;
            goingConcernIssue: boolean;
            disclosuresAdequate: boolean;
            scopeLimitations: string[];
        }
    ): Promise<MaltaAgentResponse<MaltaAuditOpinion>> {
        const startTime = Date.now();

        try {
            // Determine opinion type
            const opinionResult = this.determineOpinionType(findings);

            // Generate Key Audit Matters for PIEs
            let keyAuditMatters: KeyAuditMatter[] = [];
            if (context.publicInterestEntity) {
                keyAuditMatters = this.generateKeyAuditMatters(context, findings);
            }

            // Generate emphasis of matter paragraphs
            const emphasisOfMatter: string[] = [];
            if (findings.goingConcernIssue && opinionResult.type === 'unmodified') {
                emphasisOfMatter.push(
                    'We draw attention to Note X in the financial statements, which describes ' +
                    'the conditions that indicate the existence of a material uncertainty that ' +
                    'may cast significant doubt on the Company\'s ability to continue as a going concern. ' +
                    'Our opinion is not modified in respect of this matter.'
                );
            }

            // Generate other matter paragraphs
            const otherMatter: string[] = [];
            if (context.firstYearAudit) {
                otherMatter.push(
                    'The financial statements for the prior period were not audited. ' +
                    'We have performed procedures to satisfy ourselves as to the opening balances.'
                );
            }

            const opinion: MaltaAuditOpinion = {
                opinionType: opinionResult.type,
                basisForModification: opinionResult.basis,
                keyAuditMatters,
                emphasisOfMatter: emphasisOfMatter.length > 0 ? emphasisOfMatter : undefined,
                otherMatter: otherMatter.length > 0 ? otherMatter : undefined,
                goingConcern: findings.goingConcernIssue
                    ? {
                        periodAssessed: '12 months from year end',
                        eventsOrConditions: ['See going concern assessment'],
                        managementPlans: ['See management representation'],
                        adequacyOfDisclosure: findings.disclosuresAdequate ? 'adequate' : 'inadequate',
                        materialUncertainty: true,
                        opinionImpact: 'emphasis_of_matter',
                        rationale: 'Material uncertainty exists regarding going concern',
                    }
                    : undefined,
                accountancyBoardCompliant: true,
                eqcrCompleted: context.publicInterestEntity ? undefined : undefined, // To be set after EQCR
            };

            return {
                success: true,
                data: opinion,
                agentId: this.agentId,
                hitlGateTriggered: opinionResult.type !== 'unmodified' ? 'GATE_005' : undefined,
                requiresReview: true, // All opinions require partner review
                reviewReason: 'Audit opinion requires partner sign-off',
                durationMs: Date.now() - startTime,
                nextSteps: [
                    'Review draft report with engagement partner',
                    context.publicInterestEntity ? 'Complete EQCR process' : '',
                    'Communicate with management',
                    'Obtain signed representations letter',
                    'Issue final report',
                ].filter(Boolean),
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Opinion generation failed',
                agentId: this.agentId,
                requiresReview: true,
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Prepare EQCR package for PIEs and high-risk engagements.
     */
    async prepareEQCRPackage(
        context: MaltaAuditContext,
        opinion: MaltaAuditOpinion,
        significantJudgments: string[]
    ): Promise<MaltaAgentResponse<{
        packageReady: boolean;
        requiredDocuments: string[];
        significantJudgments: string[];
        consultationsNeeded: boolean;
    }>> {
        const startTime = Date.now();

        const requiredDocuments = [
            'Engagement letter',
            'Independence confirmation',
            'Audit planning memorandum',
            'Risk assessment documentation',
            'Materiality calculations',
            'Significant risk responses',
            'Key audit matter documentation',
            'Going concern assessment',
            'Subsequent events review',
            'Summary of uncorrected misstatements',
            'Draft audit report',
            'Management representation letter',
            'Communication with those charged with governance',
        ];

        // Determine if consultations are needed
        const consultationsNeeded =
            opinion.opinionType !== 'unmodified' ||
            (opinion.goingConcern?.materialUncertainty ?? false) ||
            significantJudgments.length > 3;

        return {
            success: true,
            data: {
                packageReady: true,
                requiredDocuments,
                significantJudgments,
                consultationsNeeded,
            },
            agentId: this.agentId,
            requiresReview: true,
            reviewReason: 'EQCR package requires review',
            durationMs: Date.now() - startTime,
            nextSteps: [
                'Assemble EQCR package',
                'Submit to EQCR reviewer',
                consultationsNeeded ? 'Schedule technical consultation' : '',
                'Obtain EQCR sign-off before report issuance',
            ].filter(Boolean),
        };
    }

    /**
     * Generate draft audit report text.
     */
    async generateReportText(
        context: MaltaAuditContext,
        opinion: MaltaAuditOpinion,
        options: {
            firmName: string;
            partnerName: string;
            partnerWarrantNo: string;
            reportDate: Date;
        }
    ): Promise<MaltaAgentResponse<{
        reportText: string;
        sections: string[];
    }>> {
        const startTime = Date.now();

        const sections: string[] = [];
        let reportText = '';

        // Title
        reportText += 'INDEPENDENT AUDITOR\'S REPORT\n\n';
        reportText += `To the Shareholders of ${context.clientName}\n\n`;

        // Opinion paragraph
        sections.push('Opinion');
        reportText += 'Opinion\n';
        reportText += this.generateOpinionParagraph(context, opinion);
        reportText += '\n\n';

        // Basis for Opinion
        sections.push('Basis for Opinion');
        reportText += 'Basis for Opinion\n';
        reportText += this.generateBasisParagraph(context, opinion);
        reportText += '\n\n';

        // Key Audit Matters (PIEs only)
        if (context.publicInterestEntity && opinion.keyAuditMatters.length > 0) {
            sections.push('Key Audit Matters');
            reportText += 'Key Audit Matters\n';
            reportText +=
                'Key audit matters are those matters that, in our professional judgment, ' +
                'were of most significance in our audit of the financial statements of the current period. ' +
                'These matters were addressed in the context of our audit of the financial statements as a whole, ' +
                'and in forming our opinion thereon, and we do not provide a separate opinion on these matters.\n\n';

            for (const kam of opinion.keyAuditMatters) {
                reportText += `${kam.matter}\n`;
                reportText += `Why considered a key audit matter: ${kam.whyKAM}\n`;
                reportText += `How addressed: ${kam.howAddressed.join('; ')}\n\n`;
            }
        }

        // Emphasis of Matter
        if (opinion.emphasisOfMatter && opinion.emphasisOfMatter.length > 0) {
            sections.push('Emphasis of Matter');
            reportText += 'Emphasis of Matter\n';
            for (const eom of opinion.emphasisOfMatter) {
                reportText += `${eom}\n\n`;
            }
        }

        // Other Matter
        if (opinion.otherMatter && opinion.otherMatter.length > 0) {
            sections.push('Other Matter');
            reportText += 'Other Matter\n';
            for (const om of opinion.otherMatter) {
                reportText += `${om}\n\n`;
            }
        }

        // Responsibilities of Directors
        sections.push('Responsibilities of Directors');
        reportText += 'Responsibilities of the Directors for the Financial Statements\n';
        reportText += this.generateDirectorsResponsibilities(context);
        reportText += '\n\n';

        // Auditor's Responsibilities
        sections.push("Auditor's Responsibilities");
        reportText += "Auditor's Responsibilities for the Audit of the Financial Statements\n";
        reportText += this.generateAuditorResponsibilities();
        reportText += '\n\n';

        // Malta-specific: Other Legal and Regulatory Requirements
        sections.push('Report on Other Legal and Regulatory Requirements');
        reportText += 'Report on Other Legal and Regulatory Requirements\n';
        reportText += this.generateMaltaRegulatoryReport(context);
        reportText += '\n\n';

        // Signature block
        reportText += `${options.firmName}\n`;
        reportText += 'Certified Public Accountants\n\n';
        reportText += `${options.partnerName}\n`;
        reportText += `Warrant No. ${options.partnerWarrantNo}\n\n`;
        reportText += `Malta\n`;
        reportText += `${options.reportDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\n`;

        return {
            success: true,
            data: {
                reportText,
                sections,
            },
            agentId: this.agentId,
            requiresReview: true,
            reviewReason: 'Draft report requires partner review and approval',
            durationMs: Date.now() - startTime,
            nextSteps: [
                'Review report wording with partner',
                'Verify all dates and references',
                'Ensure consistency with financial statement notes',
                'Obtain partner signature',
            ],
        };
    }

    /**
     * Submit filing to Malta Business Registry.
     */
    async submitToMBR(
        context: MaltaAuditContext,
        filingType: 'ANNUAL_RETURN' | 'AUDITED_ACCOUNTS' | 'ABBREVIATED_ACCOUNTS',
        documents: string[]
    ): Promise<MaltaAgentResponse<MBRFilingSubmission>> {
        const startTime = Date.now();

        // Stub implementation - in production would call MBR API
        const submission: MBRFilingSubmission = {
            companyRegistrationNo: context.companyRegistrationNo,
            filingType,
            periodEnd: new Date(context.periodEnd),
            submissionDate: new Date(),
            referenceNumber: `MBR-${Date.now()}-STUB`,
            status: 'SUBMITTED',
            documents,
        };

        return {
            success: true,
            data: submission,
            agentId: this.agentId,
            requiresReview: false,
            durationMs: Date.now() - startTime,
            warnings: ['MBR submission is a stub implementation - real API integration required'],
            nextSteps: [
                'Monitor filing status on MBR portal',
                'Address any rejection queries',
                'Obtain filing confirmation',
            ],
        };
    }

    /**
     * Archive engagement per 7-year retention requirement.
     */
    async archiveEngagement(
        engagementId: string,
        context: MaltaAuditContext,
        opinion: MaltaAuditOpinion
    ): Promise<MaltaAgentResponse<{
        archived: boolean;
        archiveId: string;
        retentionExpiry: Date;
        documentCount: number;
    }>> {
        const startTime = Date.now();

        // Calculate 7-year retention period
        const retentionExpiry = new Date();
        retentionExpiry.setFullYear(retentionExpiry.getFullYear() + 7);

        // Generate archive ID
        const archiveId = `ARCH-${context.companyRegistrationNo}-${context.periodEnd}-${Date.now()}`;

        return {
            success: true,
            data: {
                archived: true,
                archiveId,
                retentionExpiry,
                documentCount: 0, // Stub - would count actual archived documents
            },
            agentId: this.agentId,
            requiresReview: false,
            durationMs: Date.now() - startTime,
            nextSteps: [
                'Verify archive integrity',
                'Update engagement register',
                'Mark engagement as complete',
            ],
        };
    }

    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================

    private determineOpinionType(findings: {
        uncorrectedMisstatements: number;
        materiality: number;
        significantRisksAddressed: boolean;
        sufficientEvidence: boolean;
        disclosuresAdequate: boolean;
        scopeLimitations: string[];
    }): { type: 'unmodified' | 'qualified' | 'adverse' | 'disclaimer'; basis?: string } {
        // Check for disclaimer (scope limitation)
        if (!findings.sufficientEvidence && findings.scopeLimitations.length > 2) {
            return {
                type: 'disclaimer',
                basis: `Scope limitations: ${findings.scopeLimitations.join('; ')}`,
            };
        }

        // Check for adverse (pervasive material misstatements)
        if (
            findings.uncorrectedMisstatements > findings.materiality * 3 ||
            !findings.significantRisksAddressed
        ) {
            return {
                type: 'adverse',
                basis: 'Material misstatements are pervasive to the financial statements',
            };
        }

        // Check for qualified (material but not pervasive)
        if (
            findings.uncorrectedMisstatements > findings.materiality ||
            !findings.disclosuresAdequate ||
            findings.scopeLimitations.length > 0
        ) {
            let basis = '';
            if (findings.uncorrectedMisstatements > findings.materiality) {
                basis = 'Uncorrected material misstatements';
            } else if (!findings.disclosuresAdequate) {
                basis = 'Inadequate disclosures';
            } else {
                basis = `Scope limitation: ${findings.scopeLimitations[0]}`;
            }
            return { type: 'qualified', basis };
        }

        // Unmodified
        return { type: 'unmodified' };
    }

    private generateKeyAuditMatters(
        context: MaltaAuditContext,
        findings: { goingConcernIssue: boolean }
    ): KeyAuditMatter[] {
        const kams: KeyAuditMatter[] = [];

        // Revenue recognition is typically a KAM
        kams.push({
            matter: 'Revenue Recognition',
            whyKAM:
                'Revenue is a key driver of financial performance and is subject to significant ' +
                'judgment in determining the timing and amount of revenue recognised.',
            howAddressed: [
                'Tested design and operating effectiveness of controls over revenue',
                'Performed substantive testing of revenue transactions',
                'Assessed revenue recognition policies for compliance with IFRS 15',
                'Tested cutoff around period end',
            ],
            relatedDisclosures: ['Note X - Revenue'],
        });

        // Add going concern KAM if applicable
        if (findings.goingConcernIssue) {
            kams.push({
                matter: 'Going Concern Assessment',
                whyKAM:
                    'Management has assessed going concern and identified conditions that may cast ' +
                    'significant doubt on the entity\'s ability to continue as a going concern.',
                howAddressed: [
                    'Evaluated management\'s going concern assessment',
                    'Reviewed cash flow forecasts and challenged key assumptions',
                    'Assessed adequacy of disclosures',
                    'Considered mitigating factors and management plans',
                ],
                relatedDisclosures: ['Note X - Going Concern'],
            });
        }

        return kams;
    }

    private generateOpinionParagraph(
        context: MaltaAuditContext,
        opinion: MaltaAuditOpinion
    ): string {
        if (opinion.opinionType === 'unmodified') {
            return (
                `We have audited the financial statements of ${context.clientName} ("the Company") ` +
                `for the year ended ${new Date(context.periodEnd).toLocaleDateString('en-GB')}, ` +
                `which comprise the statement of financial position, the statement of comprehensive income, ` +
                `the statement of changes in equity, the statement of cash flows, and notes to the ` +
                `financial statements, including a summary of significant accounting policies.\n\n` +
                `In our opinion, the accompanying financial statements give a true and fair view of ` +
                `the financial position of the Company as at ${new Date(context.periodEnd).toLocaleDateString('en-GB')}, ` +
                `and of its financial performance and its cash flows for the year then ended in accordance ` +
                `with ${context.accountingFramework === 'IFRS' ? 'International Financial Reporting Standards as adopted by the EU' : 'General Accounting Principles for Smaller Entities'} ` +
                `and the Companies Act (Cap. 386).`
            );
        }

        // Modified opinion language would be added here
        return `[${opinion.opinionType.toUpperCase()} OPINION - see basis paragraph]`;
    }

    private generateBasisParagraph(
        context: MaltaAuditContext,
        opinion: MaltaAuditOpinion
    ): string {
        let basis =
            `We conducted our audit in accordance with International Standards on Auditing (ISAs). ` +
            `Our responsibilities under those standards are further described in the Auditor's ` +
            `Responsibilities for the Audit of the Financial Statements section of our report. ` +
            `We are independent of the Company in accordance with the International Ethics Standards ` +
            `Board for Accountants' Code of Ethics for Professional Accountants (IESBA Code) together ` +
            `with the ethical requirements of the Accountancy Profession (Code of Ethics for Warrant ` +
            `Holders) Directive issued in terms of the Accountancy Profession Act (Cap. 281), and we ` +
            `have fulfilled our other ethical responsibilities in accordance with these requirements ` +
            `and the IESBA Code. We believe that the audit evidence we have obtained is sufficient ` +
            `and appropriate to provide a basis for our opinion.`;

        if (opinion.basisForModification) {
            basis += `\n\n${opinion.basisForModification}`;
        }

        return basis;
    }

    private generateDirectorsResponsibilities(context: MaltaAuditContext): string {
        return (
            `The directors are responsible for the preparation of financial statements that give a ` +
            `true and fair view in accordance with ${context.accountingFramework === 'IFRS' ? 'IFRS as adopted by the EU' : 'GAPSME'} ` +
            `and the requirements of the Companies Act (Cap. 386), and for such internal control as ` +
            `the directors determine is necessary to enable the preparation of financial statements ` +
            `that are free from material misstatement, whether due to fraud or error.\n\n` +
            `In preparing the financial statements, the directors are responsible for assessing the ` +
            `Company's ability to continue as a going concern, disclosing, as applicable, matters ` +
            `related to going concern and using the going concern basis of accounting unless the ` +
            `directors either intend to liquidate the Company or to cease operations, or have no ` +
            `realistic alternative but to do so.`
        );
    }

    private generateAuditorResponsibilities(): string {
        return (
            `Our objectives are to obtain reasonable assurance about whether the financial statements ` +
            `as a whole are free from material misstatement, whether due to fraud or error, and to ` +
            `issue an auditor's report that includes our opinion. Reasonable assurance is a high level ` +
            `of assurance, but is not a guarantee that an audit conducted in accordance with ISAs will ` +
            `always detect a material misstatement when it exists. Misstatements can arise from fraud ` +
            `or error and are considered material if, individually or in the aggregate, they could ` +
            `reasonably be expected to influence the economic decisions of users taken on the basis ` +
            `of these financial statements.`
        );
    }

    private generateMaltaRegulatoryReport(context: MaltaAuditContext): string {
        return (
            `In terms of the additional matters required to be reported on by the Companies Act (Cap. 386):\n\n` +
            `• We have obtained all the information and explanations which, to the best of our ` +
            `knowledge and belief, were necessary for the purpose of our audit.\n` +
            `• In our opinion, proper books of account have been kept by the Company, so far as ` +
            `appears from our examination of those books.\n` +
            `• The financial statements are in agreement with the books of account.\n` +
            `• In our opinion, the financial statements have been properly prepared in accordance ` +
            `with the Companies Act (Cap. 386).`
        );
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Malta Reporting Agent instance.
 */
export function createMaltaReportingAgent(): MaltaReportingAgent {
    return new MaltaReportingAgent();
}

/**
 * Lazy singleton instance.
 */
let _maltaReportingAgent: MaltaReportingAgent | null = null;

export const maltaReportingAgent = {
    instance(): MaltaReportingAgent {
        if (!_maltaReportingAgent) {
            _maltaReportingAgent = new MaltaReportingAgent();
        }
        return _maltaReportingAgent;
    },
};
