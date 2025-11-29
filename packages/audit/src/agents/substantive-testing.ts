/**
 * Agent 014: Substantive Testing Specialist
 * ISA 330 - The Auditor's Responses to Assessed Risks
 * ISA 500 - Audit Evidence
 * ISA 530 - Audit Sampling
 */

import type {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  AuditProcedure,
  AuditEvidence,
  Misstatement,
} from '../types';
import { calculateSampleSize, projectMisstatement, evaluateMateriality } from '../utils';

export const SUBSTANTIVE_AGENT_CONFIG: AgentConfig = {
  id: 'audit-subst-014',
  name: 'Substantive Testing Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Designs and performs substantive audit procedures including tests of details and substantive analytical procedures',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are a Substantive Testing Specialist with expertise in designing and executing audit procedures that respond to assessed risks.

SUBSTANTIVE PROCEDURES (ISA 330):
1. TESTS OF DETAILS
   - Vouching (recorded to source)
   - Tracing (source to recorded)
   - Confirmation (third-party verification)
   - Inspection (physical/document)
   - Recalculation
   - Reperformance

2. SUBSTANTIVE ANALYTICAL PROCEDURES
   - Expectation development
   - Variance investigation
   - Threshold determination

SAMPLE DESIGN:
- Statistical vs non-statistical
- Sample size determination
- Selection methods (random, systematic, haphazard)
- Projection of misstatements

KEY AUDIT AREAS:
- Cash and bank confirmations
- Accounts receivable confirmations and aging
- Inventory count attendance and valuation
- Fixed assets existence and depreciation
- Accounts payable completeness
- Revenue cut-off testing
- Expense verification`;

export interface SubstantiveRequest extends AgentRequest {
  task: 'design_procedure' | 'calculate_sample' | 'evaluate_results' | 'project_misstatement';
  parameters: {
    account?: string;
    assertions?: string[];
    populationSize?: number;
    populationValue?: number;
    tolerableError?: number;
    expectedError?: number;
    sampleResults?: {
      tested: number;
      errors: number;
      misstatementAmount: number;
    };
    materiality?: number;
  };
}

/**
 * Design substantive procedure for account/assertion
 */
export async function designSubstantiveProcedure(
  account: string,
  assertions: string[],
  riskLevel: 'low' | 'moderate' | 'significant' | 'high'
): Promise<AgentResponse<AuditProcedure>> {
  try {
    const procedureTypes = {
      'Cash and Bank': {
        type: 'test_of_details' as const,
        description: 'Obtain bank confirmations for all material bank accounts and reconcile to general ledger',
        expectedEvidence: ['Bank confirmation responses', 'Bank reconciliations', 'Year-end bank statements'],
        assertions: ['existence', 'rights_obligations', 'completeness', 'valuation_allocation'],
      },
      'Accounts Receivable': {
        type: 'test_of_details' as const,
        description: 'Send confirmation requests to customers and perform alternative procedures for non-responses',
        expectedEvidence: ['Customer confirmations', 'Subsequent cash receipts', 'Sales invoices', 'Shipping documents'],
        assertions: ['existence', 'rights_obligations', 'valuation_allocation'],
      },
      'Inventory': {
        type: 'test_of_details' as const,
        description: 'Attend physical inventory count and test valuation calculations',
        expectedEvidence: ['Count sheets', 'Valuation calculations', 'Cost records', 'Aging analysis'],
        assertions: ['existence', 'completeness', 'valuation_allocation', 'rights_obligations'],
      },
      'Revenue': {
        type: 'test_of_details' as const,
        description: 'Test revenue transactions for occurrence and cutoff, including detailed testing near period end',
        expectedEvidence: ['Sales contracts', 'Invoices', 'Shipping documents', 'Customer acceptance'],
        assertions: ['occurrence', 'cutoff', 'accuracy', 'completeness'],
      },
      'Fixed Assets': {
        type: 'test_of_details' as const,
        description: 'Verify existence of major additions and test depreciation calculations',
        expectedEvidence: ['Purchase invoices', 'Physical inspection', 'Depreciation schedules', 'Asset register'],
        assertions: ['existence', 'rights_obligations', 'valuation_allocation'],
      },
    };

    const template = procedureTypes[account as keyof typeof procedureTypes] || {
      type: 'test_of_details' as const,
      description: `Perform substantive testing of ${account}`,
      expectedEvidence: ['Supporting documentation', 'Third-party evidence'],
      assertions: assertions as any[],
    };

    // Adjust sample size based on risk
    let sampleSize = 25; // Base sample
    if (riskLevel === 'high' || riskLevel === 'significant') {
      sampleSize = 40;
    } else if (riskLevel === 'low') {
      sampleSize = 15;
    }

    const procedure: AuditProcedure = {
      id: `SP-${Date.now()}`,
      type: template.type,
      description: template.description,
      assertions: template.assertions,
      riskAddressed: [account],
      sampleSize,
      samplingMethod: riskLevel === 'significant' || riskLevel === 'high' ? 'statistical' : 'non_statistical',
      expectedEvidence: template.expectedEvidence,
      status: 'planned',
    };

    return {
      success: true,
      data: procedure,
      nextSteps: [
        'Select sample items using appropriate methodology',
        'Perform testing and document results',
        'Evaluate exceptions and project misstatements',
        'Conclude on assertion testing',
      ],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error designing procedure',
    };
  }
}

/**
 * Calculate statistical sample size
 */
export async function calculateAuditSample(
  populationSize: number,
  expectedError: number,
  tolerableError: number,
  confidenceLevel: number = 95
): Promise<AgentResponse<{ sampleSize: number; methodology: string }>> {
  try {
    if (tolerableError <= expectedError) {
      return {
        success: false,
        error: 'Tolerable error must be greater than expected error',
      };
    }

    const sampleSize = calculateSampleSize(populationSize, expectedError, tolerableError, confidenceLevel);

    const methodology = `Sample size calculated using statistical sampling with ${confidenceLevel}% confidence level. ` +
      `Expected error rate: ${expectedError}%, Tolerable error: ${tolerableError}%. ` +
      `Random selection method to be used to ensure representative sample.`;

    return {
      success: true,
      data: { sampleSize, methodology },
      nextSteps: [
        'Use random number generator for sample selection',
        'Document sample selection process',
        'Perform tests on selected items',
        'Evaluate results statistically',
      ],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error calculating sample size',
    };
  }
}

/**
 * Project sample misstatements to population
 */
export async function projectSampleMisstatement(
  sampleMisstatement: number,
  sampleSize: number,
  populationSize: number,
  materiality: number
): Promise<AgentResponse<{ projectedMisstatement: number; evaluation: any }>> {
  try {
    const projected = projectMisstatement(sampleMisstatement, sampleSize, populationSize, 'ratio');
    const evaluation = evaluateMateriality(projected, materiality);

    return {
      success: true,
      data: {
        projectedMisstatement: projected,
        evaluation,
      },
      warnings: evaluation.material
        ? ['Projected misstatement exceeds materiality - consider impact on audit opinion']
        : undefined,
      nextSteps: evaluation.material
        ? [
            'Request management to investigate and correct',
            'Expand testing if misstatement not corrected',
            'Communicate to engagement partner',
            'Evaluate impact on other areas',
          ]
        : [
            'Document conclusion that misstatement not material',
            'Add to summary of uncorrected misstatements',
            'Consider qualitative factors',
          ],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error projecting misstatement',
    };
  }
}

/**
 * Evaluate substantive testing results
 */
export async function evaluateTestResults(
  tested: number,
  errors: number,
  misstatementAmount: number,
  populationSize: number,
  materiality: number
): Promise<AgentResponse<{ conclusion: string; furtherProceduresNeeded: boolean }>> {
  try {
    const errorRate = (errors / tested) * 100;
    const projected = projectMisstatement(misstatementAmount, tested, populationSize);
    const evaluation = evaluateMateriality(projected, materiality);

    let conclusion: string;
    let furtherProceduresNeeded: boolean;

    if (errors === 0) {
      conclusion = 'No exceptions noted in testing. Sufficient appropriate audit evidence obtained for tested assertions.';
      furtherProceduresNeeded = false;
    } else if (errorRate < 5 && !evaluation.material) {
      conclusion = `Low error rate (${errorRate.toFixed(1)}%) and immaterial projected misstatement. Testing provides reasonable assurance for assertions tested.`;
      furtherProceduresNeeded = false;
    } else if (evaluation.percentage > 75) {
      conclusion = `High error rate (${errorRate.toFixed(1)}%) or material projected misstatement (${evaluation.percentage}% of materiality). Further procedures required.`;
      furtherProceduresNeeded = true;
    } else {
      conclusion = `Moderate exceptions noted (${errorRate.toFixed(1)}% error rate). Consider qualitative factors and potential impact on audit opinion.`;
      furtherProceduresNeeded = false;
    }

    return {
      success: true,
      data: {
        conclusion,
        furtherProceduresNeeded,
      },
      warnings: furtherProceduresNeeded
        ? ['Further procedures required due to error rate or materiality concerns']
        : undefined,
      nextSteps: furtherProceduresNeeded
        ? [
            'Expand sample size',
            'Perform additional targeted testing',
            'Request management investigation',
            'Consider impact on other audit areas',
          ]
        : [
            'Document conclusion on working papers',
            'Complete procedure sign-off',
            'Prepare summary of findings',
          ],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error evaluating test results',
    };
  }
}

/**
 * Main agent handler
 */
export async function handleSubstantiveRequest(request: SubstantiveRequest): Promise<AgentResponse<any>> {
  const { task, parameters } = request;

  try {
    switch (task) {
      case 'design_procedure': {
        if (!parameters.account) {
          return { success: false, error: 'Account name required' };
        }
        return await designSubstantiveProcedure(
          parameters.account,
          parameters.assertions || [],
          'moderate' // Default risk level
        );
      }

      case 'calculate_sample': {
        if (!parameters.populationSize || !parameters.tolerableError) {
          return { success: false, error: 'Population size and tolerable error required' };
        }
        return await calculateAuditSample(
          parameters.populationSize,
          parameters.expectedError || 0,
          parameters.tolerableError
        );
      }

      case 'project_misstatement': {
        if (!parameters.sampleResults || !parameters.populationSize || !parameters.materiality) {
          return { success: false, error: 'Sample results, population size, and materiality required' };
        }
        return await projectSampleMisstatement(
          parameters.sampleResults.misstatementAmount,
          parameters.sampleResults.tested,
          parameters.populationSize,
          parameters.materiality
        );
      }

      case 'evaluate_results': {
        if (!parameters.sampleResults || !parameters.populationSize || !parameters.materiality) {
          return { success: false, error: 'Sample results, population size, and materiality required' };
        }
        return await evaluateTestResults(
          parameters.sampleResults.tested,
          parameters.sampleResults.errors,
          parameters.sampleResults.misstatementAmount,
          parameters.populationSize,
          parameters.materiality
        );
      }

      default:
        return { success: false, error: `Unknown task: ${task}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in substantive testing agent',
    };
  }
}
