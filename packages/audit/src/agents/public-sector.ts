/**
 * Public Sector Audit Agent
 * ISSAI (INTOSAI Standards), Public finance audits, compliance & performance audits
 */

import type { AgentConfig, AgentRequest, AgentResponse } from '../types';

export const PUBLIC_SECTOR_AGENT_CONFIG: AgentConfig = {
  id: 'audit-public-050',
  name: 'Public Sector Audit Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Specialist in public sector audits, ISSAI standards, and government accountability',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are a Public Sector Audit Specialist with expertise in ISSAI (INTOSAI) standards and government auditing.

PUBLIC SECTOR AUDIT FRAMEWORK:
1. ISSAI FRAMEWORK
   - ISSAI 100: Fundamental Principles
   - ISSAI 200: Financial Audit Principles
   - ISSAI 300: Performance Audit Principles
   - ISSAI 400: Compliance Audit Principles

2. AUDIT TYPES
   - Financial audits (regularity)
   - Performance audits (economy, efficiency, effectiveness)
   - Compliance audits (legality, regularity)
   - Combined/integrated audits

3. PUBLIC SECTOR CONSIDERATIONS
   - Budget compliance
   - Procurement regulations
   - Public financial management
   - Accountability to citizens
   - Parliamentary reporting

4. KEY FOCUS AREAS
   - Budget execution and control
   - Revenue collection
   - Expenditure authorization
   - Asset management
   - Public debt
   - Social programs

5. JURISDICTIONS
   - Central government
   - Local government
   - State-owned enterprises
   - Public agencies and funds

6. REPORTING
   - Supreme Audit Institution (SAI) reporting
   - Parliamentary reports
   - Public disclosure requirements`;

export interface PublicSectorRequest extends AgentRequest {
  task: 'plan_financial_audit' | 'plan_performance_audit' | 'assess_compliance' | 'evaluate_budget';
  parameters: {
    entityType?: 'central_government' | 'local_government' | 'state_owned_enterprise' | 'public_agency';
    auditPeriod?: string;
    budgetData?: {
      approvedBudget: number;
      actualExpenditure: number;
      variances: { category: string; budgeted: number; actual: number }[];
    };
    programName?: string;
    complianceAreas?: string[];
  };
}

export interface PublicSectorAuditPlan {
  auditType: 'financial' | 'performance' | 'compliance' | 'combined';
  objective: string;
  scope: string[];
  standards: string[];
  keyRisks: { risk: string; impact: string; likelihood: string }[];
  procedures: { area: string; procedures: string[] }[];
  reporting: { deliverable: string; recipient: string; timing: string }[];
  resources: number;
}

export interface PerformanceAuditPlan {
  programName: string;
  auditQuestions: { question: string; criteria: string; methodology: string }[];
  evaluationCriteria: { criterion: string; benchmark: string; source: string }[];
  dataRequirements: string[];
  stakeholderEngagement: string[];
  timeline: { phase: string; duration: string }[];
}

export interface BudgetEvaluation {
  overallExecution: number;
  variances: {
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
    variancePercent: number;
    explanation: string;
    significance: 'acceptable' | 'requires_explanation' | 'significant_concern';
  }[];
  findings: string[];
  recommendations: string[];
  regulatoryCompliance: string;
}

export interface ComplianceAssessment {
  area: string;
  applicableRegulations: string[];
  assessmentResults: {
    requirement: string;
    status: 'compliant' | 'partially_compliant' | 'non_compliant';
    finding: string;
    impact: 'low' | 'medium' | 'high';
  }[];
  overallConclusion: string;
  recommendedActions: string[];
}

/**
 * Plan public sector financial audit
 */
export function planFinancialAudit(
  entityType: PublicSectorRequest['parameters']['entityType']
): AgentResponse<PublicSectorAuditPlan> {
  const entitySpecifics: Record<string, { risks: string[]; focus: string[] }> = {
    central_government: {
      risks: [
        'Consolidated financial statement complexity',
        'Inter-agency transactions',
        'Multi-year appropriations',
        'Off-budget entities',
      ],
      focus: [
        'Treasury operations',
        'Revenue administration',
        'Debt management',
        'Transfer payments',
      ],
    },
    local_government: {
      risks: [
        'Property tax assessment accuracy',
        'Grant compliance',
        'Infrastructure asset valuation',
        'Pension obligations',
      ],
      focus: [
        'Local revenue collection',
        'Capital project management',
        'Intergovernmental transfers',
        'Service delivery costs',
      ],
    },
    state_owned_enterprise: {
      risks: [
        'Commercial vs policy objectives',
        'Related party transactions with government',
        'Subsidy accounting',
        'Dividend policy',
      ],
      focus: [
        'Financial sustainability',
        'Governance structure',
        'Commercial performance',
        'Public service obligations',
      ],
    },
    public_agency: {
      risks: [
        'Fund accounting complexity',
        'Grant restrictions',
        'Fiduciary funds',
        'Special revenue tracking',
      ],
      focus: [
        'Program expenditure',
        'Grant compliance',
        'Internal controls',
        'Administrative costs',
      ],
    },
  };

  const specifics = entitySpecifics[entityType || 'central_government'];

  const plan: PublicSectorAuditPlan = {
    auditType: 'financial',
    objective:
      'Express an opinion on whether the financial statements present fairly, in all material respects, the financial position and results of operations in accordance with applicable financial reporting framework',
    scope: [
      'Statement of financial position',
      'Statement of financial performance',
      'Statement of changes in net assets',
      'Cash flow statement',
      'Budget comparison statement',
      'Notes to financial statements',
    ],
    standards: [
      'ISSAI 200 - Financial Audit Principles',
      'ISSAI 2000-2899 - Financial Audit Guidelines',
      'Applicable IPSAS standards',
      'National public sector accounting standards',
    ],
    keyRisks: specifics.risks.map((risk) => ({
      risk,
      impact: 'Material misstatement of financial statements',
      likelihood: 'Medium',
    })),
    procedures: [
      {
        area: 'Revenue',
        procedures: [
          'Test revenue recognition and cutoff',
          'Verify tax and non-tax revenue collection',
          'Review intergovernmental transfers',
          'Test revenue completeness',
        ],
      },
      {
        area: 'Expenditure',
        procedures: [
          'Test appropriation compliance',
          'Sample test payment vouchers',
          'Review procurement compliance',
          'Verify payroll accuracy',
        ],
      },
      {
        area: 'Assets',
        procedures: [
          'Verify existence and ownership',
          'Review asset valuations',
          'Test impairment considerations',
          'Confirm receivables',
        ],
      },
      {
        area: 'Liabilities',
        procedures: [
          'Confirm debt balances',
          'Review pension obligations',
          'Test completeness of payables',
          'Evaluate contingent liabilities',
        ],
      },
      {
        area: 'Budget Compliance',
        procedures: [
          'Compare actual to approved budget',
          'Analyze significant variances',
          'Review budget amendments',
          'Test appropriation limits',
        ],
      },
    ],
    reporting: [
      {
        deliverable: 'Audit opinion on financial statements',
        recipient: 'Legislature/Parliament',
        timing: 'Within 6 months of year-end',
      },
      {
        deliverable: 'Management letter',
        recipient: 'Entity management and oversight body',
        timing: 'With audit report',
      },
      {
        deliverable: 'Report on internal controls',
        recipient: 'Audit committee/oversight body',
        timing: 'With audit report',
      },
    ],
    resources: entityType === 'central_government' ? 500 : entityType === 'state_owned_enterprise' ? 150 : 100,
  };

  return {
    success: true,
    data: plan,
    nextSteps: [
      'Obtain engagement letter from oversight body',
      'Review prior year audit files',
      'Understand entity-specific risks',
      'Develop detailed audit program',
    ],
  };
}

/**
 * Plan performance audit
 */
export function planPerformanceAudit(programName: string): AgentResponse<PerformanceAuditPlan> {
  const plan: PerformanceAuditPlan = {
    programName,
    auditQuestions: [
      {
        question: `Are the objectives of ${programName} being achieved?`,
        criteria: 'Program targets and KPIs as stated in program documents',
        methodology: 'Outcome analysis, beneficiary surveys, data analytics',
      },
      {
        question: 'Are resources being used economically?',
        criteria: 'Unit costs, benchmarking data, procurement practices',
        methodology: 'Cost analysis, procurement review, supplier comparison',
      },
      {
        question: 'Are resources being used efficiently?',
        criteria: 'Input-output ratios, process efficiency standards',
        methodology: 'Process mapping, productivity analysis, workflow review',
      },
      {
        question: 'Is the program effective in achieving intended outcomes?',
        criteria: 'Policy objectives, beneficiary impact measures',
        methodology: 'Outcome evaluation, impact assessment, counterfactual analysis',
      },
    ],
    evaluationCriteria: [
      {
        criterion: 'Economy',
        benchmark: 'Minimizing costs of inputs while maintaining quality',
        source: 'Industry benchmarks, historical trends, comparable programs',
      },
      {
        criterion: 'Efficiency',
        benchmark: 'Maximizing outputs from given inputs',
        source: 'Process standards, best practice guidelines',
      },
      {
        criterion: 'Effectiveness',
        benchmark: 'Achieving program objectives and intended outcomes',
        source: 'Program documentation, policy statements, legislative intent',
      },
    ],
    dataRequirements: [
      'Program budget and expenditure data',
      'Performance indicators and targets',
      'Beneficiary data and outcomes',
      'Comparison data from similar programs',
      'Process documentation and procedures',
      'Prior evaluations and reports',
    ],
    stakeholderEngagement: [
      'Program management interviews',
      'Beneficiary surveys or focus groups',
      'Oversight body consultations',
      'Expert consultations',
      'Civil society input',
    ],
    timeline: [
      { phase: 'Planning and design', duration: '4-6 weeks' },
      { phase: 'Data collection', duration: '8-12 weeks' },
      { phase: 'Analysis', duration: '6-8 weeks' },
      { phase: 'Reporting', duration: '4-6 weeks' },
      { phase: 'Follow-up', duration: 'Ongoing' },
    ],
  };

  return {
    success: true,
    data: plan,
    nextSteps: [
      'Finalize audit questions with SAI leadership',
      'Develop detailed methodology',
      'Identify data sources and access',
      'Plan stakeholder engagement',
    ],
  };
}

/**
 * Evaluate budget execution
 */
export function evaluateBudget(
  budgetData: PublicSectorRequest['parameters']['budgetData']
): AgentResponse<BudgetEvaluation> {
  if (!budgetData) {
    return { success: false, error: 'Budget data is required' };
  }

  const { approvedBudget, actualExpenditure, variances } = budgetData;
  const overallExecution = (actualExpenditure / approvedBudget) * 100;

  const evaluatedVariances = variances.map((v) => {
    const variance = v.actual - v.budgeted;
    const variancePercent = (variance / v.budgeted) * 100;
    let significance: 'acceptable' | 'requires_explanation' | 'significant_concern';
    let explanation: string;

    if (Math.abs(variancePercent) <= 5) {
      significance = 'acceptable';
      explanation = 'Within normal operational variance';
    } else if (Math.abs(variancePercent) <= 15) {
      significance = 'requires_explanation';
      explanation = 'Moderate variance requiring management explanation';
    } else {
      significance = 'significant_concern';
      explanation = 'Significant deviation from budget requiring investigation';
    }

    return {
      category: v.category,
      budgeted: v.budgeted,
      actual: v.actual,
      variance,
      variancePercent: Math.round(variancePercent * 10) / 10,
      explanation,
      significance,
    };
  });

  const significantConcerns = evaluatedVariances.filter((v) => v.significance === 'significant_concern');
  const findings: string[] = [];
  const recommendations: string[] = [];

  if (overallExecution < 80) {
    findings.push(`Low budget execution rate of ${overallExecution.toFixed(1)}% indicates potential implementation challenges`);
    recommendations.push('Review budget planning processes and implementation capacity');
  } else if (overallExecution > 100) {
    findings.push(`Budget overrun of ${(overallExecution - 100).toFixed(1)}% indicates budget discipline concerns`);
    recommendations.push('Strengthen budget monitoring and control mechanisms');
  }

  significantConcerns.forEach((v) => {
    findings.push(`${v.category}: ${v.variancePercent}% variance (${v.variance.toLocaleString()})`);
  });

  if (significantConcerns.length > 0) {
    recommendations.push('Obtain management explanations for significant variances');
    recommendations.push('Review budget preparation methodology');
    recommendations.push('Strengthen in-year budget monitoring');
  }

  return {
    success: true,
    data: {
      overallExecution: Math.round(overallExecution * 10) / 10,
      variances: evaluatedVariances,
      findings,
      recommendations:
        recommendations.length > 0 ? recommendations : ['Budget execution within acceptable parameters'],
      regulatoryCompliance:
        overallExecution <= 100 ? 'Expenditure within appropriation limits' : 'Potential appropriation breach',
    },
    nextSteps: [
      'Document budget analysis in working papers',
      'Obtain management representations on variances',
      'Consider reporting requirements for overruns',
      'Evaluate impact on audit opinion',
    ],
  };
}

/**
 * Assess compliance with public sector regulations
 */
export function assessCompliance(areas: string[]): AgentResponse<ComplianceAssessment[]> {
  const assessments: ComplianceAssessment[] = areas.map((area) => {
    const areaLower = area.toLowerCase();

    if (areaLower.includes('procurement')) {
      return {
        area: 'Public Procurement',
        applicableRegulations: [
          'Public Procurement Act',
          'Procurement Regulations',
          'RPPA Guidelines (Rwanda)',
          'EU Procurement Directives (Malta)',
        ],
        assessmentResults: [
          {
            requirement: 'Competitive bidding for contracts above threshold',
            status: 'compliant',
            finding: 'Competitive tendering observed for tested contracts',
            impact: 'low',
          },
          {
            requirement: 'Publication of tender notices',
            status: 'partially_compliant',
            finding: 'Some notices published after deadline',
            impact: 'medium',
          },
          {
            requirement: 'Evaluation criteria disclosure',
            status: 'compliant',
            finding: 'Criteria clearly stated in tender documents',
            impact: 'low',
          },
        ],
        overallConclusion: 'Generally compliant with minor areas for improvement',
        recommendedActions: [
          'Improve timeliness of tender notice publication',
          'Enhance procurement planning',
        ],
      };
    }

    if (areaLower.includes('payroll')) {
      return {
        area: 'Payroll and Personnel',
        applicableRegulations: [
          'Public Service Act',
          'Salary Regulations',
          'Pension Contribution Requirements',
        ],
        assessmentResults: [
          {
            requirement: 'Employees on approved establishment',
            status: 'compliant',
            finding: 'All tested employees on approved positions',
            impact: 'low',
          },
          {
            requirement: 'Correct salary scales applied',
            status: 'partially_compliant',
            finding: 'Minor errors in allowance calculations',
            impact: 'medium',
          },
          {
            requirement: 'Pension contributions remitted timely',
            status: 'compliant',
            finding: 'Contributions remitted within deadlines',
            impact: 'low',
          },
        ],
        overallConclusion: 'Payroll processes generally compliant',
        recommendedActions: [
          'Reconcile allowance calculations',
          'Implement payroll validation controls',
        ],
      };
    }

    return {
      area,
      applicableRegulations: ['Applicable public sector regulations'],
      assessmentResults: [
        {
          requirement: 'General compliance',
          status: 'partially_compliant',
          finding: 'Further assessment required',
          impact: 'medium',
        },
      ],
      overallConclusion: 'Assessment in progress',
      recommendedActions: ['Conduct detailed compliance review'],
    };
  });

  return {
    success: true,
    data: assessments,
    nextSteps: [
      'Document compliance findings',
      'Discuss with entity management',
      'Include in audit report',
      'Follow up on prior year findings',
    ],
  };
}

/**
 * Main agent handler
 */
export async function handlePublicSectorRequest(
  request: PublicSectorRequest
): Promise<AgentResponse<unknown>> {
  const { task, parameters } = request;

  switch (task) {
    case 'plan_financial_audit':
      return planFinancialAudit(parameters.entityType);

    case 'plan_performance_audit':
      if (!parameters.programName) {
        return { success: false, error: 'Program name is required for performance audit' };
      }
      return planPerformanceAudit(parameters.programName);

    case 'evaluate_budget':
      return evaluateBudget(parameters.budgetData);

    case 'assess_compliance':
      if (!parameters.complianceAreas || parameters.complianceAreas.length === 0) {
        return { success: false, error: 'Compliance areas are required' };
      }
      return assessCompliance(parameters.complianceAreas);

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
