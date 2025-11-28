/**
 * Audit Calculation Utilities
 * Helper functions for materiality, sampling, and risk calculations
 */

import type { MaterialityCalculation, RiskLevel } from '../types';

/**
 * Calculate materiality based on financial statement benchmark
 */
export function calculateMateriality(
  benchmark: number,
  benchmarkType: 'revenue' | 'assets' | 'equity' | 'profit_before_tax',
  entityType: 'profit_oriented' | 'non_profit' | 'public_sector' = 'profit_oriented'
): MaterialityCalculation {
  // Standard percentages based on ISA 320 guidance
  let percentage: number;
  let basis: string;

  switch (benchmarkType) {
    case 'profit_before_tax':
      percentage = 5;
      basis = 'Profit Before Tax';
      break;
    case 'revenue':
      percentage = entityType === 'non_profit' ? 2 : 1;
      basis = 'Total Revenue';
      break;
    case 'assets':
      percentage = 1;
      basis = 'Total Assets';
      break;
    case 'equity':
      percentage = 5;
      basis = 'Total Equity';
      break;
  }

  const overallMateriality = Math.round(benchmark * (percentage / 100));
  const performanceMateriality = Math.round(overallMateriality * 0.75); // Typically 50-75%
  const trivialThreshold = Math.round(overallMateriality * 0.05); // Typically 3-5%

  return {
    overallMateriality,
    performanceMateriality,
    trivialThreshold,
    basis,
    percentage,
    rationale: `Calculated as ${percentage}% of ${basis} (${formatCurrency(benchmark)}). Performance materiality set at 75% and trivial threshold at 5% of overall materiality.`,
  };
}

/**
 * Calculate sample size for substantive testing
 */
export function calculateSampleSize(
  populationSize: number,
  expectedError: number = 0,
  tolerableError: number,
  confidenceLevel: number = 95
): number {
  // Simplified statistical sampling formula
  // For production, use more sophisticated methods (MUS, classical variables sampling)
  
  const zScore = confidenceLevel === 95 ? 1.96 : confidenceLevel === 90 ? 1.65 : 2.58;
  const p = Math.max(expectedError, 0.5); // Proportion
  const e = tolerableError / 100; // Margin of error

  let n = Math.ceil((zScore ** 2 * p * (100 - p)) / (e ** 2 * 100));

  // Finite population correction
  if (populationSize < 100000) {
    n = Math.ceil(n / (1 + (n - 1) / populationSize));
  }

  return Math.min(n, populationSize);
}

/**
 * Calculate combined risk of material misstatement
 */
export function calculateCombinedRisk(inherentRisk: RiskLevel, controlRisk: RiskLevel): RiskLevel {
  const riskMap: Record<RiskLevel, number> = {
    low: 1,
    moderate: 2,
    significant: 3,
    high: 4,
  };

  const reverseMap: Record<number, RiskLevel> = {
    1: 'low',
    2: 'moderate',
    3: 'significant',
    4: 'high',
  };

  const inherentScore = riskMap[inherentRisk];
  const controlScore = riskMap[controlRisk];
  
  // Combined risk is roughly the average, rounded up
  const combined = Math.ceil((inherentScore + controlScore) / 2);
  
  return reverseMap[Math.min(combined, 4)];
}

/**
 * Determine if risk is significant per ISA 315
 */
export function isSignificantRisk(
  inherentRisk: RiskLevel,
  factors: {
    involvesFraud?: boolean;
    significantRelatedParty?: boolean;
    subjectiveOrComplex?: boolean;
    outsideNormalBusiness?: boolean;
  }
): boolean {
  // Significant risk indicators per ISA 315
  const hasIndicator =
    factors.involvesFraud ||
    factors.significantRelatedParty ||
    factors.subjectiveOrComplex ||
    factors.outsideNormalBusiness;

  return inherentRisk === 'high' || (inherentRisk === 'significant' && hasIndicator);
}

/**
 * Project misstatements from sample to population
 */
export function projectMisstatement(
  sampleMisstatement: number,
  sampleSize: number,
  populationSize: number,
  method: 'ratio' | 'difference' = 'ratio'
): number {
  if (method === 'ratio') {
    return Math.round(sampleMisstatement * (populationSize / sampleSize));
  }
  // Difference estimation would require sample book value
  return sampleMisstatement;
}

/**
 * Evaluate if misstatements are material
 */
export function evaluateMateriality(
  totalMisstatement: number,
  overallMateriality: number
): { material: boolean; percentage: number; conclusion: string } {
  const percentage = (totalMisstatement / overallMateriality) * 100;

  let conclusion: string;
  if (percentage < 5) {
    conclusion = 'Clearly trivial - no impact on audit opinion';
  } else if (percentage < 75) {
    conclusion = 'Below performance materiality - evaluate qualitative factors';
  } else if (percentage < 100) {
    conclusion = 'Approaching materiality - consider accumulated impact';
  } else {
    conclusion = 'Material - likely requires qualified or adverse opinion if uncorrected';
  }

  return {
    material: percentage >= 100,
    percentage: Math.round(percentage * 10) / 10,
    conclusion,
  };
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
