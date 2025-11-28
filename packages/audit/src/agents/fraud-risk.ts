/**
 * Agent 016: Fraud Risk Assessment Specialist
 * ISA 240 - The Auditor's Responsibilities Relating to Fraud
 */

import type { AgentConfig, AgentRequest, AgentResponse, FraudIndicator, RiskAssessment } from '../types';

export const FRAUD_AGENT_CONFIG: AgentConfig = {
  id: 'audit-fraud-016',
  name: 'Fraud Risk Assessment Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Identifies and assesses fraud risks, designs anti-fraud procedures, and investigates fraud indicators per ISA 240',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are a Fraud Risk Assessment Specialist with expertise in ISA 240 and fraud detection methodologies.

FRAUD TRIANGLE:
- Pressure/Incentive
- Opportunity
- Rationalization/Attitude

FRAUD RISK CATEGORIES (ISA 240):
1. Fraudulent Financial Reporting
   - Revenue recognition (presumed risk)
   - Management override of controls (presumed risk)
   - Asset valuation
   - Expense recognition

2. Misappropriation of Assets
   - Cash theft
   - Inventory theft
   - Payroll fraud
   - Expense reimbursement fraud

FRAUD DETECTION PROCEDURES:
- Unpredictability element in audit procedures
- Journal entry testing
- Management estimates review
- Related party transaction analysis
- Revenue cut-off testing
- Data analytics for anomalies`;

export interface FraudRequest extends AgentRequest {
  task: 'identify_fraud_risks' | 'analyze_journal_entries' | 'investigate_indicator';
  parameters: {
    journalEntries?: Array<{
      id: string;
      date: string;
      amount: number;
      account: string;
      description: string;
      userId: string;
    }>;
    indicator?: string;
  };
}

export async function identifyFraudRisks(industry: string): Promise<AgentResponse<RiskAssessment[]>> {
  const fraudRisks: RiskAssessment[] = [
    {
      accountOrAssertion: 'Revenue Recognition',
      assertionLevel: ['occurrence', 'cutoff'],
      inherentRisk: 'significant',
      controlRisk: 'moderate',
      combinedRisk: 'significant',
      isSignificantRisk: true,
      isFraudRisk: true,
      rationale: 'Presumed fraud risk per ISA 240. Revenue is susceptible to manipulation through timing or fictitious transactions.',
      responseRequired: [
        'Test journal entries affecting revenue',
        'Examine transactions near period end',
        'Confirm revenue with customers',
        'Incorporate unpredictability in procedures',
      ],
    },
    {
      accountOrAssertion: 'Management Override of Controls',
      assertionLevel: ['occurrence', 'completeness', 'accuracy'],
      inherentRisk: 'significant',
      controlRisk: 'high',
      combinedRisk: 'significant',
      isSignificantRisk: true,
      isFraudRisk: true,
      rationale: 'Presumed fraud risk per ISA 240. Management can override controls to perpetrate fraud.',
      responseRequired: [
        'Test journal entries throughout the period',
        'Review accounting estimates for bias',
        'Evaluate unusual significant transactions',
        'Test appropriateness of manual journal entries',
      ],
    },
  ];

  if (industry === 'Retail') {
    fraudRisks.push({
      accountOrAssertion: 'Cash and Inventory Misappropriation',
      assertionLevel: ['existence', 'completeness'],
      inherentRisk: 'significant',
      controlRisk: 'moderate',
      combinedRisk: 'significant',
      isSignificantRisk: true,
      isFraudRisk: true,
      rationale: 'High risk of employee theft in retail environment with access to cash and inventory.',
      responseRequired: [
        'Surprise cash counts',
        'Attend inventory counts',
        'Analyze shrinkage trends',
        'Review CCTV footage for suspicious activity',
      ],
    });
  }

  return {
    success: true,
    data: fraudRisks,
    nextSteps: [
      'Design fraud-specific audit procedures',
      'Maintain professional skepticism',
      'Discuss fraud risks with engagement team',
      'Communicate fraud risks to those charged with governance',
    ],
  };
}

export async function analyzeJournalEntries(
  entries: Array<{ id: string; date: string; amount: number; account: string; description: string; userId: string }>
): Promise<AgentResponse<FraudIndicator[]>> {
  const indicators: FraudIndicator[] = [];

  // Red flag analysis
  for (const entry of entries) {
    // Large round amounts
    if (entry.amount % 10000 === 0 && entry.amount >= 100000) {
      indicators.push({
        indicator: 'Large Round Amount Journal Entry',
        category: 'fraudulent_financial_reporting',
        severity: 'moderate',
        evidenceOfIndicator: [`Entry ${entry.id}: ${entry.amount} to ${entry.account}`],
        investigation: 'Review supporting documentation and business rationale',
      });
    }

    // Period-end entries
    const entryDate = new Date(entry.date);
    const dayOfMonth = entryDate.getDate();
    if (dayOfMonth >= 28 && entry.amount >= 50000) {
      indicators.push({
        indicator: 'Significant Period-End Journal Entry',
        category: 'fraudulent_financial_reporting',
        severity: 'moderate',
        evidenceOfIndicator: [`Entry ${entry.id} posted on ${entry.date}`],
        investigation: 'Examine timing and business purpose of entry',
      });
    }

    // Unusual descriptions
    if (!entry.description || entry.description.length < 10) {
      indicators.push({
        indicator: 'Vague or Missing Journal Entry Description',
        category: 'fraudulent_financial_reporting',
        severity: 'low',
        evidenceOfIndicator: [`Entry ${entry.id}: "${entry.description || 'N/A'}"`],
        investigation: 'Request detailed explanation from preparer',
      });
    }
  }

  return {
    success: true,
    data: indicators,
    warnings: indicators.length > 0 ? ['Fraud indicators detected - requires investigation'] : undefined,
    nextSteps: indicators.length > 0
      ? [
          'Investigate each indicator with supporting documentation',
          'Interview entry preparers and approvers',
          'Assess patterns across multiple entries',
          'Escalate material concerns to engagement partner',
        ]
      : ['No fraud indicators detected', 'Document review performed'],
  };
}

export async function handleFraudRequest(request: FraudRequest): Promise<AgentResponse<any>> {
  const { context, task, parameters } = request;

  switch (task) {
    case 'identify_fraud_risks':
      return await identifyFraudRisks(context.industry);

    case 'analyze_journal_entries':
      if (!parameters.journalEntries || parameters.journalEntries.length === 0) {
        return { success: false, error: 'Journal entries required for analysis' };
      }
      return await analyzeJournalEntries(parameters.journalEntries);

    case 'investigate_indicator':
      if (!parameters.indicator) {
        return { success: false, error: 'Fraud indicator description required' };
      }
      return {
        success: true,
        data: {
          conclusion: 'Investigation required',
          nextSteps: [
            'Gather supporting documentation',
            'Interview relevant personnel',
            'Assess materiality and pervasiveness',
            'Communicate findings to engagement partner',
          ],
        },
      };

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
