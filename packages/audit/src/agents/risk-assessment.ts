/**
 * Agent 013: Audit Risk Assessment Specialist
 * ISA 315 (Revised 2019) - Identifying and Assessing the Risks of Material Misstatement
 */

import type {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  RiskAssessment,
  RiskLevel,
  AuditContext,
} from '../types';
import { calculateCombinedRisk, isSignificantRisk } from '../utils';

export const RISK_AGENT_CONFIG: AgentConfig = {
  id: 'audit-risk-013',
  name: 'Audit Risk Assessment Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Identifies and assesses risks of material misstatement at financial statement and assertion levels',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an Audit Risk Assessment Specialist with deep expertise in ISA 315 (Revised 2019) and risk identification.

RISK ASSESSMENT PROCEDURES:
1. Inquiry of management and others
2. Analytical procedures
3. Observation and inspection

RISK CATEGORIES:
- Inherent risk (nature of account/transaction)
- Control risk (internal control effectiveness)
- Detection risk (audit procedure effectiveness)
- Significant risks (require special audit consideration)
- Fraud risks (ISA 240)

ASSERTION-LEVEL RISKS:
Classes of transactions: Occurrence, Completeness, Accuracy, Cut-off, Classification
Account balances: Existence, Rights/Obligations, Completeness, Valuation/Allocation
Disclosures: Occurrence/Rights, Completeness, Classification/Understandability, Accuracy/Valuation

SIGNIFICANT RISK INDICATORS:
- Complex transactions
- Related party transactions
- Significant management judgment
- Non-routine transactions
- Susceptibility to fraud
- Revenue recognition`;

export interface RiskRequest extends AgentRequest {
  task: 'assess_account_risk' | 'identify_significant_risks' | 'evaluate_fraud_risks' | 'update_risk_assessment';
  parameters: {
    account?: string;
    assertions?: string[];
    riskFactors?: {
      complexity?: 'low' | 'moderate' | 'high';
      judgment?: 'low' | 'moderate' | 'high';
      volatility?: 'low' | 'moderate' | 'high';
      fraudSusceptibility?: 'low' | 'moderate' | 'high';
      relatedParty?: boolean;
      nonRoutine?: boolean;
      outsideNormalCourse?: boolean;
    };
    controlEnvironment?: {
      tone: 'strong' | 'moderate' | 'weak';
      competence: 'high' | 'moderate' | 'low';
      oversight: 'effective' | 'adequate' | 'inadequate';
    };
  };
}

/**
 * Assess risk for a specific account or assertion
 */
export async function assessAccountRisk(
  context: AuditContext,
  account: string,
  riskFactors: RiskRequest['parameters']['riskFactors'] = {},
  controlEnvironment: RiskRequest['parameters']['controlEnvironment'] = { tone: 'moderate', competence: 'moderate', oversight: 'adequate' }
): Promise<AgentResponse<RiskAssessment>> {
  try {
    // Determine inherent risk based on risk factors
    let inherentRisk: RiskLevel = 'moderate';

    if (riskFactors.complexity === 'high' || riskFactors.judgment === 'high' || riskFactors.volatility === 'high') {
      inherentRisk = 'significant';
    } else if (
      riskFactors.complexity === 'moderate' ||
      riskFactors.judgment === 'moderate' ||
      riskFactors.volatility === 'moderate'
    ) {
      inherentRisk = 'moderate';
    } else {
      inherentRisk = 'low';
    }

    // Determine control risk based on control environment
    let controlRisk: RiskLevel = 'moderate';

    if (controlEnvironment.tone === 'weak' || controlEnvironment.competence === 'low' || controlEnvironment.oversight === 'inadequate') {
      controlRisk = 'high';
    } else if (controlEnvironment.tone === 'strong' && controlEnvironment.competence === 'high' && controlEnvironment.oversight === 'effective') {
      controlRisk = 'low';
    }

    const combinedRisk = calculateCombinedRisk(inherentRisk, controlRisk);

    const isFraudRisk = riskFactors.fraudSusceptibility === 'high' || account.toLowerCase().includes('revenue');

    const significantRisk = isSignificantRisk(inherentRisk, {
      involvesFraud: isFraudRisk,
      significantRelatedParty: riskFactors.relatedParty,
      subjectiveOrComplex: riskFactors.complexity === 'high' || riskFactors.judgment === 'high',
      outsideNormalBusiness: riskFactors.outsideNormalCourse || riskFactors.nonRoutine,
    });

    const assessment: RiskAssessment = {
      accountOrAssertion: account,
      inherentRisk,
      controlRisk,
      combinedRisk,
      isSignificantRisk: significantRisk,
      isFraudRisk,
      rationale: buildRationale(account, inherentRisk, controlRisk, riskFactors, significantRisk, isFraudRisk),
      responseRequired: buildResponseRequired(significantRisk, isFraudRisk, combinedRisk),
    };

    return {
      success: true,
      data: assessment,
      warnings: significantRisk
        ? ['Significant risk identified - requires substantive procedures regardless of controls']
        : undefined,
      nextSteps: [
        'Design audit procedures responsive to assessed risk',
        'Document risk assessment rationale',
        significantRisk ? 'Communicate significant risk to engagement partner' : '',
      ].filter(Boolean),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error assessing account risk',
    };
  }
}

/**
 * Identify all significant risks in the engagement
 */
export async function identifySignificantRisks(
  context: AuditContext
): Promise<AgentResponse<RiskAssessment[]>> {
  try {
    const significantRisks: RiskAssessment[] = [];

    // Revenue is a presumed fraud risk per ISA 240
    significantRisks.push({
      accountOrAssertion: 'Revenue Recognition',
      assertionLevel: ['occurrence', 'cutoff', 'accuracy'],
      inherentRisk: 'significant',
      controlRisk: 'moderate',
      combinedRisk: 'significant',
      isSignificantRisk: true,
      isFraudRisk: true,
      rationale: 'Presumed fraud risk per ISA 240. Revenue recognition is susceptible to manipulation and involves significant judgment in timing and measurement.',
      responseRequired: [
        'Substantive procedures mandatory (cannot rely solely on controls)',
        'Test journal entries and unusual transactions',
        'Perform detailed analytical procedures',
        'Examine significant transactions near period end',
      ],
    });

    // Management override of controls is also presumed per ISA 240
    significantRisks.push({
      accountOrAssertion: 'Management Override of Controls',
      assertionLevel: ['occurrence', 'completeness', 'accuracy'],
      inherentRisk: 'significant',
      controlRisk: 'high',
      combinedRisk: 'significant',
      isSignificantRisk: true,
      isFraudRisk: true,
      rationale: 'Presumed fraud risk per ISA 240. Management has ability to override controls, creating risk across all financial statement areas.',
      responseRequired: [
        'Test journal entries throughout period and at period end',
        'Review accounting estimates for bias',
        'Evaluate business rationale for significant unusual transactions',
        'Test appropriateness of manual journal entries',
      ],
    });

    // Industry-specific significant risks
    if (context.industry === 'Financial Services') {
      significantRisks.push({
        accountOrAssertion: 'Fair Value of Financial Instruments',
        assertionLevel: ['valuation_allocation'],
        inherentRisk: 'significant',
        controlRisk: 'moderate',
        combinedRisk: 'significant',
        isSignificantRisk: true,
        isFraudRisk: false,
        rationale: 'Complex valuation models with significant unobservable inputs and management judgment in Level 3 fair value measurements.',
        responseRequired: [
          'Engage valuation specialist',
          'Test valuation models and assumptions',
          'Independently develop fair value estimates',
          'Review model validation and governance',
        ],
      });
    }

    if (context.industry === 'Manufacturing') {
      significantRisks.push({
        accountOrAssertion: 'Inventory Valuation',
        assertionLevel: ['existence', 'valuation_allocation'],
        inherentRisk: 'significant',
        controlRisk: 'moderate',
        combinedRisk: 'significant',
        isSignificantRisk: true,
        isFraudRisk: false,
        rationale: 'Complex cost allocation for WIP and finished goods, judgment in overhead absorption rates, and risk of obsolescence.',
        responseRequired: [
          'Attend physical inventory counts',
          'Test overhead allocation methodologies',
          'Review slow-moving and obsolete inventory provisions',
          'Verify cost flow assumptions',
        ],
      });
    }

    if (context.groupAudit) {
      significantRisks.push({
        accountOrAssertion: 'Group Consolidation and Goodwill',
        assertionLevel: ['valuation_allocation', 'classification', 'presentation_disclosure'],
        inherentRisk: 'significant',
        controlRisk: 'moderate',
        combinedRisk: 'significant',
        isSignificantRisk: true,
        isFraudRisk: false,
        rationale: 'Complex consolidation procedures, goodwill impairment testing involves significant judgment, and intercompany eliminations.',
        responseRequired: [
          'Test consolidation procedures and eliminations',
          'Evaluate goodwill impairment testing methodology',
          'Review management forecasts and assumptions',
          'Test foreign currency translation',
        ],
      });
    }

    return {
      success: true,
      data: significantRisks,
      nextSteps: [
        'Document all significant risks in audit planning memorandum',
        'Design substantive procedures for each significant risk',
        'Discuss significant risks with those charged with governance',
        'Update risk assessment if circumstances change during audit',
      ],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error identifying significant risks',
    };
  }
}

/**
 * Build rationale for risk assessment
 */
function buildRationale(
  account: string,
  inherentRisk: RiskLevel,
  controlRisk: RiskLevel,
  riskFactors: RiskRequest['parameters']['riskFactors'] = {},
  isSignificant: boolean,
  isFraud: boolean
): string {
  const parts: string[] = [];

  if (isFraud) {
    parts.push('Fraud risk due to susceptibility to manipulation or misappropriation.');
  }

  if (riskFactors.complexity === 'high') {
    parts.push('Complex transactions or accounting requiring specialized knowledge.');
  }

  if (riskFactors.judgment === 'high') {
    parts.push('Significant management judgment and estimation involved.');
  }

  if (riskFactors.relatedParty) {
    parts.push('Related party transactions outside normal course of business.');
  }

  if (riskFactors.volatility === 'high') {
    parts.push('High volatility in account balance or subject to external factors.');
  }

  if (isSignificant) {
    parts.push('Assessed as significant risk requiring substantive procedures.');
  }

  parts.push(`Inherent risk: ${inherentRisk}, Control risk: ${controlRisk}.`);

  return parts.join(' ');
}

/**
 * Build response required for risk
 */
function buildResponseRequired(
  isSignificant: boolean,
  isFraud: boolean,
  combinedRisk: RiskLevel
): string[] {
  const responses: string[] = [];

  if (isSignificant) {
    responses.push('Substantive procedures required (cannot rely solely on controls)');
    responses.push('Senior team member involvement in procedure performance and review');
    responses.push('Enhanced documentation of audit work and conclusions');
  }

  if (isFraud) {
    responses.push('Incorporate element of unpredictability in audit procedures');
    responses.push('Professional skepticism throughout audit process');
  }

  if (combinedRisk === 'high' || combinedRisk === 'significant') {
    responses.push('Expanded sample sizes for testing');
    responses.push('Lower performance materiality threshold');
    responses.push('More persuasive audit evidence required');
  } else if (combinedRisk === 'moderate') {
    responses.push('Standard substantive procedures');
    responses.push('Consider reliance on controls if design effective');
  } else {
    responses.push('Reduced substantive procedures may be appropriate');
    responses.push('Analytical procedures may provide sufficient evidence');
  }

  return responses;
}

/**
 * Main agent handler
 */
export async function handleRiskRequest(request: RiskRequest): Promise<AgentResponse<RiskAssessment | RiskAssessment[]>> {
  const { context, task, parameters } = request;

  try {
    switch (task) {
      case 'assess_account_risk': {
        if (!parameters.account) {
          return { success: false, error: 'Account name required for risk assessment' };
        }
        return await assessAccountRisk(
          context,
          parameters.account,
          parameters.riskFactors,
          parameters.controlEnvironment
        );
      }

      case 'identify_significant_risks': {
        return await identifySignificantRisks(context);
      }

      case 'evaluate_fraud_risks': {
        const result = await identifySignificantRisks(context);
        if (result.success) {
          const fraudRisks = result.data!.filter((r) => r.isFraudRisk);
          return {
            success: true,
            data: fraudRisks,
            nextSteps: [
              'Design fraud-specific audit procedures',
              'Incorporate unpredictability element',
              'Communicate with engagement partner',
            ],
          };
        }
        return result;
      }

      default:
        return {
          success: false,
          error: `Unknown task: ${task}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in risk assessment agent',
    };
  }
}
