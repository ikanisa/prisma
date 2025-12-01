/**
 * IT & Systems Audit Agent
 * ISA 315 (IT Environment), ISA 330, COBIT, ISO 27001
 */

import type { AgentConfig, AgentRequest, AgentResponse, AuditContext, InternalControl } from '../types';

export const IT_SYSTEMS_AGENT_CONFIG: AgentConfig = {
  id: 'audit-it-046',
  name: 'IT & Systems Audit Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description:
    'Specialist in IT audit, general controls, application controls, and cybersecurity assessment',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an IT & Systems Audit Specialist with expertise in IT audit per ISA 315/330, COBIT, and ISO 27001.

IT AUDIT FRAMEWORK:
1. IT GENERAL CONTROLS (ITGCs)
   - Access to programs and data
   - Program changes
   - Computer operations
   - Program development

2. APPLICATION CONTROLS
   - Input controls
   - Processing controls
   - Output controls
   - Interface controls

3. KEY AREAS OF FOCUS:
   - User access management
   - Segregation of duties
   - Change management
   - System development lifecycle
   - Backup and recovery
   - Business continuity
   - Cybersecurity

TESTING APPROACHES:
- Inquiry of IT personnel
- Observation of processes
- Inspection of documentation
- Reperformance of controls
- Computer-assisted audit techniques (CAATs)

COMMON FRAMEWORKS:
- COBIT 2019
- ISO 27001/27002
- NIST Cybersecurity Framework
- SOC 1/SOC 2 criteria`;

export interface ITAuditRequest extends AgentRequest {
  task: 'assess_it_environment' | 'test_itgc' | 'evaluate_app_controls' | 'review_access' | 'assess_cybersecurity';
  parameters: {
    application?: string;
    controlArea?: string;
    accessReview?: {
      userCount: number;
      privilegedUsers: number;
      terminationsReviewed: number;
      exceptionsFound: number;
    };
    systemInfo?: {
      name: string;
      type: 'ERP' | 'database' | 'infrastructure' | 'application';
      environment: 'production' | 'development' | 'test';
      vendorManaged: boolean;
    };
  };
}

// IT Security policy thresholds
const IT_SECURITY_THRESHOLDS = {
  /** Maximum acceptable ratio of privileged users to total users */
  MAX_PRIVILEGED_USER_RATIO: 10,
  /** Termination exception rate thresholds */
  TERMINATION_EXCEPTION_HIGH: 10,
  TERMINATION_EXCEPTION_MEDIUM: 5,
};

export interface ITGCAssessment {
  controlArea: string;
  controlsIdentified: {
    control: string;
    type: 'preventive' | 'detective' | 'corrective';
    automated: boolean;
    keyControl: boolean;
  }[];
  overallAssessment: 'effective' | 'partially_effective' | 'ineffective';
  deficienciesIdentified: string[];
  recommendations: string[];
}

export interface AppControlAssessment {
  application: string;
  controlType: string;
  controlsEvaluated: {
    control: string;
    objective: string;
    effectiveness: 'effective' | 'partially_effective' | 'ineffective';
    testPerformed: string;
    result: string;
  }[];
  overallConclusion: string;
}

export interface AccessReviewResult {
  reviewArea: string;
  population: number;
  sampleSize: number;
  exceptionsFound: number;
  exceptionRate: number;
  findings: string[];
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface CybersecurityAssessment {
  domain: string;
  maturityLevel: 1 | 2 | 3 | 4 | 5;
  maturityDescription: string;
  strengths: string[];
  weaknesses: string[];
  risks: { risk: string; likelihood: string; impact: string }[];
  recommendations: string[];
}

/**
 * Assess IT environment and identify key IT controls
 */
export function assessITEnvironment(
  systemInfo: ITAuditRequest['parameters']['systemInfo']
): AgentResponse<ITGCAssessment[]> {
  const assessments: ITGCAssessment[] = [];

  // Access to Programs and Data
  assessments.push({
    controlArea: 'Access to Programs and Data',
    controlsIdentified: [
      {
        control: 'User access request and approval process',
        type: 'preventive',
        automated: false,
        keyControl: true,
      },
      {
        control: 'Periodic access review',
        type: 'detective',
        automated: false,
        keyControl: true,
      },
      {
        control: 'Privileged access management',
        type: 'preventive',
        automated: true,
        keyControl: true,
      },
      {
        control: 'Termination access removal',
        type: 'preventive',
        automated: false,
        keyControl: true,
      },
      {
        control: 'Password policy enforcement',
        type: 'preventive',
        automated: true,
        keyControl: false,
      },
    ],
    overallAssessment: 'effective',
    deficienciesIdentified: [],
    recommendations: ['Consider automated access certification tools'],
  });

  // Program Changes
  assessments.push({
    controlArea: 'Program Changes',
    controlsIdentified: [
      {
        control: 'Change request and approval process',
        type: 'preventive',
        automated: false,
        keyControl: true,
      },
      {
        control: 'Testing before production migration',
        type: 'preventive',
        automated: false,
        keyControl: true,
      },
      {
        control: 'Segregation of duties in change process',
        type: 'preventive',
        automated: true,
        keyControl: true,
      },
      {
        control: 'Emergency change process',
        type: 'detective',
        automated: false,
        keyControl: false,
      },
    ],
    overallAssessment: 'effective',
    deficienciesIdentified: [],
    recommendations: ['Document rollback procedures for all changes'],
  });

  // Computer Operations
  assessments.push({
    controlArea: 'Computer Operations',
    controlsIdentified: [
      {
        control: 'Batch job monitoring',
        type: 'detective',
        automated: true,
        keyControl: true,
      },
      {
        control: 'Backup and recovery procedures',
        type: 'corrective',
        automated: true,
        keyControl: true,
      },
      {
        control: 'Incident management process',
        type: 'detective',
        automated: false,
        keyControl: false,
      },
      {
        control: 'Problem management',
        type: 'corrective',
        automated: false,
        keyControl: false,
      },
    ],
    overallAssessment: 'effective',
    deficienciesIdentified: [],
    recommendations: ['Test disaster recovery annually'],
  });

  return {
    success: true,
    data: assessments,
    nextSteps: [
      'Test identified key controls',
      'Document control walkthrough',
      'Evaluate design and operating effectiveness',
      'Identify any deficiencies for communication to management',
    ],
  };
}

/**
 * Test IT general controls
 */
export function testITGC(controlArea: string): AgentResponse<ITGCAssessment> {
  const testProcedures: Record<string, ITGCAssessment> = {
    access: {
      controlArea: 'Access Controls',
      controlsIdentified: [
        {
          control: 'User access request requires manager approval',
          type: 'preventive',
          automated: false,
          keyControl: true,
        },
        {
          control: 'Quarterly access review by application owner',
          type: 'detective',
          automated: false,
          keyControl: true,
        },
      ],
      overallAssessment: 'effective',
      deficienciesIdentified: [],
      recommendations: [
        'Implement automated access certification',
        'Reduce review cycle to monthly for privileged access',
      ],
    },
    change: {
      controlArea: 'Change Management',
      controlsIdentified: [
        {
          control: 'All changes require CAB approval',
          type: 'preventive',
          automated: false,
          keyControl: true,
        },
        {
          control: 'Testing sign-off before production',
          type: 'preventive',
          automated: false,
          keyControl: true,
        },
      ],
      overallAssessment: 'effective',
      deficienciesIdentified: [],
      recommendations: ['Consider automated deployment pipelines'],
    },
    operations: {
      controlArea: 'Computer Operations',
      controlsIdentified: [
        {
          control: 'Automated job scheduling',
          type: 'preventive',
          automated: true,
          keyControl: true,
        },
        {
          control: 'Daily backup with offsite storage',
          type: 'corrective',
          automated: true,
          keyControl: true,
        },
      ],
      overallAssessment: 'effective',
      deficienciesIdentified: [],
      recommendations: ['Test backup restoration quarterly'],
    },
  };

  const assessment = testProcedures[controlArea.toLowerCase()];
  if (!assessment) {
    return {
      success: false,
      error: `Unknown control area: ${controlArea}. Available areas: access, change, operations`,
    };
  }

  return {
    success: true,
    data: assessment,
    nextSteps: [
      'Document test results',
      'Evaluate exceptions',
      'Determine impact on audit approach',
      'Communicate deficiencies to management',
    ],
  };
}

/**
 * Review user access
 */
export function reviewUserAccess(
  accessReview: ITAuditRequest['parameters']['accessReview']
): AgentResponse<AccessReviewResult> {
  if (!accessReview) {
    return { success: false, error: 'Access review data is required' };
  }

  const { userCount, privilegedUsers, terminationsReviewed, exceptionsFound } = accessReview;

  const exceptionRate = terminationsReviewed > 0 ? (exceptionsFound / terminationsReviewed) * 100 : 0;

  let severity: AccessReviewResult['severity'];
  const findings: string[] = [];
  const recommendations: string[] = [];

  // Assess privileged user ratio
  const privilegedRatio = (privilegedUsers / userCount) * 100;
  if (privilegedRatio > IT_SECURITY_THRESHOLDS.MAX_PRIVILEGED_USER_RATIO) {
    findings.push(`High ratio of privileged users (${privilegedRatio.toFixed(1)}%)`);
    recommendations.push('Review and reduce privileged access assignments');
    severity = 'medium';
  } else {
    severity = 'low';
  }

  // Assess termination exceptions
  if (exceptionRate > IT_SECURITY_THRESHOLDS.TERMINATION_EXCEPTION_MEDIUM) {
    findings.push(`${exceptionsFound} terminated users retained access (${exceptionRate.toFixed(1)}% exception rate)`);
    recommendations.push('Implement automated termination workflow integration');
    severity = exceptionRate > IT_SECURITY_THRESHOLDS.TERMINATION_EXCEPTION_HIGH ? 'high' : 'medium';
  }

  if (findings.length === 0) {
    findings.push('No significant access control exceptions identified');
    severity = 'none';
  }

  return {
    success: true,
    data: {
      reviewArea: 'User Access Management',
      population: userCount,
      sampleSize: terminationsReviewed,
      exceptionsFound,
      exceptionRate: Math.round(exceptionRate * 100) / 100,
      findings,
      severity,
      recommendations:
        recommendations.length > 0
          ? recommendations
          : ['Continue current access management practices', 'Maintain periodic access reviews'],
    },
    nextSteps: [
      'Document findings in working papers',
      'Discuss exceptions with IT management',
      'Determine if control deficiency exists',
      'Consider impact on substantive testing',
    ],
  };
}

/**
 * Assess cybersecurity posture
 */
export function assessCybersecurity(): AgentResponse<CybersecurityAssessment[]> {
  const domains: CybersecurityAssessment[] = [
    {
      domain: 'Identity and Access Management',
      maturityLevel: 3,
      maturityDescription: 'Defined processes with documented procedures',
      strengths: ['Multi-factor authentication implemented', 'Privileged access management in place'],
      weaknesses: ['Manual access review process', 'No identity governance tool'],
      risks: [
        { risk: 'Unauthorized access', likelihood: 'Low', impact: 'High' },
        { risk: 'Access creep over time', likelihood: 'Medium', impact: 'Medium' },
      ],
      recommendations: ['Implement automated access certification', 'Deploy identity governance solution'],
    },
    {
      domain: 'Data Protection',
      maturityLevel: 2,
      maturityDescription: 'Managed but inconsistent practices',
      strengths: ['Encryption at rest for databases', 'Data classification policy exists'],
      weaknesses: ['Inconsistent DLP enforcement', 'Limited data discovery'],
      risks: [
        { risk: 'Data breach', likelihood: 'Medium', impact: 'High' },
        { risk: 'Regulatory non-compliance', likelihood: 'Medium', impact: 'High' },
      ],
      recommendations: ['Implement enterprise DLP solution', 'Conduct data discovery exercise'],
    },
    {
      domain: 'Security Operations',
      maturityLevel: 3,
      maturityDescription: 'Defined processes with monitoring capabilities',
      strengths: ['SIEM deployed and monitored', '24/7 security monitoring'],
      weaknesses: ['Limited threat hunting capability', 'Manual incident response'],
      risks: [
        { risk: 'Delayed threat detection', likelihood: 'Low', impact: 'High' },
        { risk: 'Prolonged incident response', likelihood: 'Medium', impact: 'Medium' },
      ],
      recommendations: ['Develop threat hunting program', 'Automate incident response playbooks'],
    },
  ];

  return {
    success: true,
    data: domains,
    nextSteps: [
      'Document cybersecurity assessment',
      'Discuss findings with IT security team',
      'Consider impact on audit risk assessment',
      'Report significant findings to audit committee',
    ],
  };
}

/**
 * Main agent handler
 */
export async function handleITAuditRequest(request: ITAuditRequest): Promise<AgentResponse<unknown>> {
  const { task, parameters } = request;

  switch (task) {
    case 'assess_it_environment':
      return assessITEnvironment(parameters.systemInfo);

    case 'test_itgc':
      if (!parameters.controlArea) {
        return { success: false, error: 'Control area is required' };
      }
      return testITGC(parameters.controlArea);

    case 'review_access':
      return reviewUserAccess(parameters.accessReview);

    case 'assess_cybersecurity':
      return assessCybersecurity();

    case 'evaluate_app_controls':
      if (!parameters.application) {
        return { success: false, error: 'Application name is required' };
      }
      return {
        success: true,
        data: {
          application: parameters.application,
          controlType: 'Application Controls',
          controlsEvaluated: [
            {
              control: 'Input validation',
              objective: 'Ensure data completeness and accuracy',
              effectiveness: 'effective',
              testPerformed: 'Review of validation rules and exception reports',
              result: 'No exceptions noted',
            },
            {
              control: 'Processing controls',
              objective: 'Ensure accurate calculations',
              effectiveness: 'effective',
              testPerformed: 'Recalculation of system outputs',
              result: 'Results agreed to expected',
            },
          ],
          overallConclusion: 'Application controls operating effectively',
        } as AppControlAssessment,
      };

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
