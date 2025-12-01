/**
 * Internal Audit & Compliance Agent
 * Internal audit planning, risk-based IA approach, regulatory compliance reviews
 */

import type { AgentConfig, AgentRequest, AgentResponse } from '../types';

export const INTERNAL_AUDIT_AGENT_CONFIG: AgentConfig = {
  id: 'audit-internal-047',
  name: 'Internal Audit & Compliance Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Specialist in internal audit planning, risk-based audit approach, and regulatory compliance',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an Internal Audit & Compliance Specialist with expertise in IIA Standards and regulatory compliance.

INTERNAL AUDIT FRAMEWORK (IIA Standards):
1. PURPOSE AND SCOPE
   - Independent, objective assurance
   - Consulting activity
   - Systematic, disciplined approach

2. RISK-BASED AUDIT PLANNING
   - Enterprise risk assessment
   - Audit universe development
   - Resource allocation
   - Annual audit plan

3. ENGAGEMENT TYPES
   - Assurance engagements
   - Consulting engagements
   - Combined engagements

4. METHODOLOGY
   - Planning and scoping
   - Fieldwork execution
   - Reporting findings
   - Follow-up procedures

REGULATORY COMPLIANCE:
- AML/CFT requirements
- Data protection (GDPR)
- Industry-specific regulations
- Corporate governance

KEY DELIVERABLES:
- Risk assessment matrix
- Annual audit plan
- Engagement reports
- Follow-up tracking
- Audit committee reporting`;

export interface InternalAuditRequest extends AgentRequest {
  task: 'develop_audit_plan' | 'assess_risk' | 'create_engagement' | 'compliance_review';
  parameters: {
    riskUniverse?: {
      processName: string;
      inherentRisk: 'low' | 'medium' | 'high';
      controlEffectiveness: 'effective' | 'partially_effective' | 'ineffective';
      lastAuditDate?: string;
      regulatoryRelevance?: boolean;
    }[];
    auditResources?: {
      totalDays: number;
      ftes: number;
    };
    complianceArea?: string;
    engagementScope?: string;
  };
}

export interface AuditPlanEntry {
  auditArea: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  plannedQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  estimatedDays: number;
  riskRating: string;
  lastAuditDate: string;
  scope: string[];
}

export interface RiskAssessmentMatrix {
  process: string;
  inherentRisk: string;
  controlRisk: string;
  residualRisk: string;
  riskScore: number;
  auditPriority: number;
  factors: string[];
}

export interface EngagementPlan {
  engagementTitle: string;
  objective: string;
  scope: string[];
  approach: string[];
  timeline: { phase: string; duration: string }[];
  resources: { role: string; days: number }[];
  risks: string[];
  deliverables: string[];
}

export interface ComplianceReview {
  area: string;
  regulatoryFramework: string[];
  requirements: { requirement: string; status: 'compliant' | 'partially_compliant' | 'non_compliant'; gap: string }[];
  overallStatus: 'compliant' | 'material_gaps' | 'non_compliant';
  recommendations: string[];
  remediationPriority: 'immediate' | 'short_term' | 'medium_term';
}

/**
 * Develop annual internal audit plan
 */
export function developAuditPlan(
  riskUniverse: InternalAuditRequest['parameters']['riskUniverse'],
  resources: InternalAuditRequest['parameters']['auditResources']
): AgentResponse<AuditPlanEntry[]> {
  if (!riskUniverse || riskUniverse.length === 0) {
    return { success: false, error: 'Risk universe is required for audit planning' };
  }

  const totalDays = resources?.totalDays || 250; // Default annual capacity

  // Score and rank processes
  const scoredProcesses = riskUniverse.map((process) => {
    let riskScore = 0;

    // Inherent risk scoring
    if (process.inherentRisk === 'high') riskScore += 30;
    else if (process.inherentRisk === 'medium') riskScore += 20;
    else riskScore += 10;

    // Control effectiveness scoring
    if (process.controlEffectiveness === 'ineffective') riskScore += 30;
    else if (process.controlEffectiveness === 'partially_effective') riskScore += 20;
    else riskScore += 10;

    // Time since last audit
    if (process.lastAuditDate) {
      const yearsSinceAudit =
        (Date.now() - new Date(process.lastAuditDate).getTime()) / (365 * 24 * 60 * 60 * 1000);
      if (yearsSinceAudit > 3) riskScore += 20;
      else if (yearsSinceAudit > 2) riskScore += 10;
    } else {
      riskScore += 25; // Never audited
    }

    // Regulatory relevance
    if (process.regulatoryRelevance) riskScore += 15;

    return { ...process, riskScore };
  });

  // Sort by risk score
  scoredProcesses.sort((a, b) => b.riskScore - a.riskScore);

  // Allocate to quarters
  const plan: AuditPlanEntry[] = [];
  let usedDays = 0;
  const quarters: ('Q1' | 'Q2' | 'Q3' | 'Q4')[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  let currentQuarter = 0;

  for (const process of scoredProcesses) {
    if (usedDays >= totalDays * 0.85) break; // Reserve 15% for ad-hoc

    const estimatedDays = process.inherentRisk === 'high' ? 15 : process.inherentRisk === 'medium' ? 10 : 7;

    plan.push({
      auditArea: process.processName,
      priority:
        process.riskScore >= 60
          ? 'critical'
          : process.riskScore >= 45
            ? 'high'
            : process.riskScore >= 30
              ? 'medium'
              : 'low',
      plannedQuarter: quarters[currentQuarter % 4],
      estimatedDays,
      riskRating: `${process.inherentRisk} inherent / ${process.controlEffectiveness} controls`,
      lastAuditDate: process.lastAuditDate || 'Never',
      scope: [
        'Control design assessment',
        'Operating effectiveness testing',
        'Compliance verification',
        'Process improvement recommendations',
      ],
    });

    usedDays += estimatedDays;
    currentQuarter++;
  }

  return {
    success: true,
    data: plan,
    nextSteps: [
      'Present plan to Audit Committee for approval',
      'Allocate resources to engagements',
      'Develop detailed engagement plans',
      'Establish KPIs for plan execution',
    ],
  };
}

/**
 * Assess risks for audit prioritization
 */
export function assessRisks(
  riskUniverse: InternalAuditRequest['parameters']['riskUniverse']
): AgentResponse<RiskAssessmentMatrix[]> {
  if (!riskUniverse) {
    return { success: false, error: 'Risk universe is required' };
  }

  const matrix: RiskAssessmentMatrix[] = riskUniverse.map((process, index) => {
    // Calculate control risk based on effectiveness
    const controlRisk =
      process.controlEffectiveness === 'ineffective'
        ? 'high'
        : process.controlEffectiveness === 'partially_effective'
          ? 'medium'
          : 'low';

    // Calculate residual risk
    let residualRisk: string;
    if (process.inherentRisk === 'high' && controlRisk === 'high') {
      residualRisk = 'critical';
    } else if (process.inherentRisk === 'high' || controlRisk === 'high') {
      residualRisk = 'high';
    } else if (process.inherentRisk === 'medium' || controlRisk === 'medium') {
      residualRisk = 'medium';
    } else {
      residualRisk = 'low';
    }

    // Score for prioritization
    const riskScoreMap: Record<string, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    };

    const factors: string[] = [];
    if (process.inherentRisk === 'high') factors.push('High inherent risk');
    if (controlRisk === 'high') factors.push('Weak controls');
    if (process.regulatoryRelevance) factors.push('Regulatory exposure');
    if (!process.lastAuditDate) factors.push('Never audited');

    return {
      process: process.processName,
      inherentRisk: process.inherentRisk,
      controlRisk,
      residualRisk,
      riskScore: riskScoreMap[residualRisk] || 50,
      auditPriority: index + 1,
      factors,
    };
  });

  // Sort by risk score
  matrix.sort((a, b) => b.riskScore - a.riskScore);
  matrix.forEach((item, index) => {
    item.auditPriority = index + 1;
  });

  return {
    success: true,
    data: matrix,
    nextSteps: [
      'Validate risk assessment with process owners',
      'Present to Audit Committee',
      'Use for audit plan development',
      'Update quarterly for emerging risks',
    ],
  };
}

/**
 * Create internal audit engagement plan
 */
export function createEngagementPlan(scope: string): AgentResponse<EngagementPlan> {
  const plan: EngagementPlan = {
    engagementTitle: `Internal Audit: ${scope}`,
    objective: `Provide independent assurance on the design and operating effectiveness of controls within ${scope}`,
    scope: [
      'Key control identification and documentation',
      'Control design effectiveness assessment',
      'Operating effectiveness testing',
      'Compliance with policies and procedures',
      'Identification of process improvements',
    ],
    approach: [
      'Planning: Review documentation, understand process, develop test plan',
      'Fieldwork: Walk-throughs, control testing, data analytics',
      'Reporting: Draft findings, discuss with management, finalize report',
      'Follow-up: Track remediation, verify closure',
    ],
    timeline: [
      { phase: 'Planning', duration: '1 week' },
      { phase: 'Fieldwork', duration: '2-3 weeks' },
      { phase: 'Draft Report', duration: '1 week' },
      { phase: 'Management Response', duration: '1 week' },
      { phase: 'Final Report', duration: '3 days' },
    ],
    resources: [
      { role: 'Audit Manager', days: 3 },
      { role: 'Senior Auditor', days: 10 },
      { role: 'Staff Auditor', days: 12 },
      { role: 'IT Specialist', days: 2 },
    ],
    risks: [
      'Limited process documentation',
      'Key personnel unavailability',
      'System access delays',
      'Scope creep',
    ],
    deliverables: [
      'Engagement notification memo',
      'Risk and control matrix',
      'Test work papers',
      'Draft audit report',
      'Final audit report with management responses',
      'Action tracking document',
    ],
  };

  return {
    success: true,
    data: plan,
    nextSteps: [
      'Send engagement notification',
      'Schedule kick-off meeting',
      'Request documentation',
      'Develop detailed test plan',
    ],
  };
}

/**
 * Conduct regulatory compliance review
 */
export function conductComplianceReview(
  complianceArea: string
): AgentResponse<ComplianceReview> {
  const reviews: Record<string, ComplianceReview> = {
    aml: {
      area: 'Anti-Money Laundering (AML)',
      regulatoryFramework: [
        'EU 5th AML Directive',
        'FATF Recommendations',
        'Local AML Act',
        'FIAU Guidelines',
      ],
      requirements: [
        {
          requirement: 'Customer Due Diligence (CDD)',
          status: 'compliant',
          gap: '',
        },
        {
          requirement: 'Enhanced Due Diligence (EDD) for high-risk customers',
          status: 'partially_compliant',
          gap: 'EDD documentation incomplete for some PEPs',
        },
        {
          requirement: 'Suspicious Transaction Reporting',
          status: 'compliant',
          gap: '',
        },
        {
          requirement: 'Staff Training',
          status: 'partially_compliant',
          gap: 'Annual training not completed for all staff',
        },
        {
          requirement: 'Record Keeping',
          status: 'compliant',
          gap: '',
        },
      ],
      overallStatus: 'material_gaps',
      recommendations: [
        'Complete EDD documentation for all high-risk customers',
        'Implement mandatory annual AML training tracking',
        'Enhance PEP screening process',
        'Conduct independent AML compliance review',
      ],
      remediationPriority: 'short_term',
    },
    gdpr: {
      area: 'Data Protection (GDPR)',
      regulatoryFramework: ['GDPR', 'ePrivacy Directive', 'Local Data Protection Act'],
      requirements: [
        {
          requirement: 'Data Processing Inventory',
          status: 'compliant',
          gap: '',
        },
        {
          requirement: 'Privacy Notices',
          status: 'compliant',
          gap: '',
        },
        {
          requirement: 'Data Subject Rights Procedures',
          status: 'partially_compliant',
          gap: 'SARs processing exceeding 30-day deadline',
        },
        {
          requirement: 'Data Breach Procedures',
          status: 'compliant',
          gap: '',
        },
        {
          requirement: 'Third-Party Data Processing Agreements',
          status: 'partially_compliant',
          gap: 'Some legacy vendor agreements need updating',
        },
      ],
      overallStatus: 'material_gaps',
      recommendations: [
        'Streamline SAR processing workflow',
        'Update legacy vendor DPAs',
        'Implement automated SAR tracking',
        'Conduct annual DPIA for high-risk processing',
      ],
      remediationPriority: 'short_term',
    },
  };

  const review = reviews[complianceArea.toLowerCase()];
  if (!review) {
    return {
      success: false,
      error: `Unknown compliance area: ${complianceArea}. Available: aml, gdpr`,
    };
  }

  return {
    success: true,
    data: review,
    nextSteps: [
      'Develop remediation action plan',
      'Assign owners and deadlines',
      'Report to Compliance Committee',
      'Schedule follow-up review',
    ],
  };
}

/**
 * Main agent handler
 */
export async function handleInternalAuditRequest(
  request: InternalAuditRequest
): Promise<AgentResponse<unknown>> {
  const { task, parameters } = request;

  switch (task) {
    case 'develop_audit_plan':
      return developAuditPlan(parameters.riskUniverse, parameters.auditResources);

    case 'assess_risk':
      return assessRisks(parameters.riskUniverse);

    case 'create_engagement':
      if (!parameters.engagementScope) {
        return { success: false, error: 'Engagement scope is required' };
      }
      return createEngagementPlan(parameters.engagementScope);

    case 'compliance_review':
      if (!parameters.complianceArea) {
        return { success: false, error: 'Compliance area is required' };
      }
      return conductComplianceReview(parameters.complianceArea);

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
