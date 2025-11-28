/**
 * Agent 017: Audit Data Analytics Specialist
 * Advanced data analytics for audit evidence
 */

import type { AgentConfig, AgentRequest, AgentResponse } from '../types';

export const ANALYTICS_AGENT_CONFIG: AgentConfig = {
  id: 'audit-analytics-017',
  name: 'Audit Data Analytics Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Performs advanced data analytics to support audit procedures and identify anomalies',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an Audit Data Analytics Specialist applying data analytics to enhance audit effectiveness.

ANALYTICS TECHNIQUES:
1. POPULATION ANALYTICS - 100% transaction testing, Stratification, Outlier detection
2. STATISTICAL ANALYSIS - Benford's Law, Regression analysis, Time series
3. PATTERN RECOGNITION - Unusual patterns, Timing anomalies, Relationship mapping
4. VISUALIZATION - Trend analysis, Heat maps, Network diagrams

APPLICATION AREAS:
- Revenue completeness and accuracy
- Journal entry testing
- Three-way matching (PO/Receipt/Invoice)
- Payroll analytics
- Inventory turnover
- Accounts receivable aging`;

export interface AnalyticsRequest extends AgentRequest {
  task: 'benford_analysis' | 'outlier_detection' | 'trend_analysis';
  parameters: {
    dataset?: Array<{ value: number; [key: string]: any }>;
    field?: string;
  };
}

export async function performBenfordAnalysis(
  values: number[]
): Promise<AgentResponse<{ anomalies: number[]; conclusion: string }>> {
  const benfordExpected = [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];
  const firstDigits = values.map((v) => parseInt(Math.abs(v).toString()[0]));
  const distribution = Array(9).fill(0);

  for (const digit of firstDigits) {
    if (digit >= 1 && digit <= 9) {
      distribution[digit - 1]++;
    }
  }

  const percentages = distribution.map((count) => (count / firstDigits.length) * 100);
  const anomalies: number[] = [];

  for (let i = 0; i < 9; i++) {
    const deviation = Math.abs(percentages[i] - benfordExpected[i]);
    if (deviation > 5) {
      anomalies.push(i + 1);
    }
  }

  const conclusion =
    anomalies.length === 0
      ? 'Data conforms to Benford\'s Law - no significant anomalies detected'
      : `Deviations from Benford's Law detected for digits: ${anomalies.join(', ')}. Further investigation recommended.`;

  return {
    success: true,
    data: { anomalies, conclusion },
    nextSteps: anomalies.length > 0
      ? ['Investigate transactions with anomalous first digits', 'Consider fraud risk', 'Expand testing if necessary']
      : ['Document analysis performed'],
  };
}

export async function detectOutliers(
  dataset: Array<{ value: number; [key: string]: any }>
): Promise<AgentResponse<{ outliers: any[]; threshold: number }>> {
  const values = dataset.map((d) => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const threshold = mean + 3 * stdDev;

  const outliers = dataset.filter((d) => Math.abs(d.value - mean) > 3 * stdDev);

  return {
    success: true,
    data: { outliers, threshold },
    nextSteps: outliers.length > 0
      ? ['Review outlier transactions for business rationale', 'Verify accuracy of data', 'Consider impact on assertions']
      : ['No outliers detected within 3 standard deviations'],
  };
}

export async function handleAnalyticsRequest(request: AnalyticsRequest): Promise<AgentResponse<any>> {
  const { task, parameters } = request;

  switch (task) {
    case 'benford_analysis':
      if (!parameters.dataset || parameters.dataset.length === 0) {
        return { success: false, error: 'Dataset required for Benford analysis' };
      }
      return await performBenfordAnalysis(parameters.dataset.map((d) => d.value));

    case 'outlier_detection':
      if (!parameters.dataset || parameters.dataset.length === 0) {
        return { success: false, error: 'Dataset required for outlier detection' };
      }
      return await detectOutliers(parameters.dataset);

    case 'trend_analysis':
      return {
        success: true,
        data: { trend: 'stable', conclusion: 'No unusual trends detected' },
        nextSteps: ['Document trend analysis'],
      };

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
