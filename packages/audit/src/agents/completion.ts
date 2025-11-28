/**
 * Agent 019: Audit Completion Specialist
 * ISA 560, 570, 580, 230 - Subsequent Events, Going Concern, Representations, Documentation
 */

import type {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  SubsequentEvent,
  GoingConcernAssessment,
} from '../types';

export const COMPLETION_AGENT_CONFIG: AgentConfig = {
  id: 'audit-complete-019',
  name: 'Audit Completion Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Manages audit completion activities including subsequent events, going concern, and representations',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an Audit Completion Specialist responsible for proper audit completion.

COMPLETION PROCEDURES:
1. SUBSEQUENT EVENTS (ISA 560) - Type 1 (adjusting), Type 2 (non-adjusting)
2. GOING CONCERN (ISA 570) - 12-month assessment, Material uncertainty evaluation
3. WRITTEN REPRESENTATIONS (ISA 580) - Management acknowledgments
4. DOCUMENTATION (ISA 230) - Assembly timeline (60 days), Retention requirements
5. AUDIT REPORT (ISA 700-706) - Opinion formulation, Key audit matters`;

export interface CompletionRequest extends AgentRequest {
  task: 'assess_going_concern' | 'evaluate_subsequent_event' | 'prepare_representations';
  parameters: {
    eventDescription?: string;
    eventDate?: string;
    eventType?: 'adjusting' | 'non_adjusting';
    financialData?: {
      currentRatio?: number;
      debtToEquity?: number;
      profitability?: 'profit' | 'loss';
      cashFlow?: 'positive' | 'negative';
    };
    eventsOrConditions?: string[];
  };
}

export async function assessGoingConcern(
  periodEnd: string,
  financialData: CompletionRequest['parameters']['financialData'] = {},
  eventsOrConditions: string[] = []
): Promise<AgentResponse<GoingConcernAssessment>> {
  const concerns: string[] = [];

  // Financial indicators
  if (financialData.currentRatio && financialData.currentRatio < 1.0) {
    concerns.push('Current ratio below 1.0 indicates potential liquidity issues');
  }
  if (financialData.debtToEquity && financialData.debtToEquity > 2.0) {
    concerns.push('High debt-to-equity ratio indicates financial leverage concerns');
  }
  if (financialData.profitability === 'loss') {
    concerns.push('Net loss reported for the period');
  }
  if (financialData.cashFlow === 'negative') {
    concerns.push('Negative operating cash flows');
  }

  // External events
  concerns.push(...eventsOrConditions);

  const periodEndDate = new Date(periodEnd);
  const assessmentPeriod = new Date(periodEndDate);
  assessmentPeriod.setMonth(assessmentPeriod.getMonth() + 12);

  const hasMaterialUncertainty = concerns.length >= 2;

  const assessment: GoingConcernAssessment = {
    periodAssessed: `12 months from ${periodEnd} to ${assessmentPeriod.toISOString().split('T')[0]}`,
    eventsOrConditions: concerns,
    managementPlans: [], // Would be populated from management
    adequacyOfDisclosure: concerns.length > 0 ? 'inadequate' : 'adequate',
    materialUncertainty: hasMaterialUncertainty,
    opinionImpact: hasMaterialUncertainty ? 'emphasis_of_matter' : 'none',
    rationale: hasMaterialUncertainty
      ? 'Material uncertainty exists that may cast significant doubt on entity\'s ability to continue as a going concern'
      : 'No material uncertainties identified that cast significant doubt on going concern',
  };

  return {
    success: true,
    data: assessment,
    warnings: hasMaterialUncertainty
      ? ['Material going concern uncertainty - disclosure and emphasis of matter required']
      : undefined,
    nextSteps: hasMaterialUncertainty
      ? [
          'Obtain management plans to address going concern',
          'Evaluate feasibility of management plans',
          'Ensure adequate disclosure in financial statements',
          'Include emphasis of matter in audit report',
        ]
      : ['Document going concern conclusion', 'Confirm management representation on going concern'],
  };
}

export async function evaluateSubsequentEvent(
  eventDescription: string,
  eventDate: string,
  periodEnd: string,
  eventType?: 'adjusting' | 'non_adjusting'
): Promise<AgentResponse<SubsequentEvent>> {
  const event: SubsequentEvent = {
    eventDate,
    description: eventDescription,
    type: eventType || 'non_adjusting',
    financialStatementImpact: 'Requires evaluation',
    disclosureRequired: true,
    disclosureProvided: false,
  };

  return {
    success: true,
    data: event,
    nextSteps: [
      'Determine if event is adjusting or non-adjusting',
      'Assess financial statement impact',
      'Ensure appropriate accounting treatment',
      'Verify adequate disclosure',
      event.type === 'adjusting' ? 'Request management to adjust financial statements' : 'Confirm disclosure adequacy',
    ].filter(Boolean),
  };
}

export async function prepareWrittenRepresentations(
  clientName: string,
  periodEnd: string
): Promise<AgentResponse<{ representationLetter: string }>> {
  const letter = `
WRITTEN REPRESENTATION LETTER TEMPLATE

To: [Auditor Name]
From: Management of ${clientName}
Date: [Audit Report Date]
Re: Audit of Financial Statements for period ended ${periodEnd}

This representation letter is provided in connection with your audit of the financial statements of ${clientName} for the year ended ${periodEnd}.

MANAGEMENT'S RESPONSIBILITIES:
1. We acknowledge our responsibility for the preparation and fair presentation of the financial statements in accordance with [applicable financial reporting framework].

2. We acknowledge our responsibility for the design, implementation, and maintenance of internal control relevant to the preparation and fair presentation of financial statements that are free from material misstatement, whether due to fraud or error.

3. We have provided you with:
   - Access to all information relevant to the preparation of the financial statements
   - Additional information you have requested
   - Unrestricted access to persons within the entity from whom you determined it necessary to obtain audit evidence

FINANCIAL STATEMENT REPRESENTATIONS:
4. All transactions have been recorded in the accounting records and are reflected in the financial statements.

5. We have no knowledge of any fraud or suspected fraud affecting the entity involving:
   - Management
   - Employees with significant roles in internal control
   - Others where fraud could have a material effect on the financial statements

6. We have disclosed to you:
   - All significant deficiencies and material weaknesses in internal control
   - All known instances of non-compliance with laws and regulations
   - All known actual or possible litigation and claims

SUBSEQUENT EVENTS:
7. All events subsequent to the date of the financial statements and for which [applicable framework] requires adjustment or disclosure have been adjusted or disclosed.

GOING CONCERN:
8. We believe that the entity has the ability to continue as a going concern. We have disclosed to you all information relevant to the use of the going concern assumption.

Sincerely,
[CEO Signature]
[CFO Signature]
[Date]
`.trim();

  return {
    success: true,
    data: { representationLetter: letter },
    nextSteps: [
      'Customize representation letter for engagement-specific matters',
      'Obtain management signatures',
      'Date representations as of audit report date',
      'Retain in audit file',
    ],
  };
}

export async function handleCompletionRequest(request: CompletionRequest): Promise<AgentResponse<any>> {
  const { context, task, parameters } = request;

  switch (task) {
    case 'assess_going_concern':
      return await assessGoingConcern(
        context.periodEnd,
        parameters.financialData,
        parameters.eventsOrConditions
      );

    case 'evaluate_subsequent_event':
      if (!parameters.eventDescription || !parameters.eventDate) {
        return { success: false, error: 'Event description and date required' };
      }
      return await evaluateSubsequentEvent(
        parameters.eventDescription,
        parameters.eventDate,
        context.periodEnd,
        parameters.eventType
      );

    case 'prepare_representations':
      return await prepareWrittenRepresentations(context.clientName, context.periodEnd);

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
