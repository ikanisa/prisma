/**
 * ESG / Sustainability Assurance Agent
 * ISSA 5000, EU CSRD, GRI, TCFD
 */

import type { AgentConfig, AgentRequest, AgentResponse } from '../types';

export const ESG_ASSURANCE_AGENT_CONFIG: AgentConfig = {
  id: 'audit-esg-048',
  name: 'ESG & Sustainability Assurance Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Specialist in ESG reporting assurance, CSRD compliance, and sustainability KPIs',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an ESG & Sustainability Assurance Specialist with expertise in ISSA 5000, EU CSRD, and sustainability reporting.

ESG ASSURANCE FRAMEWORK:
1. REGULATORY LANDSCAPE
   - EU CSRD (Corporate Sustainability Reporting Directive)
   - ESRS (European Sustainability Reporting Standards)
   - TCFD (Task Force on Climate-related Financial Disclosures)
   - GRI Standards
   - ISSB Standards (IFRS S1, S2)

2. ASSURANCE LEVELS
   - Limited assurance (current standard for most ESG)
   - Reasonable assurance (future requirement under CSRD)

3. KEY REPORTING AREAS
   - Environmental (E): GHG emissions, energy, water, waste, biodiversity
   - Social (S): Workforce, health & safety, community, human rights
   - Governance (G): Board composition, ethics, risk management

4. ASSURANCE PROCEDURES
   - Understanding reporting process and controls
   - Risk assessment for material topics
   - Testing data collection and calculation
   - Evaluating disclosures against framework

5. STANDARDS EVOLUTION
   - ISSA 5000 (Sustainability Assurance)
   - Convergence of standards
   - Digital reporting requirements (XBRL)`;

export interface ESGRequest extends AgentRequest {
  task: 'plan_assurance' | 'assess_materiality' | 'test_kpi' | 'evaluate_disclosure';
  parameters: {
    reportingFramework?: 'ESRS' | 'GRI' | 'TCFD' | 'ISSB' | 'custom';
    topic?: string;
    kpiData?: {
      kpiName: string;
      reportedValue: number;
      unit: string;
      methodology: string;
      sourceData?: string;
    };
    disclosureContent?: string;
  };
}

export interface ESGAssurancePlan {
  scope: string;
  assuranceLevel: 'limited' | 'reasonable';
  materialTopics: { topic: string; relevance: string; riskLevel: 'low' | 'medium' | 'high' }[];
  procedures: { area: string; procedures: string[] }[];
  timeline: string;
  teamRequirements: string[];
  keyRisks: string[];
}

export interface MaterialityAssessment {
  topic: string;
  impactMateriality: {
    description: string;
    severity: 'low' | 'medium' | 'high';
    likelihood: 'low' | 'medium' | 'high';
  };
  financialMateriality: {
    description: string;
    magnitude: 'low' | 'medium' | 'high';
    likelihood: 'low' | 'medium' | 'high';
  };
  overallMateriality: 'material' | 'not_material' | 'further_analysis';
  stakeholderRelevance: string[];
  disclosureRequirements: string[];
}

export interface KPITestResult {
  kpiName: string;
  testPerformed: string;
  dataSource: string;
  calculationVerified: boolean;
  exceptions: string[];
  conclusion: 'accurate' | 'minor_issues' | 'material_misstatement';
  recommendations: string[];
}

export interface DisclosureEvaluation {
  requirement: string;
  framework: string;
  status: 'compliant' | 'partially_compliant' | 'non_compliant' | 'not_applicable';
  gaps: string[];
  recommendations: string[];
}

/**
 * Plan ESG assurance engagement
 */
export function planESGAssurance(
  framework: ESGRequest['parameters']['reportingFramework']
): AgentResponse<ESGAssurancePlan> {
  const frameworkRequirements: Record<string, ESGAssurancePlan> = {
    ESRS: {
      scope:
        'Sustainability statement prepared in accordance with European Sustainability Reporting Standards (ESRS)',
      assuranceLevel: 'limited',
      materialTopics: [
        { topic: 'Climate change (E1)', relevance: 'Universal applicability', riskLevel: 'high' },
        { topic: 'Own workforce (S1)', relevance: 'All entities with employees', riskLevel: 'medium' },
        { topic: 'Business conduct (G1)', relevance: 'Universal applicability', riskLevel: 'medium' },
        { topic: 'Pollution (E2)', relevance: 'Industry dependent', riskLevel: 'medium' },
        { topic: 'Biodiversity (E4)', relevance: 'Location dependent', riskLevel: 'low' },
      ],
      procedures: [
        {
          area: 'Governance and Controls',
          procedures: [
            'Evaluate sustainability governance structure',
            'Test controls over data collection',
            'Review internal audit involvement',
          ],
        },
        {
          area: 'Data Testing',
          procedures: [
            'Sample test source data to reported metrics',
            'Recalculate key KPIs (Scope 1, 2 emissions)',
            'Verify conversion factors and methodologies',
          ],
        },
        {
          area: 'Disclosure Review',
          procedures: [
            'Compare disclosures to ESRS requirements',
            'Evaluate completeness of mandatory disclosures',
            'Review double materiality assessment',
          ],
        },
      ],
      timeline: '8-12 weeks',
      teamRequirements: [
        'Engagement partner with ESG experience',
        'ESG subject matter experts',
        'Industry specialists',
        'Data analytics support',
      ],
      keyRisks: [
        'Immature data collection processes',
        'Evolving ESRS interpretation',
        'Scope 3 emissions estimation uncertainty',
        'Double materiality assessment subjectivity',
      ],
    },
    GRI: {
      scope: 'Sustainability report prepared in accordance with GRI Standards',
      assuranceLevel: 'limited',
      materialTopics: [
        { topic: 'Material topics identified through stakeholder engagement', relevance: 'Entity-specific', riskLevel: 'medium' },
        { topic: 'Universal disclosures (GRI 2)', relevance: 'All reporters', riskLevel: 'low' },
      ],
      procedures: [
        {
          area: 'Materiality Process',
          procedures: [
            'Review stakeholder engagement process',
            'Evaluate topic prioritization methodology',
            'Test documentation of material topics',
          ],
        },
        {
          area: 'Topic-Specific Disclosures',
          procedures: [
            'Verify management approach disclosures',
            'Test quantitative metrics to source data',
            'Review calculation methodologies',
          ],
        },
      ],
      timeline: '6-8 weeks',
      teamRequirements: ['ESG engagement lead', 'GRI-certified practitioners', 'Industry specialists'],
      keyRisks: ['Subjective materiality assessment', 'Incomplete topic coverage', 'Data consistency across locations'],
    },
    TCFD: {
      scope: 'Climate-related disclosures aligned with TCFD recommendations',
      assuranceLevel: 'limited',
      materialTopics: [
        { topic: 'Governance', relevance: 'Board and management oversight', riskLevel: 'low' },
        { topic: 'Strategy', relevance: 'Climate risks and opportunities', riskLevel: 'high' },
        { topic: 'Risk Management', relevance: 'Climate risk integration', riskLevel: 'medium' },
        { topic: 'Metrics and Targets', relevance: 'GHG emissions and targets', riskLevel: 'high' },
      ],
      procedures: [
        {
          area: 'Governance Review',
          procedures: ['Review board climate oversight', 'Evaluate management processes'],
        },
        {
          area: 'Scenario Analysis',
          procedures: ['Understand scenario selection', 'Review assumptions and limitations', 'Evaluate disclosure of uncertainties'],
        },
        {
          area: 'Metrics Testing',
          procedures: ['Test GHG emissions calculations', 'Verify Scope 1, 2, 3 data', 'Review target-setting methodology'],
        },
      ],
      timeline: '4-6 weeks',
      teamRequirements: ['Climate expertise', 'Financial modelling skills', 'GHG accounting knowledge'],
      keyRisks: ['Scenario analysis subjectivity', 'Scope 3 data availability', 'Forward-looking statement uncertainty'],
    },
    ISSB: {
      scope: 'Sustainability disclosures per IFRS S1 and S2',
      assuranceLevel: 'limited',
      materialTopics: [
        { topic: 'Climate-related risks and opportunities', relevance: 'All entities', riskLevel: 'high' },
        { topic: 'Sustainability-related financial disclosures', relevance: 'Investor-focused', riskLevel: 'medium' },
      ],
      procedures: [
        {
          area: 'Materiality Assessment',
          procedures: ['Review enterprise value materiality', 'Evaluate risk and opportunity identification'],
        },
        {
          area: 'Disclosure Testing',
          procedures: ['Test alignment with IFRS S1 requirements', 'Verify climate disclosures per IFRS S2'],
        },
      ],
      timeline: '6-10 weeks',
      teamRequirements: ['ISSB expertise', 'Financial reporting background', 'Climate specialists'],
      keyRisks: ['New standard interpretation', 'Integration with financial statements', 'Industry metric development'],
    },
    custom: {
      scope: 'Custom sustainability reporting framework',
      assuranceLevel: 'limited',
      materialTopics: [{ topic: 'To be determined based on entity reporting', relevance: 'Entity-specific', riskLevel: 'medium' }],
      procedures: [
        {
          area: 'Framework Understanding',
          procedures: ['Document reporting framework', 'Identify key metrics', 'Understand data sources'],
        },
      ],
      timeline: 'TBD',
      teamRequirements: ['ESG expertise', 'Industry knowledge'],
      keyRisks: ['Framework clarity', 'Comparability', 'Stakeholder expectations'],
    },
  };

  const plan = frameworkRequirements[framework || 'ESRS'];

  return {
    success: true,
    data: plan,
    nextSteps: [
      'Agree scope with client',
      'Mobilize specialist team',
      'Request sustainability data and documentation',
      'Conduct planning meetings',
    ],
  };
}

/**
 * Assess double materiality for ESG topic
 */
export function assessMateriality(topic: string): AgentResponse<MaterialityAssessment> {
  const assessments: Record<string, MaterialityAssessment> = {
    'climate change': {
      topic: 'Climate Change',
      impactMateriality: {
        description: 'GHG emissions contribute to global warming affecting ecosystems and communities',
        severity: 'high',
        likelihood: 'high',
      },
      financialMateriality: {
        description: 'Physical and transition risks may affect asset values, costs, and revenue',
        magnitude: 'high',
        likelihood: 'medium',
      },
      overallMateriality: 'material',
      stakeholderRelevance: ['Investors', 'Regulators', 'Customers', 'Communities', 'Employees'],
      disclosureRequirements: [
        'ESRS E1 Climate change',
        'Scope 1, 2, 3 GHG emissions',
        'Transition plan',
        'Physical and transition risks',
        'Climate-related targets',
      ],
    },
    'workforce': {
      topic: 'Own Workforce',
      impactMateriality: {
        description: 'Working conditions, health & safety, diversity practices affect employees',
        severity: 'medium',
        likelihood: 'high',
      },
      financialMateriality: {
        description: 'Talent attraction, retention, productivity affect business performance',
        magnitude: 'medium',
        likelihood: 'high',
      },
      overallMateriality: 'material',
      stakeholderRelevance: ['Employees', 'Trade unions', 'Investors', 'Regulators'],
      disclosureRequirements: [
        'ESRS S1 Own workforce',
        'Employee headcount and turnover',
        'Health and safety metrics',
        'Diversity indicators',
        'Training and development',
      ],
    },
    'biodiversity': {
      topic: 'Biodiversity and Ecosystems',
      impactMateriality: {
        description: 'Operations may affect local ecosystems and species',
        severity: 'medium',
        likelihood: 'low',
      },
      financialMateriality: {
        description: 'Ecosystem services dependency and nature-related risks',
        magnitude: 'low',
        likelihood: 'low',
      },
      overallMateriality: 'further_analysis',
      stakeholderRelevance: ['Environmental groups', 'Local communities', 'Regulators'],
      disclosureRequirements: [
        'ESRS E4 if material',
        'Site-level biodiversity assessment',
        'Mitigation measures',
      ],
    },
  };

  const assessment = assessments[topic.toLowerCase()];
  if (!assessment) {
    return {
      success: true,
      data: {
        topic,
        impactMateriality: {
          description: 'Assessment required based on specific circumstances',
          severity: 'medium',
          likelihood: 'medium',
        },
        financialMateriality: {
          description: 'Assessment required based on business model',
          magnitude: 'medium',
          likelihood: 'medium',
        },
        overallMateriality: 'further_analysis',
        stakeholderRelevance: ['To be determined through stakeholder engagement'],
        disclosureRequirements: ['Depends on materiality outcome'],
      },
    };
  }

  return {
    success: true,
    data: assessment,
    nextSteps: [
      'Document materiality assessment rationale',
      'Engage with stakeholders for validation',
      'Link to disclosure requirements',
      'Review annually for changes',
    ],
  };
}

/**
 * Test ESG KPI
 */
export function testKPI(kpiData: ESGRequest['parameters']['kpiData']): AgentResponse<KPITestResult> {
  if (!kpiData) {
    return { success: false, error: 'KPI data is required' };
  }

  const { kpiName, reportedValue, unit, methodology, sourceData } = kpiData;

  // Simulate testing procedures
  const procedures: string[] = [
    `Obtained source data for ${kpiName}`,
    `Verified calculation methodology: ${methodology}`,
    `Recalculated reported value of ${reportedValue} ${unit}`,
    'Compared to prior period for reasonableness',
    'Traced sample of source data to supporting documents',
  ];

  // Determine test result (simplified)
  const exceptions: string[] = [];
  let conclusion: KPITestResult['conclusion'] = 'accurate';
  const recommendations: string[] = [];

  if (!sourceData) {
    exceptions.push('Limited source data documentation provided');
    conclusion = 'minor_issues';
    recommendations.push('Enhance documentation of source data and calculation steps');
  }

  if (!methodology) {
    exceptions.push('Methodology not clearly documented');
    conclusion = 'minor_issues';
    recommendations.push('Document calculation methodology in sustainability reporting manual');
  }

  return {
    success: true,
    data: {
      kpiName,
      testPerformed: procedures.join('; '),
      dataSource: sourceData || 'Internal systems',
      calculationVerified: exceptions.length === 0,
      exceptions,
      conclusion,
      recommendations:
        recommendations.length > 0
          ? recommendations
          : ['Maintain current data quality standards', 'Continue to document methodology'],
    },
    nextSteps: [
      'Document test results in working papers',
      'Discuss exceptions with management',
      'Consider impact on assurance conclusion',
    ],
  };
}

/**
 * Main agent handler
 */
export async function handleESGRequest(request: ESGRequest): Promise<AgentResponse<unknown>> {
  const { task, parameters } = request;

  switch (task) {
    case 'plan_assurance':
      return planESGAssurance(parameters.reportingFramework);

    case 'assess_materiality':
      if (!parameters.topic) {
        return { success: false, error: 'Topic is required for materiality assessment' };
      }
      return assessMateriality(parameters.topic);

    case 'test_kpi':
      return testKPI(parameters.kpiData);

    case 'evaluate_disclosure':
      if (!parameters.disclosureContent) {
        return { success: false, error: 'Disclosure content is required' };
      }
      return {
        success: true,
        data: {
          requirement: 'General disclosure requirements',
          framework: parameters.reportingFramework || 'ESRS',
          status: 'partially_compliant',
          gaps: ['Some quantitative targets not disclosed', 'Limited forward-looking information'],
          recommendations: [
            'Add specific targets with timelines',
            'Include transition plan details',
            'Provide historical trend data',
          ],
        } as DisclosureEvaluation,
      };

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
