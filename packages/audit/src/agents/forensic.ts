/**
 * Forensic & Investigation Agent
 * Fraud investigation methodology, transaction tracing, anomaly detection
 */

import type { AgentConfig, AgentRequest, AgentResponse, FraudIndicator } from '../types';

export const FORENSIC_AGENT_CONFIG: AgentConfig = {
  id: 'audit-forensic-049',
  name: 'Forensic & Investigation Specialist',
  type: 'specialist',
  tier: 2,
  domain: 'audit',
  description: 'Specialist in fraud investigations, forensic accounting, and transaction tracing',
  version: '1.0.0',
};

export const SYSTEM_PROMPT = `You are a Forensic & Investigation Specialist with expertise in fraud detection and forensic accounting.

FORENSIC METHODOLOGY:
1. INVESTIGATION PHASES
   - Predication and planning
   - Evidence collection
   - Analysis and testing
   - Reporting and testimony

2. FRAUD TRIANGLE
   - Pressure/Incentive
   - Opportunity
   - Rationalization

3. INVESTIGATION TECHNIQUES
   - Document examination
   - Interviews and interrogation
   - Computer forensics
   - Transaction tracing
   - Data analytics

4. EVIDENCE STANDARDS
   - Chain of custody
   - Documentation requirements
   - Admissibility considerations
   - Expert witness standards

5. COMMON FRAUD SCHEMES
   - Financial statement fraud
   - Asset misappropriation
   - Corruption and bribery
   - Vendor/procurement fraud
   - Payroll fraud
   - Expense reimbursement fraud

6. REPORTING
   - Factual findings
   - Evidence documentation
   - Legal considerations
   - Regulatory reporting requirements`;

export interface ForensicRequest extends AgentRequest {
  task: 'analyze_indicators' | 'trace_transaction' | 'develop_hypothesis' | 'plan_investigation';
  parameters: {
    allegation?: string;
    indicators?: FraudIndicator[];
    transaction?: {
      id: string;
      amount: number;
      date: string;
      parties: string[];
      description: string;
    };
    scope?: string;
  };
}

export interface InvestigationPlan {
  objective: string;
  scope: string;
  hypotheses: string[];
  evidenceRequired: {
    type: string;
    source: string;
    relevance: string;
  }[];
  procedures: {
    phase: string;
    activities: string[];
    timeline: string;
  }[];
  team: { role: string; responsibilities: string[] }[];
  legalConsiderations: string[];
  confidentiality: string[];
}

export interface TransactionTrace {
  transactionId: string;
  traceType: 'funds_flow' | 'document_trail' | 'authorization_chain';
  path: {
    step: number;
    date: string;
    description: string;
    amount?: number;
    parties: string[];
    document?: string;
    redFlags: string[];
  }[];
  findings: string[];
  furtherInvestigation: string[];
}

export interface FraudHypothesis {
  scheme: string;
  description: string;
  fraudTriangle: {
    pressure: string[];
    opportunity: string[];
    rationalization: string[];
  };
  indicators: string[];
  testingProcedures: string[];
  evidenceNeeded: string[];
}

export interface IndicatorAnalysis {
  indicatorsReviewed: number;
  highRiskIndicators: string[];
  patterns: string[];
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
}

/**
 * Plan fraud investigation
 */
export function planInvestigation(allegation: string, scope: string): AgentResponse<InvestigationPlan> {
  const plan: InvestigationPlan = {
    objective: `Conduct independent investigation into alleged ${allegation}`,
    scope: scope || 'Full scope investigation of allegations',
    hypotheses: [
      'Allegation is substantiated with clear evidence of wrongdoing',
      'Allegation is partially substantiated with control weaknesses identified',
      'Allegation is unsubstantiated but process improvements recommended',
      'Allegation is unfounded with no supporting evidence',
    ],
    evidenceRequired: [
      {
        type: 'Documents',
        source: 'Accounting records, contracts, correspondence',
        relevance: 'Support transaction validity and authorization',
      },
      {
        type: 'Electronic data',
        source: 'Email servers, system logs, access records',
        relevance: 'Establish timeline and identify parties involved',
      },
      {
        type: 'Interviews',
        source: 'Relevant personnel, complainant, subjects',
        relevance: 'Obtain accounts and explanations',
      },
      {
        type: 'External records',
        source: 'Bank statements, vendor confirmations, public records',
        relevance: 'Corroborate internal records',
      },
    ],
    procedures: [
      {
        phase: 'Phase 1: Planning and Preservation',
        activities: [
          'Document preservation notice',
          'Evidence collection plan',
          'Interview schedule',
          'Legal counsel coordination',
        ],
        timeline: 'Days 1-5',
      },
      {
        phase: 'Phase 2: Evidence Collection',
        activities: [
          'Document collection and imaging',
          'Electronic data extraction',
          'Initial data analysis',
          'Preliminary interviews',
        ],
        timeline: 'Days 6-20',
      },
      {
        phase: 'Phase 3: Analysis and Testing',
        activities: [
          'Transaction testing and tracing',
          'Document examination',
          'Data analytics',
          'Follow-up interviews',
        ],
        timeline: 'Days 21-40',
      },
      {
        phase: 'Phase 4: Reporting',
        activities: [
          'Draft findings report',
          'Legal review',
          'Management presentation',
          'Final report issuance',
        ],
        timeline: 'Days 41-50',
      },
    ],
    team: [
      {
        role: 'Lead Investigator',
        responsibilities: ['Overall investigation management', 'Key interviews', 'Report sign-off'],
      },
      {
        role: 'Forensic Accountant',
        responsibilities: ['Transaction analysis', 'Financial testing', 'Damage quantification'],
      },
      {
        role: 'Computer Forensics Specialist',
        responsibilities: ['E-discovery', 'Data extraction', 'Digital evidence preservation'],
      },
      {
        role: 'Legal Counsel',
        responsibilities: ['Legal guidance', 'Privilege review', 'Regulatory liaison'],
      },
    ],
    legalConsiderations: [
      'Attorney-client privilege protection',
      'Employee rights and due process',
      'Regulatory reporting obligations',
      'Evidence admissibility requirements',
      'Defamation and confidentiality risks',
    ],
    confidentiality: [
      'Need-to-know basis only',
      'Secure document storage',
      'Encrypted communications',
      'Limited access to investigation files',
      'Confidentiality agreements for all team members',
    ],
  };

  return {
    success: true,
    data: plan,
    nextSteps: [
      'Obtain management/board approval',
      'Engage legal counsel',
      'Issue preservation notices',
      'Begin evidence collection',
    ],
  };
}

/**
 * Trace a suspicious transaction
 */
export function traceTransaction(
  transaction: ForensicRequest['parameters']['transaction']
): AgentResponse<TransactionTrace> {
  if (!transaction) {
    return { success: false, error: 'Transaction details are required' };
  }

  const { id, amount, date, parties, description } = transaction;

  const trace: TransactionTrace = {
    transactionId: id,
    traceType: 'funds_flow',
    path: [
      {
        step: 1,
        date: date,
        description: 'Transaction initiated',
        amount,
        parties: [parties[0] || 'Unknown initiator'],
        document: 'Invoice/Request',
        redFlags: [],
      },
      {
        step: 2,
        date: date,
        description: 'Authorization obtained',
        parties: ['Approver'],
        document: 'Approval documentation',
        redFlags: amount > 50000 ? ['Large transaction - verify authorization level'] : [],
      },
      {
        step: 3,
        date: date,
        description: 'Payment processing',
        amount,
        parties: ['AP Department'],
        document: 'Payment voucher',
        redFlags: [],
      },
      {
        step: 4,
        date: date,
        description: 'Bank transfer executed',
        amount,
        parties: ['Bank', parties[1] || 'Payee'],
        document: 'Bank statement',
        redFlags: parties.length > 2 ? ['Multiple parties - verify legitimacy'] : [],
      },
    ],
    findings: [
      'Transaction follows standard payment process',
      'Authorization documentation present',
      'Recommend verification of vendor legitimacy',
    ],
    furtherInvestigation: [
      'Confirm vendor existence and legitimacy',
      'Review related transactions with same parties',
      'Check for potential conflicts of interest',
      'Validate goods/services receipt',
    ],
  };

  return {
    success: true,
    data: trace,
    nextSteps: [
      'Document transaction trace in working papers',
      'Follow up on identified red flags',
      'Expand testing if anomalies found',
      'Interview relevant personnel',
    ],
  };
}

/**
 * Develop fraud hypothesis
 */
export function developHypothesis(allegation: string): AgentResponse<FraudHypothesis[]> {
  const hypotheses: FraudHypothesis[] = [
    {
      scheme: 'Billing Scheme',
      description: 'Fictitious vendor invoices or overbilling for goods/services',
      fraudTriangle: {
        pressure: ['Financial difficulties', 'Performance pressure', 'Personal debts'],
        opportunity: ['Weak vendor approval process', 'Lack of segregation of duties', 'Limited oversight'],
        rationalization: ['Underpaid for work', 'Company can afford it', 'Will pay it back'],
      },
      indicators: [
        'Vendor without physical address',
        'Sequential invoice numbers',
        'Round amount invoices',
        'No goods receipt',
        'Same approver and requestor',
      ],
      testingProcedures: [
        'Vendor master file analysis',
        'Invoice duplicate testing',
        'Address and phone verification',
        'Goods receipt matching',
        'Segregation of duties review',
      ],
      evidenceNeeded: [
        'Vendor file documentation',
        'Invoices and supporting documents',
        'Bank account ownership',
        'Employee conflict of interest disclosures',
      ],
    },
    {
      scheme: 'Expense Reimbursement Fraud',
      description: 'False or inflated expense claims',
      fraudTriangle: {
        pressure: ['Living beyond means', 'Sense of entitlement'],
        opportunity: ['Weak expense approval', 'Limited receipt requirements'],
        rationalization: ['Owed for extra work', 'Everyone does it'],
      },
      indicators: [
        'Expenses just below approval threshold',
        'Duplicate reimbursement claims',
        'Altered receipts',
        'Personal expenses claimed as business',
        'Unusual expense patterns',
      ],
      testingProcedures: [
        'Duplicate payment analysis',
        'Receipt examination',
        'Policy compliance review',
        'Trend analysis',
        'Credit card/expense matching',
      ],
      evidenceNeeded: [
        'Expense reports and receipts',
        'Corporate card statements',
        'Approval documentation',
        'Policy documentation',
      ],
    },
    {
      scheme: 'Kickback/Corruption',
      description: 'Payments in exchange for favorable treatment',
      fraudTriangle: {
        pressure: ['Greed', 'Lifestyle maintenance'],
        opportunity: ['Vendor selection authority', 'Lack of competitive bidding'],
        rationalization: ['Just doing business', 'Everyone does it'],
      },
      indicators: [
        'Vendor consistently wins without competition',
        'Prices above market',
        'Employee lifestyle changes',
        'Close relationships with vendors',
        'Sole-source justifications',
      ],
      testingProcedures: [
        'Bid analysis',
        'Price benchmarking',
        'Employee-vendor relationship review',
        'Asset/lifestyle analysis',
        'Email review',
      ],
      evidenceNeeded: [
        'Procurement records',
        'Vendor communications',
        'Employee financial records',
        'Contract documentation',
      ],
    },
  ];

  return {
    success: true,
    data: hypotheses,
    nextSteps: [
      'Select most likely hypotheses based on allegation',
      'Design testing procedures',
      'Collect relevant evidence',
      'Test each hypothesis systematically',
    ],
  };
}

/**
 * Analyze fraud indicators
 */
export function analyzeIndicators(indicators: FraudIndicator[]): AgentResponse<IndicatorAnalysis> {
  if (!indicators || indicators.length === 0) {
    return { success: false, error: 'Fraud indicators are required' };
  }

  const highRiskIndicators = indicators
    .filter((i) => i.severity === 'high')
    .map((i) => i.indicator);

  // Identify patterns
  const patterns: string[] = [];
  const categories = indicators.map((i) => i.category);
  if (categories.filter((c) => c === 'fraudulent_financial_reporting').length > 2) {
    patterns.push('Multiple indicators of financial statement manipulation');
  }
  if (categories.filter((c) => c === 'misappropriation_of_assets').length > 2) {
    patterns.push('Multiple indicators of asset misappropriation');
  }

  // Risk assessment
  let riskAssessment: IndicatorAnalysis['riskAssessment'];
  if (highRiskIndicators.length >= 3) {
    riskAssessment = 'critical';
  } else if (highRiskIndicators.length >= 1) {
    riskAssessment = 'high';
  } else if (indicators.length >= 3) {
    riskAssessment = 'medium';
  } else {
    riskAssessment = 'low';
  }

  return {
    success: true,
    data: {
      indicatorsReviewed: indicators.length,
      highRiskIndicators,
      patterns,
      riskAssessment,
      recommendedActions:
        riskAssessment === 'critical' || riskAssessment === 'high'
          ? [
              'Initiate formal investigation',
              'Preserve all relevant evidence',
              'Report to Audit Committee',
              'Engage forensic specialists',
            ]
          : [
              'Continue monitoring',
              'Enhance controls in identified areas',
              'Document findings and rationale',
            ],
    },
    nextSteps: [
      'Present findings to engagement partner',
      'Consider audit response to fraud risk',
      'Document in fraud risk assessment',
    ],
  };
}

/**
 * Main agent handler
 */
export async function handleForensicRequest(request: ForensicRequest): Promise<AgentResponse<unknown>> {
  const { task, parameters } = request;

  switch (task) {
    case 'plan_investigation':
      if (!parameters.allegation) {
        return { success: false, error: 'Allegation is required for investigation planning' };
      }
      return planInvestigation(parameters.allegation, parameters.scope || '');

    case 'trace_transaction':
      return traceTransaction(parameters.transaction);

    case 'develop_hypothesis':
      return developHypothesis(parameters.allegation || 'General fraud concern');

    case 'analyze_indicators':
      return analyzeIndicators(parameters.indicators || []);

    default:
      return { success: false, error: `Unknown task: ${task}` };
  }
}
