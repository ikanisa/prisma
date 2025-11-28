/**
 * Agent 012: Audit Planning Specialist
 * ISA 300 - Planning an Audit of Financial Statements
 * ISA 315 - Identifying and Assessing RoMM
 * ISA 320 - Materiality in Planning and Performing an Audit
 */

import type {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  AuditContext,
  MaterialityCalculation,
  RiskAssessment,
  AuditProcedure,
} from '../types';
import { calculateMateriality, isSignificantRisk } from '../utils';

export const PLANNING_AGENT_CONFIG: AgentConfig = {
  id: 'audit-plan-012',
  name: 'Audit Planning Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Develops comprehensive audit plans based on risk assessment, materiality calculations, and ISA requirements',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are an Audit Planning Specialist with expertise in ISA-compliant audit planning and risk assessment.

PLANNING FRAMEWORK (ISA 300):
1. PRELIMINARY ACTIVITIES
   - Engagement acceptance/continuance
   - Scope determination
   - Team composition
   - Independence confirmation

2. RISK ASSESSMENT (ISA 315)
   - Understanding the entity and environment
   - Internal control evaluation
   - Significant risk identification
   - Risk of material misstatement (RMM)

3. MATERIALITY (ISA 320)
   - Overall materiality calculation
   - Performance materiality
   - Specific materiality thresholds
   - Trivial threshold

4. AUDIT STRATEGY
   - Nature, timing, extent of procedures
   - Resource allocation
   - Timeline development
   - Specialist needs assessment

INDUSTRY CONSIDERATIONS:
- Manufacturing: Inventory, WIP valuation
- Financial services: Complex instruments, regulatory
- Technology: Revenue recognition, intangibles
- Real estate: Property valuation, lease accounting
- Healthcare: Regulatory compliance, revenue

KEY OUTPUTS:
- Audit strategy memorandum
- Materiality calculations with rationale
- Risk assessment matrix
- Detailed audit program
- Resource allocation plan
- Timeline with key milestones`;

export interface PlanningRequest extends AgentRequest {
  task: 'calculate_materiality' | 'assess_risks' | 'develop_strategy' | 'create_audit_program';
  parameters: {
    financialData?: {
      revenue?: number;
      assets?: number;
      equity?: number;
      profitBeforeTax?: number;
    };
    riskFactors?: {
      firstYearAudit?: boolean;
      significantChanges?: string[];
      complexTransactions?: string[];
      industryRisks?: string[];
    };
    teamComposition?: {
      partner?: string;
      manager?: string;
      seniors?: number;
      staff?: number;
      specialists?: string[];
    };
  };
}

export interface PlanningResponse {
  materiality?: MaterialityCalculation;
  riskAssessments?: RiskAssessment[];
  auditStrategy?: {
    approach: 'controls_reliance' | 'substantive' | 'combined';
    timingStrategy: 'interim_final' | 'year_end_only';
    specialistNeeds: string[];
    keyFocusAreas: string[];
  };
  auditProgram?: AuditProcedure[];
  timeline?: {
    planning: string;
    interim: string;
    yearEnd: string;
    completion: string;
  };
}

/**
 * Calculate materiality for audit planning
 */
export async function calculateAuditMateriality(
  context: AuditContext,
  financialData: PlanningRequest['parameters']['financialData']
): Promise<AgentResponse<MaterialityCalculation>> {
  try {
    if (!financialData) {
      return {
        success: false,
        error: 'Financial data required for materiality calculation',
      };
    }

    // Select appropriate benchmark
    let benchmark: number;
    let benchmarkType: 'revenue' | 'assets' | 'equity' | 'profit_before_tax';

    if (financialData.profitBeforeTax && financialData.profitBeforeTax > 0) {
      benchmark = financialData.profitBeforeTax;
      benchmarkType = 'profit_before_tax';
    } else if (financialData.revenue) {
      benchmark = financialData.revenue;
      benchmarkType = 'revenue';
    } else if (financialData.assets) {
      benchmark = financialData.assets;
      benchmarkType = 'assets';
    } else {
      return {
        success: false,
        error: 'Insufficient financial data for materiality calculation',
      };
    }

    const materiality = calculateMateriality(benchmark, benchmarkType);

    return {
      success: true,
      data: materiality,
      warnings: context.firstYearAudit
        ? ['First year audit - consider additional procedures for opening balances']
        : undefined,
      nextSteps: [
        'Review and approve materiality levels with engagement partner',
        'Communicate performance materiality to audit team',
        'Document materiality in planning memorandum',
      ],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error calculating materiality',
    };
  }
}

/**
 * Assess risks of material misstatement
 */
export async function assessRisks(
  context: AuditContext,
  riskFactors: PlanningRequest['parameters']['riskFactors'] = {}
): Promise<AgentResponse<RiskAssessment[]>> {
  try {
    const risks: RiskAssessment[] = [];

    // Standard financial statement areas with risk assessment
    const standardAccounts = [
      {
        account: 'Revenue',
        inherentRisk: 'significant' as const,
        controlRisk: 'moderate' as const,
        fraudRisk: true,
        rationale: 'Presumed fraud risk per ISA 240 - revenue recognition susceptible to manipulation',
      },
      {
        account: 'Cash and Bank',
        inherentRisk: 'significant' as const,
        controlRisk: 'moderate' as const,
        fraudRisk: true,
        rationale: 'High liquidity and susceptibility to misappropriation',
      },
      {
        account: 'Accounts Receivable',
        inherentRisk: 'moderate' as const,
        controlRisk: 'moderate' as const,
        fraudRisk: false,
        rationale: 'Valuation and collectibility require judgment',
      },
      {
        account: 'Inventory',
        inherentRisk: context.industry === 'Manufacturing' ? 'significant' as const : 'moderate' as const,
        controlRisk: 'moderate' as const,
        fraudRisk: false,
        rationale: context.industry === 'Manufacturing' 
          ? 'Complex valuation including WIP and overhead allocation'
          : 'Valuation and existence require verification',
      },
      {
        account: 'Fixed Assets',
        inherentRisk: 'low' as const,
        controlRisk: 'low' as const,
        fraudRisk: false,
        rationale: 'Low volume of transactions, straightforward depreciation calculations',
      },
      {
        account: 'Accounts Payable',
        inherentRisk: 'moderate' as const,
        controlRisk: 'moderate' as const,
        fraudRisk: false,
        rationale: 'Completeness assertion - unrecorded liabilities risk',
      },
      {
        account: 'Debt and Borrowings',
        inherentRisk: 'moderate' as const,
        controlRisk: 'low' as const,
        fraudRisk: false,
        rationale: 'Complex terms and covenants require review',
      },
    ];

    for (const account of standardAccounts) {
      const significantRisk = isSignificantRisk(account.inherentRisk, {
        involvesFraud: account.fraudRisk,
        subjectiveOrComplex: account.inherentRisk === 'significant',
      });

      risks.push({
        accountOrAssertion: account.account,
        inherentRisk: account.inherentRisk,
        controlRisk: account.controlRisk,
        combinedRisk: significantRisk ? 'significant' : account.inherentRisk,
        isSignificantRisk: significantRisk,
        isFraudRisk: account.fraudRisk,
        rationale: account.rationale,
        responseRequired: significantRisk
          ? ['Substantive procedures only', 'Senior team member involvement', 'Enhanced documentation']
          : ['Standard substantive procedures'],
      });
    }

    // Add industry-specific risks
    if (context.industry === 'Technology' && riskFactors.complexTransactions?.includes('SaaS Revenue')) {
      risks.push({
        accountOrAssertion: 'Revenue - SaaS Contracts',
        assertionLevel: ['occurrence', 'cutoff', 'accuracy'],
        inherentRisk: 'significant',
        controlRisk: 'moderate',
        combinedRisk: 'significant',
        isSignificantRisk: true,
        isFraudRisk: false,
        rationale: 'Complex multi-element arrangements with performance obligations over time',
        responseRequired: [
          'Detailed contract review',
          'IFRS 15 compliance assessment',
          'Deferred revenue testing',
        ],
      });
    }

    return {
      success: true,
      data: risks,
      warnings: riskFactors.firstYearAudit
        ? ['First year audit requires additional procedures for opening balances']
        : undefined,
      nextSteps: [
        'Document risk assessment in audit planning memorandum',
        'Design audit procedures responsive to assessed risks',
        'Communicate significant risks to engagement partner',
        'Update risk assessment if circumstances change',
      ],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error assessing risks',
    };
  }
}

/**
 * Create audit program based on risk assessment
 */
export async function createAuditProgram(
  context: AuditContext,
  risks: RiskAssessment[]
): Promise<AgentResponse<AuditProcedure[]>> {
  try {
    const procedures: AuditProcedure[] = [];
    let procedureId = 1;

    for (const risk of risks) {
      if (risk.isSignificantRisk) {
        // Significant risks require substantive procedures
        procedures.push({
          id: `AP-${String(procedureId++).padStart(3, '0')}`,
          type: 'test_of_details',
          description: `Perform detailed substantive testing of ${risk.accountOrAssertion}`,
          assertions: risk.assertionLevel || ['existence', 'completeness', 'valuation_allocation'],
          riskAddressed: [risk.accountOrAssertion],
          sampleSize: 25,
          samplingMethod: 'judgmental',
          expectedEvidence: ['Supporting documentation', 'Third-party confirmations', 'Recalculations'],
          status: 'planned',
        });
      }

      if (risk.isFraudRisk) {
        // Fraud risks require unpredictable procedures
        procedures.push({
          id: `AP-${String(procedureId++).padStart(3, '0')}`,
          type: 'test_of_details',
          description: `Perform unpredictable procedures for ${risk.accountOrAssertion} to address fraud risk`,
          assertions: ['occurrence', 'completeness', 'accuracy'],
          riskAddressed: [risk.accountOrAssertion],
          expectedEvidence: ['Journal entry testing', 'Unusual transaction analysis', 'Management override testing'],
          status: 'planned',
        });
      }
    }

    return {
      success: true,
      data: procedures,
      nextSteps: [
        'Review audit program with engagement manager',
        'Allocate procedures to team members',
        'Establish timeline for procedure performance',
        'Document rationale for procedure selection',
      ],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating audit program',
    };
  }
}

/**
 * Main agent handler
 */
export async function handlePlanningRequest(
  request: PlanningRequest
): Promise<AgentResponse<PlanningResponse>> {
  const { context, task, parameters } = request;

  try {
    const response: PlanningResponse = {};

    switch (task) {
      case 'calculate_materiality': {
        const result = await calculateAuditMateriality(context, parameters.financialData);
        if (result.success) {
          response.materiality = result.data;
        }
        return { success: result.success, data: response, error: result.error };
      }

      case 'assess_risks': {
        const result = await assessRisks(context, parameters.riskFactors);
        if (result.success) {
          response.riskAssessments = result.data;
        }
        return { success: result.success, data: response, error: result.error };
      }

      case 'create_audit_program': {
        // First assess risks if not provided
        const riskResult = await assessRisks(context, parameters.riskFactors);
        if (!riskResult.success) {
          return { success: false, error: riskResult.error };
        }

        const programResult = await createAuditProgram(context, riskResult.data!);
        if (programResult.success) {
          response.auditProgram = programResult.data;
          response.riskAssessments = riskResult.data;
        }
        return { success: programResult.success, data: response, error: programResult.error };
      }

      case 'develop_strategy': {
        // Comprehensive planning including all elements
        const matResult = await calculateAuditMateriality(context, parameters.financialData);
        const riskResult = await assessRisks(context, parameters.riskFactors);
        const programResult = riskResult.success
          ? await createAuditProgram(context, riskResult.data!)
          : null;

        if (matResult.success) response.materiality = matResult.data;
        if (riskResult.success) response.riskAssessments = riskResult.data;
        if (programResult?.success) response.auditProgram = programResult.data;

        response.auditStrategy = {
          approach: context.firstYearAudit ? 'substantive' : 'combined',
          timingStrategy: context.listedEntity ? 'interim_final' : 'year_end_only',
          specialistNeeds: parameters.riskFactors?.complexTransactions || [],
          keyFocusAreas: riskResult.data?.filter((r) => r.isSignificantRisk).map((r) => r.accountOrAssertion) || [],
        };

        return {
          success: true,
          data: response,
          nextSteps: [
            'Review and approve audit plan with engagement partner',
            'Brief audit team on strategy and key risks',
            'Commence fieldwork per established timeline',
          ],
        };
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
      error: error instanceof Error ? error.message : 'Unknown error in planning agent',
    };
  }
}
