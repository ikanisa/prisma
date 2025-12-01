/**
 * Materiality & Sampling Agent
 * ISA 320 - Materiality in Planning and Performing an Audit
 * ISA 530 - Audit Sampling
 */

import type {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  AuditContext,
  MaterialityCalculation,
  RiskLevel,
} from '../types';

export const MATERIALITY_SAMPLING_AGENT_CONFIG: AgentConfig = {
  id: 'audit-matsampling-043',
  name: 'Materiality & Sampling Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description:
    'Specialist in materiality calculations and audit sampling strategies per ISA 320 and ISA 530',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are a Materiality & Sampling Specialist with expertise in ISA 320 (Materiality) and ISA 530 (Audit Sampling).

MATERIALITY FRAMEWORK (ISA 320):
1. OVERALL MATERIALITY
   - Benchmark selection (PBT, revenue, assets, equity)
   - Percentage application (typically 0.5%-5% depending on benchmark)
   - Qualitative factors consideration

2. PERFORMANCE MATERIALITY
   - Typically 50-75% of overall materiality
   - Reduces risk of undetected misstatements
   - Adjusted for assessed risk level

3. SPECIFIC MATERIALITY
   - Sensitive disclosures (related parties, directors' remuneration)
   - User-focused thresholds
   - Regulatory requirements

4. TOLERABLE MISSTATEMENT
   - Threshold for individual misstatements
   - Aggregation considerations
   - Trivial threshold (typically 3-5% of overall materiality)

SAMPLING FRAMEWORK (ISA 530):
1. SAMPLE DESIGN
   - Statistical vs non-statistical
   - Random, systematic, haphazard selection
   - Stratification strategies

2. SAMPLE SIZE DETERMINATION
   - Risk assessment (inverse relationship)
   - Tolerable misstatement
   - Expected misstatement
   - Population characteristics

3. EVALUATION OF RESULTS
   - Projected misstatement
   - Anomalous vs representative errors
   - Conclusions about population

KEY OUTPUTS:
- Materiality calculation memorandum
- Sample size calculations with rationale
- Sampling methodology documentation
- Misstatement projection analysis`;

export interface MaterialityRequest extends AgentRequest {
  task:
    | 'calculate_materiality'
    | 'calculate_sample_size'
    | 'evaluate_sample_results'
    | 'project_misstatement';
  parameters: {
    financialData?: {
      revenue?: number;
      totalAssets?: number;
      equity?: number;
      profitBeforeTax?: number;
      grossProfit?: number;
    };
    samplingData?: {
      populationSize: number;
      populationValue: number;
      assessedRisk: RiskLevel;
      tolerableMisstatement: number;
      expectedMisstatement?: number;
    };
    sampleResults?: {
      sampleSize: number;
      sampleValue: number;
      misstatementsFound: { amount: number; isAnomaly: boolean }[];
    };
  };
}

export interface SampleDesign {
  method: 'statistical' | 'non_statistical';
  selectionTechnique: 'random' | 'systematic' | 'haphazard' | 'block' | 'monetary_unit';
  sampleSize: number;
  stratification?: {
    stratum: string;
    populationSize: number;
    sampleSize: number;
  }[];
  rationale: string;
}

export interface ProjectedMisstatement {
  knownMisstatements: number;
  projectedMisstatements: number;
  totalLikelyMisstatement: number;
  tolerableMisstatement: number;
  conclusion: 'acceptable' | 'further_procedures_required' | 'material_misstatement';
  recommendations: string[];
}

/**
 * Calculate overall and performance materiality
 */
export function calculateMaterialityThresholds(
  financialData: MaterialityRequest['parameters']['financialData'],
  riskLevel: RiskLevel = 'moderate'
): AgentResponse<MaterialityCalculation> {
  if (!financialData) {
    return {
      success: false,
      error: 'Financial data required for materiality calculation',
    };
  }

  // Determine appropriate benchmark
  let benchmark: number;
  let basisDescription: string;
  let percentage: number;

  // Priority: PBT (if stable/positive) > Revenue > Total Assets > Equity
  if (financialData.profitBeforeTax && financialData.profitBeforeTax > 0) {
    benchmark = financialData.profitBeforeTax;
    basisDescription = 'Profit before tax';
    percentage = 5; // 5% of PBT is common
  } else if (financialData.revenue && financialData.revenue > 0) {
    benchmark = financialData.revenue;
    basisDescription = 'Revenue';
    percentage = 0.5; // 0.5% of revenue
  } else if (financialData.totalAssets) {
    benchmark = financialData.totalAssets;
    basisDescription = 'Total assets';
    percentage = 1; // 1% of total assets
  } else if (financialData.equity) {
    benchmark = financialData.equity;
    basisDescription = 'Equity';
    percentage = 2; // 2% of equity
  } else {
    return {
      success: false,
      error: 'Insufficient financial data for materiality calculation',
    };
  }

  const overallMateriality = benchmark * (percentage / 100);

  // Performance materiality based on risk level
  const pmFactors: Record<RiskLevel, number> = {
    low: 0.75,
    moderate: 0.65,
    significant: 0.55,
    high: 0.5,
  };
  const performanceMateriality = overallMateriality * pmFactors[riskLevel];

  // Trivial threshold (typically 3-5% of overall materiality)
  const trivialThreshold = overallMateriality * 0.05;

  const materiality: MaterialityCalculation = {
    overallMateriality: Math.round(overallMateriality),
    performanceMateriality: Math.round(performanceMateriality),
    trivialThreshold: Math.round(trivialThreshold),
    basis: basisDescription,
    percentage,
    rationale: `Overall materiality calculated as ${percentage}% of ${basisDescription.toLowerCase()} (${benchmark.toLocaleString()}). Performance materiality set at ${pmFactors[riskLevel] * 100}% of overall materiality based on ${riskLevel} assessed risk.`,
  };

  return {
    success: true,
    data: materiality,
    nextSteps: [
      'Document materiality decisions in planning memorandum',
      'Communicate performance materiality to audit team',
      'Consider specific materiality for sensitive items',
      'Reassess materiality if circumstances change',
    ],
  };
}

/**
 * Calculate audit sample size
 */
export function calculateSampleSize(
  samplingData: MaterialityRequest['parameters']['samplingData']
): AgentResponse<SampleDesign> {
  if (!samplingData) {
    return {
      success: false,
      error: 'Sampling parameters required for sample size calculation',
    };
  }

  const { populationSize, populationValue, assessedRisk, tolerableMisstatement, expectedMisstatement = 0 } = samplingData;

  // Risk factor for confidence level (higher risk = larger sample)
  const riskFactors: Record<RiskLevel, number> = {
    low: 1.0,
    moderate: 1.5,
    significant: 2.0,
    high: 2.3,
  };
  const riskFactor = riskFactors[assessedRisk];

  // Expected misstatement factor
  const emFactor = expectedMisstatement > 0 ? Math.min(expectedMisstatement / tolerableMisstatement, 0.5) : 0;

  // Calculate sample size using simplified formula
  // n = (Population Value * Risk Factor) / (Tolerable Misstatement * (1 - EM Factor))
  let sampleSize = Math.ceil(
    (populationValue * riskFactor) / (tolerableMisstatement * (1 - emFactor))
  );

  // Apply minimum and maximum bounds
  sampleSize = Math.max(20, Math.min(sampleSize, populationSize));

  // Determine selection method
  const method = sampleSize > 50 ? 'statistical' : 'non_statistical';
  const selectionTechnique = sampleSize > 100 ? 'monetary_unit' : 'random';

  const design: SampleDesign = {
    method,
    selectionTechnique,
    sampleSize,
    rationale: `Sample size of ${sampleSize} calculated based on: population value ${populationValue.toLocaleString()}, tolerable misstatement ${tolerableMisstatement.toLocaleString()}, ${assessedRisk} risk level${expectedMisstatement > 0 ? `, expected misstatement ${expectedMisstatement.toLocaleString()}` : ''}.`,
  };

  return {
    success: true,
    data: design,
    nextSteps: [
      'Document sampling methodology in working papers',
      'Apply selected sampling technique consistently',
      'Investigate all identified deviations/misstatements',
      'Evaluate results against tolerable misstatement',
    ],
  };
}

/**
 * Project misstatements from sample to population
 */
export function projectSampleMisstatement(
  sampleResults: MaterialityRequest['parameters']['sampleResults'],
  populationValue: number,
  tolerableMisstatement: number
): AgentResponse<ProjectedMisstatement> {
  if (!sampleResults) {
    return {
      success: false,
      error: 'Sample results required for misstatement projection',
    };
  }

  const { sampleSize, sampleValue, misstatementsFound } = sampleResults;

  // Separate anomalies from representative errors
  const representativeErrors = misstatementsFound.filter((m) => !m.isAnomaly);
  const anomalies = misstatementsFound.filter((m) => m.isAnomaly);

  // Sum of known misstatements (anomalies not projected)
  const knownMisstatements = anomalies.reduce((sum, m) => sum + m.amount, 0);

  // Project representative errors
  const sampleMisstatements = representativeErrors.reduce((sum, m) => sum + m.amount, 0);
  const projectionFactor = populationValue / sampleValue;
  const projectedMisstatements = sampleMisstatements * projectionFactor;

  const totalLikelyMisstatement = knownMisstatements + projectedMisstatements;

  // Determine conclusion
  let conclusion: ProjectedMisstatement['conclusion'];
  const recommendations: string[] = [];

  if (totalLikelyMisstatement < tolerableMisstatement * 0.5) {
    conclusion = 'acceptable';
    recommendations.push('Sample results support conclusion that population is not materially misstated');
  } else if (totalLikelyMisstatement < tolerableMisstatement) {
    conclusion = 'further_procedures_required';
    recommendations.push('Total likely misstatement approaching tolerable misstatement');
    recommendations.push('Consider expanding sample size or performing additional procedures');
    recommendations.push('Request management correction of identified misstatements');
  } else {
    conclusion = 'material_misstatement';
    recommendations.push('Total likely misstatement exceeds tolerable misstatement');
    recommendations.push('Discuss with engagement partner regarding potential audit opinion impact');
    recommendations.push('Request management to investigate and correct errors');
    recommendations.push('Consider expanding testing to other areas');
  }

  return {
    success: true,
    data: {
      knownMisstatements,
      projectedMisstatements: Math.round(projectedMisstatements),
      totalLikelyMisstatement: Math.round(totalLikelyMisstatement),
      tolerableMisstatement,
      conclusion,
      recommendations,
    },
    nextSteps: recommendations,
  };
}

/**
 * Main agent handler
 */
export async function handleMaterialitySamplingRequest(
  request: MaterialityRequest
): Promise<AgentResponse<unknown>> {
  const { task, parameters } = request;

  switch (task) {
    case 'calculate_materiality':
      return calculateMaterialityThresholds(
        parameters.financialData,
        request.context.riskAssessment?.[0]?.inherentRisk || 'moderate'
      );

    case 'calculate_sample_size':
      return calculateSampleSize(parameters.samplingData);

    case 'project_misstatement':
    case 'evaluate_sample_results':
      if (!parameters.samplingData || !parameters.sampleResults) {
        return { success: false, error: 'Missing sampling data or sample results' };
      }
      return projectSampleMisstatement(
        parameters.sampleResults,
        parameters.samplingData.populationValue,
        parameters.samplingData.tolerableMisstatement
      );

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
