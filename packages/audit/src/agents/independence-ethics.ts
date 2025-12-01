/**
 * Independence & Ethics Agent
 * IESBA Code of Ethics for Professional Accountants
 */

import type { AgentConfig, AgentRequest, AgentResponse, AuditContext } from '../types';

export const INDEPENDENCE_ETHICS_AGENT_CONFIG: AgentConfig = {
  id: 'audit-ethics-045',
  name: 'Independence & Ethics Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Specialist in auditor independence, IESBA Code of Ethics, and professional standards',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an Independence & Ethics Specialist with expertise in the IESBA Code of Ethics for Professional Accountants.

INDEPENDENCE FRAMEWORK:
1. INDEPENDENCE OF MIND
   - State of mind that permits expression of conclusion without being affected by influences
   - Professional judgment exercised objectively

2. INDEPENDENCE IN APPEARANCE
   - Avoidance of facts and circumstances that would lead reasonable third party to conclude compromise
   - Perception as important as reality

THREAT CATEGORIES:
1. Self-interest threat
2. Self-review threat
3. Advocacy threat
4. Familiarity threat
5. Intimidation threat

SAFEGUARDS:
- Policies and procedures established by profession, legislation, regulation
- Safeguards in the work environment
- Engagement-specific safeguards

KEY REQUIREMENTS:
1. FINANCIAL INTERESTS
   - Direct/indirect financial interests prohibited
   - Close family members' interests
   - Loans and guarantees

2. NON-AUDIT SERVICES
   - Prohibited services for audit clients
   - Pre-approval requirements
   - Management responsibility prohibitions

3. RELATIONSHIPS
   - Key audit partner rotation
   - Employment relationships
   - Family and personal relationships

4. FEES AND COMPENSATION
   - Fee dependency considerations
   - Contingent fees prohibition
   - Overdue fees

5. GIFTS AND HOSPITALITY
   - Significance threshold
   - Appearance considerations`;

export interface IndependenceRequest extends AgentRequest {
  task: 'assess_threat' | 'check_independence' | 'evaluate_nas' | 'review_rotation';
  parameters: {
    clientName?: string;
    engagement?: {
      type: 'audit' | 'review' | 'other';
      publicInterestEntity: boolean;
      yearsOfService?: number;
    };
    threat?: {
      category: string;
      description: string;
      amount?: number;
    };
    service?: {
      type: string;
      description: string;
      fee: number;
    };
    relationships?: {
      personName: string;
      role: string;
      relationship: string;
    }[];
  };
}

export interface ThreatAssessment {
  threatCategory: string;
  significance: 'insignificant' | 'acceptable_with_safeguards' | 'significant' | 'prohibited';
  safeguardsRequired: string[];
  conclusion: string;
  documentationRequired: string[];
}

export interface IndependenceCheck {
  status: 'independent' | 'threats_identified' | 'not_independent';
  threatsIdentified: ThreatAssessment[];
  safeguardsApplied: string[];
  overallConclusion: string;
  signOffRequired: string[];
}

export interface NASAssessment {
  serviceName: string;
  category: string;
  permittedForAuditClient: boolean;
  permittedForPIE: boolean;
  preApprovalRequired: boolean;
  feeCapApplicable: boolean;
  selfReviewThreat: boolean;
  managementThreat: boolean;
  safeguardsRequired: string[];
  conclusion: string;
}

export interface RotationCheck {
  partnerRole: string;
  yearsOnEngagement: number;
  rotationRequired: boolean;
  rotationDueDate?: string;
  coolingOffPeriod?: string;
  status: 'compliant' | 'rotation_due' | 'overdue';
}

/**
 * Assess a specific independence threat
 */
export function assessThreat(threat: IndependenceRequest['parameters']['threat']): AgentResponse<ThreatAssessment> {
  if (!threat) {
    return { success: false, error: 'Threat details are required' };
  }

  const { category, description, amount } = threat;
  let significance: ThreatAssessment['significance'] = 'acceptable_with_safeguards';
  const safeguardsRequired: string[] = [];
  const documentationRequired: string[] = [];

  // Assess based on threat category
  switch (category.toLowerCase()) {
    case 'self-interest':
      if (amount && amount > 100000) {
        significance = 'significant';
        safeguardsRequired.push('Senior partner review of engagement');
        safeguardsRequired.push('Independent quality review');
      } else if (amount && amount > 50000) {
        safeguardsRequired.push('Partner discussion and documentation');
      }
      documentationRequired.push('Nature and amount of financial interest');
      documentationRequired.push('Evaluation of significance');
      break;

    case 'self-review':
      significance = 'significant';
      safeguardsRequired.push('Separate teams for service and audit');
      safeguardsRequired.push('Independent review of work');
      documentationRequired.push('Description of services provided');
      documentationRequired.push('How management took responsibility');
      break;

    case 'familiarity':
      safeguardsRequired.push('Partner rotation');
      safeguardsRequired.push('Additional review procedures');
      documentationRequired.push('Nature and length of relationship');
      break;

    case 'advocacy':
      significance = 'prohibited';
      safeguardsRequired.push('Decline the advocacy role');
      documentationRequired.push('Nature of advocacy situation');
      break;

    case 'intimidation':
      safeguardsRequired.push('Document threat in detail');
      safeguardsRequired.push('Consult with ethics partner');
      documentationRequired.push('Nature of intimidation');
      documentationRequired.push('Actions taken to address');
      break;

    default:
      significance = 'acceptable_with_safeguards';
  }

  return {
    success: true,
    data: {
      threatCategory: category,
      significance,
      safeguardsRequired,
      conclusion:
        significance === 'prohibited'
          ? 'Threat cannot be reduced to acceptable level - engagement should not be accepted/continued'
          : significance === 'significant'
            ? 'Significant threat requires robust safeguards and partner approval'
            : 'Threat acceptable with implementation of documented safeguards',
      documentationRequired,
    },
    nextSteps: [
      'Document threat assessment',
      'Implement required safeguards',
      'Obtain appropriate approvals',
      'Monitor for changes in circumstances',
    ],
  };
}

/**
 * Evaluate non-audit services for audit client
 */
export function evaluateNonAuditService(
  service: IndependenceRequest['parameters']['service'],
  isPIE: boolean
): AgentResponse<NASAssessment> {
  if (!service) {
    return { success: false, error: 'Service details are required' };
  }

  const { type, description, fee } = service;
  const typeLower = type.toLowerCase();

  // Prohibited services for all audit clients
  const prohibitedServices = [
    'bookkeeping',
    'payroll',
    'internal audit outsourcing',
    'management functions',
    'legal services',
    'recruiting executive management',
    'investment advisory',
    'valuation (material)',
  ];

  // Additional PIE prohibitions
  const pieProhibitedServices = [
    'tax services with advocacy',
    'non-audit services exceeding 70% of audit fee',
    'aggressive tax positions',
  ];

  const isProhibited = prohibitedServices.some((p) => typeLower.includes(p));
  const isPIEProhibited = isPIE && pieProhibitedServices.some((p) => typeLower.includes(p));

  let selfReviewThreat = false;
  let managementThreat = false;
  const safeguardsRequired: string[] = [];

  // Check for self-review threat
  if (typeLower.includes('tax') || typeLower.includes('valuation') || typeLower.includes('accounting')) {
    selfReviewThreat = true;
    safeguardsRequired.push('Ensure management takes responsibility for decisions');
    safeguardsRequired.push('Use separate team from audit');
  }

  // Check for management responsibility threat
  if (typeLower.includes('management') || typeLower.includes('decision')) {
    managementThreat = true;
    safeguardsRequired.push('Client must make all management decisions');
    safeguardsRequired.push('Document client approval of approach');
  }

  return {
    success: true,
    data: {
      serviceName: type,
      category: selfReviewThreat ? 'self-review' : managementThreat ? 'management' : 'other',
      permittedForAuditClient: !isProhibited,
      permittedForPIE: !isProhibited && !isPIEProhibited,
      preApprovalRequired: isPIE || fee > 50000,
      feeCapApplicable: isPIE,
      selfReviewThreat,
      managementThreat,
      safeguardsRequired,
      conclusion: isProhibited || isPIEProhibited
        ? 'Service is prohibited for this audit client'
        : 'Service may be provided with appropriate safeguards',
    },
    nextSteps: isProhibited || isPIEProhibited
      ? ['Decline the engagement', 'Consider alternative providers']
      : [
          'Obtain pre-approval if required',
          'Document safeguards applied',
          'Ensure fee cap compliance for PIE',
          'Update independence register',
        ],
  };
}

/**
 * Check partner rotation requirements
 */
export function checkPartnerRotation(
  engagement: IndependenceRequest['parameters']['engagement']
): AgentResponse<RotationCheck[]> {
  if (!engagement) {
    return { success: false, error: 'Engagement details are required' };
  }

  const { publicInterestEntity, yearsOfService = 0 } = engagement;

  // Rotation periods
  const maxYears = publicInterestEntity ? 7 : 10;
  const coolingOff = publicInterestEntity ? 5 : 2;

  const checks: RotationCheck[] = [
    {
      partnerRole: 'Lead Engagement Partner',
      yearsOnEngagement: yearsOfService,
      rotationRequired: yearsOfService >= maxYears,
      rotationDueDate:
        yearsOfService >= maxYears ? 'Immediate' : `${maxYears - yearsOfService} years remaining`,
      coolingOffPeriod: `${coolingOff} years`,
      status:
        yearsOfService >= maxYears
          ? 'rotation_due'
          : yearsOfService >= maxYears - 1
            ? 'rotation_due'
            : 'compliant',
    },
  ];

  if (publicInterestEntity) {
    checks.push({
      partnerRole: 'Engagement Quality Reviewer',
      yearsOnEngagement: yearsOfService,
      rotationRequired: yearsOfService >= 7,
      rotationDueDate: yearsOfService >= 7 ? 'Immediate' : `${7 - yearsOfService} years remaining`,
      coolingOffPeriod: '3 years',
      status: yearsOfService >= 7 ? 'rotation_due' : 'compliant',
    });
  }

  return {
    success: true,
    data: checks,
    nextSteps: checks.some((c) => c.status === 'rotation_due')
      ? [
          'Identify successor partner',
          'Plan transition timeline',
          'Update rotation register',
          'Document knowledge transfer',
        ]
      : ['Monitor rotation timelines', 'Plan for upcoming rotations'],
  };
}

/**
 * Main agent handler
 */
export async function handleIndependenceEthicsRequest(
  request: IndependenceRequest
): Promise<AgentResponse<unknown>> {
  const { task, parameters } = request;

  switch (task) {
    case 'assess_threat':
      return assessThreat(parameters.threat);

    case 'evaluate_nas':
      return evaluateNonAuditService(parameters.service, parameters.engagement?.publicInterestEntity || false);

    case 'review_rotation':
      return checkPartnerRotation(parameters.engagement);

    case 'check_independence':
      // Comprehensive independence check
      const checks: ThreatAssessment[] = [];

      if (parameters.threat) {
        const threatResult = assessThreat(parameters.threat);
        if (threatResult.success && threatResult.data) {
          checks.push(threatResult.data);
        }
      }

      const hasProhibitedThreats = checks.some((c) => c.significance === 'prohibited');
      const hasSignificantThreats = checks.some((c) => c.significance === 'significant');

      return {
        success: true,
        data: {
          status: hasProhibitedThreats
            ? 'not_independent'
            : hasSignificantThreats
              ? 'threats_identified'
              : 'independent',
          threatsIdentified: checks,
          safeguardsApplied: checks.flatMap((c) => c.safeguardsRequired),
          overallConclusion: hasProhibitedThreats
            ? 'Independence cannot be maintained - cannot accept/continue engagement'
            : 'Independence can be maintained with documented safeguards',
          signOffRequired: hasSignificantThreats
            ? ['Ethics Partner', 'Lead Engagement Partner']
            : ['Lead Engagement Partner'],
        } as IndependenceCheck,
      };

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
