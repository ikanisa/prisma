/**
 * Agent 020: Engagement Quality Reviewer
 * ISQM 2 - Engagement Quality Reviews
 */

import type { AgentConfig, AgentRequest, AgentResponse } from '../types';

export const QUALITY_REVIEW_AGENT_CONFIG: AgentConfig = {
  id: 'audit-quality-020',
  name: 'Engagement Quality Reviewer',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Performs engagement quality reviews per ISQM 2, ensuring audit quality and standards compliance',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an Engagement Quality Reviewer responsible for independent evaluation per ISQM 2.

EQR REQUIREMENTS:
1. ELIGIBILITY - Independence, Competence, Time availability
2. REVIEW SCOPE - Significant risks, Significant judgments, Conclusions on independence, Going concern, Deficiencies, Opinion appropriateness
3. DOCUMENTATION - Procedures performed, Conclusions reached, Unresolved matters, Completion date
4. COMPLETION TIMING - Before audit report release, Resolution of all significant matters

EVALUATION CRITERIA:
- Professional skepticism
- Audit evidence sufficiency
- Estimation methodology
- Disclosure completeness
- ISA compliance`;

export interface QualityReviewRequest extends AgentRequest {
  task: 'review_significant_judgments' | 'review_independence' | 'review_opinion';
  parameters: {
    significantJudgments?: Array<{
      area: string;
      judgment: string;
      rationale: string;
    }>;
    opinionType?: 'unmodified' | 'qualified' | 'adverse' | 'disclaimer';
    basis?: string;
  };
}

export async function reviewSignificantJudgments(
  judgments: Array<{ area: string; judgment: string; rationale: string }>
): Promise<AgentResponse<{ approved: boolean; comments: string[] }>> {
  const comments: string[] = [];
  let approved = true;

  for (const judgment of judgments) {
    if (!judgment.rationale || judgment.rationale.length < 50) {
      comments.push(`${judgment.area}: Rationale insufficiently documented - require detailed explanation`);
      approved = false;
    }

    if (judgment.area.toLowerCase().includes('going concern') && !judgment.rationale.includes('12 months')) {
      comments.push(`${judgment.area}: Going concern assessment should explicitly state 12-month period`);
      approved = false;
    }

    if (judgment.area.toLowerCase().includes('materiality') && !judgment.rationale.includes('%')) {
      comments.push(`${judgment.area}: Materiality judgment should include percentage and benchmark`);
      approved = false;
    }
  }

  if (approved) {
    comments.push('All significant judgments appropriately documented and supported');
  }

  return {
    success: true,
    data: { approved, comments },
    nextSteps: approved
      ? ['Proceed with EQR sign-off']
      : ['Address EQR comments', 'Re-submit for review', 'Do not issue audit report until resolved'],
  };
}

export async function reviewIndependence(): Promise<AgentResponse<{ independent: boolean; issues: string[] }>> {
  const issues: string[] = [];

  // In production, this would integrate with independence database
  const independent = issues.length === 0;

  return {
    success: true,
    data: { independent, issues },
    nextSteps: independent
      ? ['Document independence conclusion']
      : ['Resolve independence issues before report issuance', 'Escalate to firm leadership'],
  };
}

export async function reviewOpinionAppropriate(
  opinionType: string,
  basis: string
): Promise<AgentResponse<{ appropriate: boolean; recommendation: string }>> {
  let appropriate = true;
  let recommendation = 'Opinion type supported by audit evidence and conclusions';

  if (opinionType !== 'unmodified' && (!basis || basis.length < 100)) {
    appropriate = false;
    recommendation = 'Basis for modification requires more detailed documentation';
  }

  if (opinionType === 'adverse' && basis.includes('except for')) {
    appropriate = false;
    recommendation = 'Adverse opinion should not include "except for" language - use qualified opinion instead';
  }

  if (opinionType === 'disclaimer' && !basis.includes('unable to obtain')) {
    appropriate = false;
    recommendation = 'Disclaimer of opinion requires clear statement of scope limitation';
  }

  return {
    success: true,
    data: { appropriate, recommendation },
    warnings: !appropriate ? ['Opinion type or basis requires revision'] : undefined,
    nextSteps: appropriate
      ? ['Complete EQR documentation', 'Authorize report issuance']
      : ['Revise opinion or basis', 'Re-submit for EQR'],
  };
}

export async function handleQualityReviewRequest(request: QualityReviewRequest): Promise<AgentResponse<any>> {
  const { task, parameters } = request;

  switch (task) {
    case 'review_significant_judgments':
      if (!parameters.significantJudgments || parameters.significantJudgments.length === 0) {
        return { success: false, error: 'Significant judgments required for review' };
      }
      return await reviewSignificantJudgments(parameters.significantJudgments);

    case 'review_independence':
      return await reviewIndependence();

    case 'review_opinion':
      if (!parameters.opinionType || !parameters.basis) {
        return { success: false, error: 'Opinion type and basis required' };
      }
      return await reviewOpinionAppropriate(parameters.opinionType, parameters.basis);

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
