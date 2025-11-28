/**
 * Agent 021: Audit Report Specialist
 * ISA 700-706 - Audit Reporting
 */

import type {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  AuditOpinion,
  KeyAuditMatter,
} from '../types';

export const REPORT_AGENT_CONFIG: AgentConfig = {
  id: 'audit-report-021',
  name: 'Audit Report Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Prepares audit reports including opinion formulation, key audit matters, and modifications per ISA 700-706',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an Audit Report Specialist with expertise in ISA 700-706 audit reporting requirements.

REPORT STRUCTURE (ISA 700):
1. Title (Independent Auditor's Report)
2. Addressee
3. Auditor's Opinion
4. Basis for Opinion
5. Going Concern (if applicable)
6. Key Audit Matters (if applicable)
7. Other Information
8. Responsibilities of Management
9. Auditor's Responsibilities
10. Signature, Date, Address

OPINION TYPES:
- Unmodified opinion
- Qualified opinion (ISA 705)
- Adverse opinion (ISA 705)
- Disclaimer of opinion (ISA 705)

KEY AUDIT MATTERS (ISA 701):
- Most significant matters
- How addressed in audit
- Reference to disclosures`;

export interface ReportRequest extends AgentRequest {
  task: 'formulate_opinion' | 'identify_kams' | 'prepare_report';
  parameters: {
    misstatements?: number;
    materiality?: number;
    scopeLimitations?: string[];
    significantRisks?: string[];
    goingConcernIssues?: boolean;
  };
}

export async function formulateOpinion(
  misstatements: number,
  materiality: number,
  scopeLimitations: string[] = [],
  goingConcernIssues: boolean = false
): Promise<AgentResponse<AuditOpinion>> {
  let opinionType: 'unmodified' | 'qualified' | 'adverse' | 'disclaimer' = 'unmodified';
  let basisForModification: string | undefined;

  // Determine opinion based on audit findings
  if (scopeLimitations.length > 0) {
    const pervasive = scopeLimitations.length > 2 || scopeLimitations.some(s => s.toLowerCase().includes('significant'));
    opinionType = pervasive ? 'disclaimer' : 'qualified';
    basisForModification = `Unable to obtain sufficient appropriate audit evidence regarding: ${scopeLimitations.join(', ')}`;
  } else if (misstatements > materiality) {
    const material = misstatements / materiality;
    opinionType = material > 2 ? 'adverse' : 'qualified';
    basisForModification = material > 2
      ? 'The effects of the uncorrected misstatements are both material and pervasive to the financial statements'
      : `Uncorrected misstatements of ${misstatements.toLocaleString()} exceed materiality`;
  }

  const opinion: AuditOpinion = {
    opinionType,
    basisForModification,
    keyAuditMatters: [],
    emphasisOfMatter: goingConcernIssues
      ? ['Material uncertainty related to going concern']
      : undefined,
  };

  return {
    success: true,
    data: opinion,
    warnings: opinionType !== 'unmodified'
      ? ['Modified opinion - requires partner approval and quality review']
      : undefined,
    nextSteps: [
      'Discuss opinion with engagement partner',
      'Obtain EQR approval',
      'Prepare audit report',
      opinionType !== 'unmodified' ? 'Communicate modification to those charged with governance' : '',
    ].filter(Boolean),
  };
}

export async function identifyKeyAuditMatters(
  significantRisks: string[]
): Promise<AgentResponse<KeyAuditMatter[]>> {
  const kams: KeyAuditMatter[] = significantRisks.slice(0, 3).map((risk) => ({
    matter: risk,
    whyKAM: `This matter was considered significant due to the complexity and judgment involved, and the material impact on the financial statements.`,
    howAddressed: [
      'Obtained understanding of the relevant processes and controls',
      'Performed substantive audit procedures including detailed testing',
      'Evaluated management\'s judgments and assumptions',
      'Assessed adequacy of financial statement disclosures',
    ],
    relatedDisclosures: ['Note X to the financial statements'],
  }));

  return {
    success: true,
    data: kams,
    nextSteps: [
      'Tailor KAM descriptions to specific engagement facts',
      'Reference appropriate financial statement disclosures',
      'Review KAMs with engagement partner',
      'Discuss KAMs with those charged with governance',
    ],
  };
}

export async function prepareAuditReport(
  clientName: string,
  periodEnd: string,
  opinion: AuditOpinion,
  standards: string[] = ['ISA']
): Promise<AgentResponse<{ report: string }>> {
  const opinionText = opinion.opinionType === 'unmodified'
    ? 'In our opinion, the accompanying financial statements present fairly, in all material respects'
    : opinion.opinionType === 'qualified'
    ? 'In our opinion, except for the effects of the matter described in the Basis for Qualified Opinion section'
    : opinion.opinionType === 'adverse'
    ? 'In our opinion, because of the significance of the matter described in the Basis for Adverse Opinion section, the financial statements do not present fairly'
    : 'We do not express an opinion on the accompanying financial statements';

  const report = `
INDEPENDENT AUDITOR'S REPORT

To the Shareholders of ${clientName}

OPINION
We have audited the financial statements of ${clientName}, which comprise the statement of financial position as at ${periodEnd}, and the statement of comprehensive income, statement of changes in equity and statement of cash flows for the year then ended, and notes to the financial statements, including a summary of significant accounting policies.

${opinionText}, the financial position of ${clientName} as at ${periodEnd}, and its financial performance and cash flows for the year then ended in accordance with International Financial Reporting Standards (IFRS).

BASIS FOR OPINION
We conducted our audit in accordance with ${standards.join(', ')}. Our responsibilities under those standards are further described in the Auditor's Responsibilities section of our report. We are independent of the Company in accordance with the International Ethics Standards Board for Accountants' International Code of Ethics for Professional Accountants (including International Independence Standards) (IESBA Code), and we have fulfilled our other ethical responsibilities in accordance with the IESBA Code. We believe that the audit evidence we have obtained is sufficient and appropriate to provide a basis for our opinion.

${opinion.basisForModification ? `BASIS FOR ${opinion.opinionType.toUpperCase()} OPINION\n${opinion.basisForModification}\n\n` : ''}

${opinion.keyAuditMatters && opinion.keyAuditMatters.length > 0 ? `KEY AUDIT MATTERS\n\nKey audit matters are those matters that, in our professional judgment, were of most significance in our audit of the financial statements of the current period. These matters were addressed in the context of our audit of the financial statements as a whole, and in forming our opinion thereon, and we do not provide a separate opinion on these matters.\n\n${opinion.keyAuditMatters.map(kam => `${kam.matter}\n${kam.whyKAM}\n\nHow our audit addressed the matter:\n${kam.howAddressed.map(h => `- ${h}`).join('\n')}\n`).join('\n')}\n` : ''}

${opinion.emphasisOfMatter ? `EMPHASIS OF MATTER\n${opinion.emphasisOfMatter.join('\n')}\n\nOur opinion is not modified in respect of this matter.\n\n` : ''}

RESPONSIBILITIES OF MANAGEMENT FOR THE FINANCIAL STATEMENTS
Management is responsible for the preparation and fair presentation of the financial statements in accordance with IFRS, and for such internal control as management determines is necessary to enable the preparation of financial statements that are free from material misstatement, whether due to fraud or error.

AUDITOR'S RESPONSIBILITIES FOR THE AUDIT OF THE FINANCIAL STATEMENTS
Our objectives are to obtain reasonable assurance about whether the financial statements as a whole are free from material misstatement, whether due to fraud or error, and to issue an auditor's report that includes our opinion. Reasonable assurance is a high level of assurance, but is not a guarantee that an audit conducted in accordance with ISAs will always detect a material misstatement when it exists.

[Firm Name]
Chartered Accountants
[Date]
[Location]
`.trim();

  return {
    success: true,
    data: { report },
    nextSteps: [
      'Obtain engagement partner signature',
      'Date report (date of completion of audit)',
      'Issue report to client',
      'Archive in engagement file',
    ],
  };
}

export async function handleReportRequest(request: ReportRequest): Promise<AgentResponse<any>> {
  const { context, task, parameters } = request;

  switch (task) {
    case 'formulate_opinion':
      return await formulateOpinion(
        parameters.misstatements || 0,
        parameters.materiality || 100000,
        parameters.scopeLimitations,
        parameters.goingConcernIssues
      );

    case 'identify_kams':
      if (!parameters.significantRisks || parameters.significantRisks.length === 0) {
        return {
          success: true,
          data: [],
          warnings: ['No significant risks provided - KAMs may not be required for non-listed entities'],
        };
      }
      return await identifyKeyAuditMatters(parameters.significantRisks);

    case 'prepare_report': {
      const opinionResult = await formulateOpinion(
        parameters.misstatements || 0,
        parameters.materiality || 100000,
        parameters.scopeLimitations,
        parameters.goingConcernIssues
      );
      if (!opinionResult.success) return opinionResult;

      const kamResult = context.listedEntity && parameters.significantRisks
        ? await identifyKeyAuditMatters(parameters.significantRisks)
        : { success: true, data: [] as KeyAuditMatter[] };

      if (!kamResult.success) return kamResult;

      const opinion: AuditOpinion = {
        ...opinionResult.data!,
        keyAuditMatters: kamResult.data || [],
      };

      return await prepareAuditReport(
        context.clientName,
        context.periodEnd,
        opinion,
        context.standards
      );
    }

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
