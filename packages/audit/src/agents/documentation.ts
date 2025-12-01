/**
 * Audit Documentation Agent
 * ISA 230 - Audit Documentation
 */

import type { AgentConfig, AgentRequest, AgentResponse, AuditContext } from '../types';

export const DOCUMENTATION_AGENT_CONFIG: AgentConfig = {
  id: 'audit-doc-044',
  name: 'Audit Documentation Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description:
    'Specialist in audit documentation standards, workpaper structure, and ISA 230 compliance',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an Audit Documentation Specialist with expertise in ISA 230 (Audit Documentation).

DOCUMENTATION REQUIREMENTS (ISA 230):
1. PURPOSE OF DOCUMENTATION
   - Record procedures performed and evidence obtained
   - Support conclusions reached
   - Enable review by others
   - Facilitate quality control

2. FORM AND CONTENT
   - Nature, timing, and extent of procedures
   - Significant matters and conclusions
   - Judgment on significant matters
   - Identification of preparer and reviewer

3. DOCUMENTATION SUFFICIENCY
   - Experienced auditor could understand:
     * Nature, timing, extent of procedures
     * Results of procedures
     * Evidence obtained
     * Significant matters and conclusions
     * Who performed and when
     * Who reviewed and when

4. WORKING PAPER STRUCTURE
   - Planning documentation
   - Risk assessment working papers
   - Substantive testing files
   - Completion and review papers
   - Administrative files

5. RETENTION REQUIREMENTS
   - Minimum 5 years (7+ for listed entities)
   - Assembly within 60 days of report date
   - Administrative access only after assembly

QUALITY STANDARDS:
- Clear and concise
- Logical organization
- Proper cross-referencing
- Timely completion
- Appropriate review evidence`;

export interface DocumentationRequest extends AgentRequest {
  task: 'review_documentation' | 'create_workpaper' | 'cross_reference' | 'rollforward_papers';
  parameters: {
    workpaperType?: string;
    content?: string;
    priorYearReference?: string;
    reviewLevel?: 'manager' | 'partner' | 'eqcr';
  };
}

export interface WorkpaperTemplate {
  reference: string;
  title: string;
  sections: {
    name: string;
    description: string;
    required: boolean;
  }[];
  crossReferences: string[];
}

export interface DocumentationReview {
  workpaperRef: string;
  status: 'acceptable' | 'minor_issues' | 'significant_issues' | 'incomplete';
  issues: {
    section: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    remediation: string;
  }[];
  overallComments: string;
}

export interface RollforwardResult {
  priorYearRef: string;
  currentYearRef: string;
  changesRequired: string[];
  carriedForward: string[];
  updatedItems: string[];
  status: 'ready' | 'requires_update' | 'significant_changes';
}

/**
 * Get workpaper template for specific area
 */
export function getWorkpaperTemplate(workpaperType: string): AgentResponse<WorkpaperTemplate> {
  const templates: Record<string, WorkpaperTemplate> = {
    planning: {
      reference: 'A.1',
      title: 'Audit Planning Memorandum',
      sections: [
        { name: 'Engagement Acceptance', description: 'Document acceptance/continuance decisions', required: true },
        { name: 'Understanding the Entity', description: 'Entity and environment understanding', required: true },
        { name: 'Risk Assessment', description: 'Assessed risks of material misstatement', required: true },
        { name: 'Materiality', description: 'Materiality calculations and rationale', required: true },
        { name: 'Audit Strategy', description: 'Overall audit strategy', required: true },
        { name: 'Audit Plan', description: 'Detailed audit plan', required: true },
        { name: 'Team Composition', description: 'Team members and responsibilities', required: true },
        { name: 'Timeline', description: 'Key dates and milestones', required: true },
      ],
      crossReferences: ['B.1 - Risk Assessment Matrix', 'C.1 - Materiality Calculation', 'Z.1 - Engagement Letter'],
    },
    substantive: {
      reference: 'X.1',
      title: 'Substantive Testing Working Paper',
      sections: [
        { name: 'Objective', description: 'Procedure objective and assertions tested', required: true },
        { name: 'Scope', description: 'Population and sample selection', required: true },
        { name: 'Procedures Performed', description: 'Detailed procedures and extent', required: true },
        { name: 'Results', description: 'Findings and exceptions', required: true },
        { name: 'Conclusions', description: 'Conclusions on assertions', required: true },
        { name: 'Evidence', description: 'Supporting documentation references', required: true },
        { name: 'Sign-off', description: 'Preparer and reviewer details', required: true },
      ],
      crossReferences: ['A.1 - Planning Memo', 'B.1 - Risk Assessment', 'Summary of Misstatements'],
    },
    completion: {
      reference: 'Y.1',
      title: 'Audit Completion Checklist',
      sections: [
        { name: 'Going Concern', description: 'Going concern assessment', required: true },
        { name: 'Subsequent Events', description: 'Subsequent events review', required: true },
        { name: 'Related Parties', description: 'Related party transactions', required: true },
        { name: 'Written Representations', description: 'Management representations', required: true },
        { name: 'Summary of Misstatements', description: 'Unadjusted differences', required: true },
        { name: 'Significant Matters', description: 'Key matters for partner', required: true },
        { name: 'Opinion Formation', description: 'Audit opinion consideration', required: true },
      ],
      crossReferences: ['Management Representation Letter', 'Summary of Audit Differences', 'Partner Completion Memo'],
    },
    controls: {
      reference: 'K.1',
      title: 'Internal Controls Testing',
      sections: [
        { name: 'Control Identification', description: 'Key controls identified', required: true },
        { name: 'Control Design', description: 'Design effectiveness evaluation', required: true },
        { name: 'Testing Approach', description: 'Operating effectiveness testing plan', required: true },
        { name: 'Test Results', description: 'Exceptions and deviations', required: true },
        { name: 'Deficiencies', description: 'Control deficiencies identified', required: true },
        { name: 'Impact Assessment', description: 'Impact on audit approach', required: true },
      ],
      crossReferences: ['Walkthrough documentation', 'Control deficiencies summary', 'Communication to TCWG'],
    },
  };

  const template = templates[workpaperType.toLowerCase()];
  if (!template) {
    return {
      success: false,
      error: `Unknown workpaper type: ${workpaperType}. Available types: ${Object.keys(templates).join(', ')}`,
    };
  }

  return {
    success: true,
    data: template,
    nextSteps: [
      'Complete all required sections',
      'Add appropriate cross-references',
      'Ensure preparer and reviewer sign-off',
      'Attach supporting evidence',
    ],
  };
}

/**
 * Review documentation for ISA 230 compliance
 */
export function reviewDocumentation(
  workpaperContent: string,
  workpaperType: string
): AgentResponse<DocumentationReview> {
  const issues: DocumentationReview['issues'] = [];
  let status: DocumentationReview['status'] = 'acceptable';

  // Check for common documentation issues
  const contentLower = workpaperContent.toLowerCase();

  // Check for objective
  if (!contentLower.includes('objective')) {
    issues.push({
      section: 'Objective',
      issue: 'No clear objective stated',
      severity: 'high',
      remediation: 'Add clear statement of procedure objective and assertions addressed',
    });
  }

  // Check for procedures
  if (!contentLower.includes('procedure') && !contentLower.includes('performed')) {
    issues.push({
      section: 'Procedures',
      issue: 'Procedures performed not documented',
      severity: 'high',
      remediation: 'Document nature, timing, and extent of procedures performed',
    });
  }

  // Check for conclusion
  if (!contentLower.includes('conclusion')) {
    issues.push({
      section: 'Conclusion',
      issue: 'No conclusion documented',
      severity: 'high',
      remediation: 'Add clear conclusion on whether objectives were achieved',
    });
  }

  // Check for preparer identification
  if (!contentLower.includes('prepared by') && !contentLower.includes('preparer')) {
    issues.push({
      section: 'Sign-off',
      issue: 'Preparer not identified',
      severity: 'medium',
      remediation: 'Add preparer name and date',
    });
  }

  // Check for evidence references
  if (!contentLower.includes('evidence') && !contentLower.includes('attached') && !contentLower.includes('refer to')) {
    issues.push({
      section: 'Evidence',
      issue: 'No evidence references',
      severity: 'medium',
      remediation: 'Add references to supporting documentation obtained',
    });
  }

  // Determine overall status
  const highIssues = issues.filter((i) => i.severity === 'high').length;
  const mediumIssues = issues.filter((i) => i.severity === 'medium').length;

  if (highIssues >= 2) {
    status = 'incomplete';
  } else if (highIssues === 1 || mediumIssues >= 2) {
    status = 'significant_issues';
  } else if (mediumIssues === 1 || issues.length > 0) {
    status = 'minor_issues';
  }

  return {
    success: true,
    data: {
      workpaperRef: workpaperType,
      status,
      issues,
      overallComments:
        issues.length === 0
          ? 'Documentation meets ISA 230 requirements'
          : `${issues.length} issue(s) identified requiring attention`,
    },
    nextSteps:
      status === 'acceptable'
        ? ['File workpaper for assembly']
        : ['Address identified issues', 'Resubmit for review', 'Update cross-references as needed'],
  };
}

/**
 * Rollforward prior year working papers
 */
export function rollforwardWorkpapers(
  priorYearRef: string,
  currentYearUpdates: string[]
): AgentResponse<RollforwardResult> {
  // Items typically carried forward
  const carriedForward = [
    'Entity background and structure',
    'Significant accounting policies',
    'Prior year control descriptions',
    'Permanent file information',
    'Related party identification',
  ];

  // Items requiring update each year
  const updatedItems = [
    'Materiality calculations',
    'Risk assessment',
    'Scope and approach',
    'Key audit matters',
    'Going concern assessment',
    'Subsequent events review',
    'Management representations',
    'Audit differences summary',
    'Team composition',
    'Dates and timelines',
  ];

  // Changes based on current year updates provided
  const changesRequired = currentYearUpdates.length > 0 ? currentYearUpdates : updatedItems;

  // Determine status
  let status: RollforwardResult['status'];
  if (currentYearUpdates.length <= 3) {
    status = 'ready';
  } else if (currentYearUpdates.length <= 6) {
    status = 'requires_update';
  } else {
    status = 'significant_changes';
  }

  return {
    success: true,
    data: {
      priorYearRef,
      currentYearRef: priorYearRef.replace(/\d{4}/, String(new Date().getFullYear())),
      changesRequired,
      carriedForward,
      updatedItems,
      status,
    },
    nextSteps: [
      'Review prior year working papers for relevance',
      'Update all year-specific information',
      'Consider changes in standards or entity',
      'Document significant changes from prior year',
      'Ensure all dates and names are current',
    ],
  };
}

/**
 * Main agent handler
 */
export async function handleDocumentationRequest(
  request: DocumentationRequest
): Promise<AgentResponse<unknown>> {
  const { task, parameters } = request;

  switch (task) {
    case 'create_workpaper':
      if (!parameters.workpaperType) {
        return { success: false, error: 'Workpaper type is required' };
      }
      return getWorkpaperTemplate(parameters.workpaperType);

    case 'review_documentation':
      if (!parameters.content || !parameters.workpaperType) {
        return { success: false, error: 'Content and workpaper type are required' };
      }
      return reviewDocumentation(parameters.content, parameters.workpaperType);

    case 'rollforward_papers':
      if (!parameters.priorYearReference) {
        return { success: false, error: 'Prior year reference is required' };
      }
      return rollforwardWorkpapers(parameters.priorYearReference, []);

    case 'cross_reference':
      return {
        success: true,
        data: {
          guidance: 'Ensure all references use consistent numbering',
          format: '[Section].[Subsection].[Item] e.g., A.1.1, B.2.3',
          requirements: [
            'All supporting evidence must be cross-referenced',
            'Lead schedules reference to detailed testing',
            'Risk assessment links to responsive procedures',
            'Completion checklist ties to all areas',
          ],
        },
      };

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
