/**
 * ISA-Compliant Audit Program Templates
 * 
 * Comprehensive audit program templates based on International Standards on Auditing (ISA).
 * Covers risk assessment, substantive procedures, evidence requirements, accounting estimates,
 * and going concern evaluation.
 * 
 * Standards covered:
 * - ISA 315: Identifying and Assessing Risks of Material Misstatement
 * - ISA 330: The Auditor's Responses to Assessed Risks
 * - ISA 500: Audit Evidence
 * - ISA 540: Auditing Accounting Estimates
 * - ISA 570: Going Concern
 * 
 * @example
 * ```typescript
 * import { ISA315Template, createAuditProgram } from './isa-templates';
 * 
 * const program = createAuditProgram({
 *   engagement: engagementData,
 *   standards: ['ISA315', 'ISA330'],
 *   materiality: 100000,
 * });
 * 
 * // Get procedures for a specific area
 * const procedures = program.getProcedures('revenue');
 * ```
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface AuditProcedure {
    id: string;
    reference: string;  // e.g., "ISA315.25", "ISA330.18"
    category: ProcedureCategory;
    title: string;
    description: string;
    objective: string;

    /** Required assertions tested */
    assertions: Assertion[];

    /** Risk level this procedure addresses */
    riskLevel: 'low' | 'medium' | 'high' | 'significant';

    /** Whether this is a mandatory procedure */
    mandatory: boolean;

    /** Typical timing */
    timing: 'planning' | 'interim' | 'year_end' | 'wrap_up';

    /** Expected time (hours) */
    estimatedHours: number;

    /** Staff level required */
    requiredLevel: 'staff' | 'senior' | 'manager' | 'partner';

    /** Workpaper reference template */
    workpaperRef?: string;

    /** AI automation potential */
    automationLevel: 'full' | 'partial' | 'manual';
}

export type ProcedureCategory =
    | 'understanding_entity'
    | 'risk_assessment'
    | 'internal_controls'
    | 'substantive_analytical'
    | 'tests_of_details'
    | 'sampling'
    | 'estimates'
    | 'going_concern'
    | 'subsequent_events'
    | 'management_representations';

export type Assertion =
    | 'existence'
    | 'completeness'
    | 'accuracy'
    | 'valuation'
    | 'rights_obligations'
    | 'presentation'
    | 'cutoff'
    | 'occurrence';

export interface RiskAssessment {
    area: string;
    inherentRisk: 'low' | 'medium' | 'high';
    controlRisk: 'low' | 'medium' | 'high';
    detectionRisk: 'low' | 'medium' | 'high';
    combinedRisk: 'low' | 'medium' | 'high';
    significantRisk: boolean;
    riskFactors: string[];
    response: 'substantive_only' | 'combined' | 'controls_reliance';
}

export interface AuditProgram {
    id: string;
    engagementId: string;
    name: string;
    standards: string[];
    createdAt: Date;
    updatedAt: Date;

    procedures: AuditProcedure[];
    riskAssessments: RiskAssessment[];

    getProcedures(area: string): AuditProcedure[];
    getProceduresByTiming(timing: string): AuditProcedure[];
    getSignificantRisks(): RiskAssessment[];
}

// ============================================================================
// ISA 315: IDENTIFYING AND ASSESSING RISKS
// ============================================================================

export const ISA315_PROCEDURES: AuditProcedure[] = [
    // Understanding the Entity and Its Environment
    {
        id: 'isa315-01',
        reference: 'ISA315.11',
        category: 'understanding_entity',
        title: 'Understanding Industry and Regulatory Environment',
        description: 'Obtain understanding of industry, regulatory, and other external factors including applicable financial reporting framework.',
        objective: 'Identify industry-specific risks and regulatory requirements that may impact financial statements.',
        assertions: ['presentation', 'completeness'],
        riskLevel: 'medium',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 4,
        requiredLevel: 'senior',
        workpaperRef: 'A1-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa315-02',
        reference: 'ISA315.11(a)',
        category: 'understanding_entity',
        title: 'Understanding Nature of the Entity',
        description: 'Understand the nature of the entity including business operations, ownership structure, governance, and organizational structure.',
        objective: 'Understand key business processes and how they affect financial reporting.',
        assertions: ['completeness', 'presentation'],
        riskLevel: 'medium',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 3,
        requiredLevel: 'senior',
        workpaperRef: 'A1-2',
        automationLevel: 'partial',
    },
    {
        id: 'isa315-03',
        reference: 'ISA315.11(b)',
        category: 'understanding_entity',
        title: 'Accounting Policies Review',
        description: 'Evaluate entity\'s selection and application of accounting policies, including reasons for changes.',
        objective: 'Ensure accounting policies are appropriate and consistently applied.',
        assertions: ['presentation', 'accuracy', 'valuation'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 4,
        requiredLevel: 'manager',
        workpaperRef: 'A1-3',
        automationLevel: 'partial',
    },
    {
        id: 'isa315-04',
        reference: 'ISA315.11(c)',
        category: 'understanding_entity',
        title: 'Entity Objectives and Strategies',
        description: 'Understand entity\'s objectives and strategies, and related business risks that may result in risks of material misstatement.',
        objective: 'Identify business risks that may translate to financial statement risks.',
        assertions: ['completeness', 'existence'],
        riskLevel: 'medium',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 2,
        requiredLevel: 'senior',
        workpaperRef: 'A1-4',
        automationLevel: 'partial',
    },
    {
        id: 'isa315-05',
        reference: 'ISA315.11(d)',
        category: 'understanding_entity',
        title: 'Performance Measures Analysis',
        description: 'Understand key performance measures and indicators (financial and non-financial) monitored by management.',
        objective: 'Identify pressures that may lead to misstatement and understand management focus areas.',
        assertions: ['accuracy', 'completeness'],
        riskLevel: 'medium',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 2,
        requiredLevel: 'senior',
        workpaperRef: 'A1-5',
        automationLevel: 'full',
    },

    // Internal Control Understanding
    {
        id: 'isa315-06',
        reference: 'ISA315.12',
        category: 'internal_controls',
        title: 'Control Environment Evaluation',
        description: 'Evaluate the control environment including management philosophy, ethical values, competence, and governance oversight.',
        objective: 'Assess the tone at the top and foundation for other control components.',
        assertions: ['completeness', 'accuracy'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 4,
        requiredLevel: 'manager',
        workpaperRef: 'C1-1',
        automationLevel: 'manual',
    },
    {
        id: 'isa315-07',
        reference: 'ISA315.14',
        category: 'internal_controls',
        title: 'Risk Assessment Process',
        description: 'Evaluate entity\'s process for identifying business risks, estimating their significance, and addressing them.',
        objective: 'Understand how management identifies and responds to risks.',
        assertions: ['completeness', 'valuation'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 3,
        requiredLevel: 'manager',
        workpaperRef: 'C1-2',
        automationLevel: 'partial',
    },
    {
        id: 'isa315-08',
        reference: 'ISA315.15',
        category: 'internal_controls',
        title: 'Information System Understanding',
        description: 'Understand the information system, including business processes, relevant to financial reporting.',
        objective: 'Identify key information flows and potential misstatement points.',
        assertions: ['completeness', 'accuracy', 'cutoff'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 6,
        requiredLevel: 'senior',
        workpaperRef: 'C1-3',
        automationLevel: 'partial',
    },
    {
        id: 'isa315-09',
        reference: 'ISA315.20',
        category: 'internal_controls',
        title: 'Control Activities Identification',
        description: 'Identify control activities relevant to the audit, including IT general controls and application controls.',
        objective: 'Identify key controls that prevent or detect material misstatements.',
        assertions: ['existence', 'completeness', 'accuracy', 'valuation'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 8,
        requiredLevel: 'senior',
        workpaperRef: 'C2-1',
        automationLevel: 'partial',
    },

    // Risk Identification and Assessment
    {
        id: 'isa315-10',
        reference: 'ISA315.25',
        category: 'risk_assessment',
        title: 'Identify Risks of Material Misstatement',
        description: 'Identify and assess risks of material misstatement at financial statement and assertion levels.',
        objective: 'Document assessed risks to design appropriate audit responses.',
        assertions: ['existence', 'completeness', 'accuracy', 'valuation', 'rights_obligations', 'presentation', 'cutoff'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 6,
        requiredLevel: 'manager',
        workpaperRef: 'R1-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa315-11',
        reference: 'ISA315.27',
        category: 'risk_assessment',
        title: 'Significant Risk Identification',
        description: 'Determine which of the assessed risks are significant risks requiring special audit consideration.',
        objective: 'Identify risks requiring enhanced audit procedures.',
        assertions: ['existence', 'completeness', 'accuracy', 'valuation'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 4,
        requiredLevel: 'manager',
        workpaperRef: 'R1-2',
        automationLevel: 'partial',
    },
    {
        id: 'isa315-12',
        reference: 'ISA315.31',
        category: 'risk_assessment',
        title: 'Documentation of Risk Assessment',
        description: 'Document the identified and assessed risks, basis for assessment, and significant risks.',
        objective: 'Create audit trail of risk assessment process.',
        assertions: [],
        riskLevel: 'medium',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 3,
        requiredLevel: 'senior',
        workpaperRef: 'R1-3',
        automationLevel: 'full',
    },
];

// ============================================================================
// ISA 330: AUDITOR'S RESPONSES TO ASSESSED RISKS
// ============================================================================

export const ISA330_PROCEDURES: AuditProcedure[] = [
    // Overall Responses
    {
        id: 'isa330-01',
        reference: 'ISA330.5',
        category: 'risk_assessment',
        title: 'Design Overall Responses',
        description: 'Design and implement overall responses to address assessed risks at the financial statement level.',
        objective: 'Establish overall audit approach based on risk assessment.',
        assertions: [],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 4,
        requiredLevel: 'manager',
        workpaperRef: 'P1-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa330-02',
        reference: 'ISA330.6',
        category: 'risk_assessment',
        title: 'Design Further Audit Procedures',
        description: 'Design and perform further audit procedures responsive to assessed risks at the assertion level.',
        objective: 'Link audit procedures to specific risks and assertions.',
        assertions: ['existence', 'completeness', 'accuracy', 'valuation', 'rights_obligations', 'presentation', 'cutoff'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 6,
        requiredLevel: 'manager',
        workpaperRef: 'P1-2',
        automationLevel: 'partial',
    },

    // Tests of Controls
    {
        id: 'isa330-03',
        reference: 'ISA330.8',
        category: 'internal_controls',
        title: 'Tests of Operating Effectiveness',
        description: 'Design and perform tests of controls when planning to rely on operating effectiveness or substantive procedures alone cannot provide sufficient evidence.',
        objective: 'Obtain evidence that controls operated effectively throughout the period.',
        assertions: ['existence', 'completeness', 'accuracy'],
        riskLevel: 'high',
        mandatory: false,
        timing: 'interim',
        estimatedHours: 16,
        requiredLevel: 'senior',
        workpaperRef: 'C3-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa330-04',
        reference: 'ISA330.10',
        category: 'internal_controls',
        title: 'Nature of Tests of Controls',
        description: 'Determine appropriate nature (inquiry, observation, inspection, reperformance) for tests of controls.',
        objective: 'Ensure tests provide persuasive evidence of control effectiveness.',
        assertions: ['existence', 'completeness'],
        riskLevel: 'medium',
        mandatory: false,
        timing: 'interim',
        estimatedHours: 8,
        requiredLevel: 'senior',
        workpaperRef: 'C3-2',
        automationLevel: 'partial',
    },

    // Substantive Procedures
    {
        id: 'isa330-05',
        reference: 'ISA330.18',
        category: 'substantive_analytical',
        title: 'Substantive Analytical Procedures',
        description: 'Design and perform substantive analytical procedures for significant accounts.',
        objective: 'Identify potential misstatements through relationship analysis.',
        assertions: ['completeness', 'accuracy', 'valuation'],
        riskLevel: 'medium',
        mandatory: true,
        timing: 'year_end',
        estimatedHours: 8,
        requiredLevel: 'senior',
        workpaperRef: 'S1-1',
        automationLevel: 'full',
    },
    {
        id: 'isa330-06',
        reference: 'ISA330.19',
        category: 'tests_of_details',
        title: 'Tests of Details',
        description: 'Design and perform tests of details for material account balances and transactions.',
        objective: 'Obtain direct evidence about account balances and transactions.',
        assertions: ['existence', 'completeness', 'accuracy', 'valuation', 'rights_obligations', 'cutoff'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'year_end',
        estimatedHours: 24,
        requiredLevel: 'senior',
        workpaperRef: 'S2-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa330-07',
        reference: 'ISA330.21',
        category: 'tests_of_details',
        title: 'External Confirmations',
        description: 'Obtain external confirmations for significant account balances (receivables, bank, legal).',
        objective: 'Obtain independent third-party evidence of balances and terms.',
        assertions: ['existence', 'rights_obligations', 'completeness', 'accuracy'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'year_end',
        estimatedHours: 12,
        requiredLevel: 'senior',
        workpaperRef: 'S2-2',
        automationLevel: 'partial',
    },

    // Evaluation and Documentation
    {
        id: 'isa330-08',
        reference: 'ISA330.25',
        category: 'substantive_analytical',
        title: 'Evaluate Sufficiency of Evidence',
        description: 'Evaluate whether sufficient appropriate audit evidence has been obtained.',
        objective: 'Conclude on whether risk has been reduced to acceptably low level.',
        assertions: [],
        riskLevel: 'high',
        mandatory: true,
        timing: 'wrap_up',
        estimatedHours: 4,
        requiredLevel: 'manager',
        workpaperRef: 'E1-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa330-09',
        reference: 'ISA330.28',
        category: 'substantive_analytical',
        title: 'Document Audit Responses',
        description: 'Document overall responses to assessed risks, nature/timing/extent of further procedures, and linkage to risks.',
        objective: 'Create audit trail of response to risk assessment.',
        assertions: [],
        riskLevel: 'medium',
        mandatory: true,
        timing: 'wrap_up',
        estimatedHours: 4,
        requiredLevel: 'senior',
        workpaperRef: 'E1-2',
        automationLevel: 'full',
    },
];

// ============================================================================
// ISA 500: AUDIT EVIDENCE
// ============================================================================

export const ISA500_PROCEDURES: AuditProcedure[] = [
    {
        id: 'isa500-01',
        reference: 'ISA500.6',
        category: 'tests_of_details',
        title: 'Design Evidence Obtaining Procedures',
        description: 'Design and perform audit procedures appropriate to obtain sufficient appropriate audit evidence.',
        objective: 'Ensure audit procedures will produce reliable and relevant evidence.',
        assertions: ['existence', 'completeness', 'accuracy', 'valuation', 'rights_obligations'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 4,
        requiredLevel: 'manager',
        workpaperRef: 'EV1-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa500-02',
        reference: 'ISA500.7',
        category: 'tests_of_details',
        title: 'Inspect Records and Documents',
        description: 'Perform inspection of records or documents (internal or external) in paper or electronic form.',
        objective: 'Obtain documentary evidence of transactions and balances.',
        assertions: ['existence', 'accuracy', 'rights_obligations'],
        riskLevel: 'medium',
        mandatory: true,
        timing: 'year_end',
        estimatedHours: 16,
        requiredLevel: 'staff',
        workpaperRef: 'EV2-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa500-03',
        reference: 'ISA500.7',
        category: 'tests_of_details',
        title: 'Physical Inspection of Assets',
        description: 'Perform inspection of tangible assets (inventory, fixed assets, cash).',
        objective: 'Verify physical existence of assets.',
        assertions: ['existence', 'valuation'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'year_end',
        estimatedHours: 8,
        requiredLevel: 'senior',
        workpaperRef: 'EV2-2',
        automationLevel: 'manual',
    },
    {
        id: 'isa500-04',
        reference: 'ISA500.7',
        category: 'tests_of_details',
        title: 'Management Inquiry',
        description: 'Make inquiries of management and others within the entity.',
        objective: 'Obtain information and explanations from knowledgeable individuals.',
        assertions: ['completeness', 'valuation'],
        riskLevel: 'low',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 4,
        requiredLevel: 'senior',
        workpaperRef: 'EV3-1',
        automationLevel: 'manual',
    },
    {
        id: 'isa500-05',
        reference: 'ISA500.7',
        category: 'internal_controls',
        title: 'Observation of Processes',
        description: 'Observe processes and procedures performed by entity personnel.',
        objective: 'Obtain evidence about how controls operate in practice.',
        assertions: ['existence', 'completeness'],
        riskLevel: 'medium',
        mandatory: true,
        timing: 'interim',
        estimatedHours: 6,
        requiredLevel: 'senior',
        workpaperRef: 'EV3-2',
        automationLevel: 'manual',
    },
    {
        id: 'isa500-06',
        reference: 'ISA500.7',
        category: 'tests_of_details',
        title: 'Recalculation',
        description: 'Perform recalculation to check mathematical accuracy of documents or records.',
        objective: 'Verify mathematical accuracy of calculations.',
        assertions: ['accuracy'],
        riskLevel: 'medium',
        mandatory: true,
        timing: 'year_end',
        estimatedHours: 8,
        requiredLevel: 'staff',
        workpaperRef: 'EV4-1',
        automationLevel: 'full',
    },
    {
        id: 'isa500-07',
        reference: 'ISA500.7',
        category: 'internal_controls',
        title: 'Reperformance',
        description: 'Perform independent execution of procedures or controls originally performed by entity.',
        objective: 'Verify that controls or procedures were performed correctly.',
        assertions: ['accuracy', 'completeness'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'interim',
        estimatedHours: 8,
        requiredLevel: 'senior',
        workpaperRef: 'EV4-2',
        automationLevel: 'partial',
    },
    {
        id: 'isa500-08',
        reference: 'ISA500.9',
        category: 'tests_of_details',
        title: 'Evaluate Information Reliability',
        description: 'Evaluate reliability of information used as audit evidence, including evidence from external sources.',
        objective: 'Ensure evidence used is sufficiently reliable for conclusions.',
        assertions: [],
        riskLevel: 'high',
        mandatory: true,
        timing: 'wrap_up',
        estimatedHours: 4,
        requiredLevel: 'manager',
        workpaperRef: 'EV5-1',
        automationLevel: 'partial',
    },
];

// ============================================================================
// ISA 540: AUDITING ACCOUNTING ESTIMATES
// ============================================================================

export const ISA540_PROCEDURES: AuditProcedure[] = [
    {
        id: 'isa540-01',
        reference: 'ISA540.13',
        category: 'estimates',
        title: 'Understand Estimation Process',
        description: 'Understand how management identifies transactions, events and conditions giving rise to accounting estimates.',
        objective: 'Assess appropriateness of estimation process and controls.',
        assertions: ['valuation', 'accuracy'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 4,
        requiredLevel: 'manager',
        workpaperRef: 'EST1-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa540-02',
        reference: 'ISA540.13',
        category: 'estimates',
        title: 'Review Estimation Methods',
        description: 'Evaluate methods and assumptions used by management in making accounting estimates.',
        objective: 'Assess whether methods are appropriate and consistently applied.',
        assertions: ['valuation', 'accuracy', 'presentation'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'year_end',
        estimatedHours: 8,
        requiredLevel: 'manager',
        workpaperRef: 'EST1-2',
        automationLevel: 'partial',
    },
    {
        id: 'isa540-03',
        reference: 'ISA540.15',
        category: 'estimates',
        title: 'Assess Estimation Uncertainty',
        description: 'Identify and assess risks of material misstatement related to estimation uncertainty.',
        objective: 'Determine extent of audit procedures needed for high-uncertainty estimates.',
        assertions: ['valuation', 'completeness'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 4,
        requiredLevel: 'manager',
        workpaperRef: 'EST2-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa540-04',
        reference: 'ISA540.18',
        category: 'estimates',
        title: 'Test Management Estimates',
        description: 'Test how management made the accounting estimate and the data on which it is based.',
        objective: 'Verify reasonableness of management\'s estimation process.',
        assertions: ['valuation', 'accuracy'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'year_end',
        estimatedHours: 12,
        requiredLevel: 'senior',
        workpaperRef: 'EST3-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa540-05',
        reference: 'ISA540.18',
        category: 'estimates',
        title: 'Develop Independent Estimate',
        description: 'Develop point estimate or range to evaluate management\'s point estimate.',
        objective: 'Provide independent benchmark for management estimate.',
        assertions: ['valuation', 'accuracy'],
        riskLevel: 'high',
        mandatory: false,
        timing: 'year_end',
        estimatedHours: 8,
        requiredLevel: 'manager',
        workpaperRef: 'EST3-2',
        automationLevel: 'partial',
    },
    {
        id: 'isa540-06',
        reference: 'ISA540.20',
        category: 'estimates',
        title: 'Retrospective Review',
        description: 'Review outcome of prior period accounting estimates or their subsequent re-estimation.',
        objective: 'Identify potential management bias and estimate reliability.',
        assertions: ['valuation', 'accuracy'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 4,
        requiredLevel: 'senior',
        workpaperRef: 'EST4-1',
        automationLevel: 'full',
    },
    {
        id: 'isa540-07',
        reference: 'ISA540.22',
        category: 'estimates',
        title: 'Evaluate Reasonableness',
        description: 'Evaluate based on evidence whether estimates are reasonable or misstated.',
        objective: 'Conclude on whether estimates meet financial reporting framework requirements.',
        assertions: ['valuation', 'presentation'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'wrap_up',
        estimatedHours: 4,
        requiredLevel: 'manager',
        workpaperRef: 'EST5-1',
        automationLevel: 'partial',
    },
];

// ============================================================================
// ISA 570: GOING CONCERN
// ============================================================================

export const ISA570_PROCEDURES: AuditProcedure[] = [
    {
        id: 'isa570-01',
        reference: 'ISA570.10',
        category: 'going_concern',
        title: 'Evaluate Management Assessment',
        description: 'Evaluate management\'s assessment of going concern ability, including period of assessment.',
        objective: 'Determine adequacy of management\'s going concern analysis.',
        assertions: ['presentation', 'completeness'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'wrap_up',
        estimatedHours: 6,
        requiredLevel: 'manager',
        workpaperRef: 'GC1-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa570-02',
        reference: 'ISA570.12',
        category: 'going_concern',
        title: 'Identify Going Concern Indicators',
        description: 'Identify events or conditions that may cast significant doubt on going concern.',
        objective: 'Identify financial, operating, and other indicators of going concern risk.',
        assertions: ['presentation', 'completeness'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'planning',
        estimatedHours: 4,
        requiredLevel: 'manager',
        workpaperRef: 'GC1-2',
        automationLevel: 'full',
    },
    {
        id: 'isa570-03',
        reference: 'ISA570.16',
        category: 'going_concern',
        title: 'Additional Audit Procedures',
        description: 'If events or conditions identified, perform additional procedures to evaluate material uncertainty.',
        objective: 'Gather sufficient evidence on significant going concern doubts.',
        assertions: ['existence', 'valuation', 'presentation'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'wrap_up',
        estimatedHours: 12,
        requiredLevel: 'manager',
        workpaperRef: 'GC2-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa570-04',
        reference: 'ISA570.16(a)',
        category: 'going_concern',
        title: 'Review Cash Flow Forecasts',
        description: 'Analyze reliability of underlying data generated for forecasts and evaluate supporting assumptions.',
        objective: 'Assess reasonableness of management\'s cash flow projections.',
        assertions: ['valuation', 'accuracy'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'wrap_up',
        estimatedHours: 8,
        requiredLevel: 'senior',
        workpaperRef: 'GC2-2',
        automationLevel: 'partial',
    },
    {
        id: 'isa570-05',
        reference: 'ISA570.16(b)',
        category: 'going_concern',
        title: 'Evaluate Management Plans',
        description: 'Evaluate management\'s plans for future actions in relation to their assessment.',
        objective: 'Assess feasibility of management\'s mitigating actions.',
        assertions: ['existence', 'completeness'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'wrap_up',
        estimatedHours: 6,
        requiredLevel: 'manager',
        workpaperRef: 'GC2-3',
        automationLevel: 'manual',
    },
    {
        id: 'isa570-06',
        reference: 'ISA570.17',
        category: 'going_concern',
        title: 'Obtain Written Representations',
        description: 'Request written representations from management regarding their plans and feasibility.',
        objective: 'Document management\'s acknowledgment of going concern responsibility.',
        assertions: ['presentation'],
        riskLevel: 'medium',
        mandatory: true,
        timing: 'wrap_up',
        estimatedHours: 2,
        requiredLevel: 'manager',
        workpaperRef: 'GC3-1',
        automationLevel: 'partial',
    },
    {
        id: 'isa570-07',
        reference: 'ISA570.18',
        category: 'going_concern',
        title: 'Conclude on Going Concern',
        description: 'Conclude, based on evidence, whether material uncertainty exists and is appropriately disclosed.',
        objective: 'Determine impact on auditor\'s report.',
        assertions: ['presentation', 'completeness'],
        riskLevel: 'high',
        mandatory: true,
        timing: 'wrap_up',
        estimatedHours: 4,
        requiredLevel: 'partner',
        workpaperRef: 'GC4-1',
        automationLevel: 'manual',
    },
];

// ============================================================================
// AUDIT PROGRAM FACTORY
// ============================================================================

export interface CreateAuditProgramOptions {
    engagementId: string;
    engagementName?: string;
    standards?: ('ISA315' | 'ISA330' | 'ISA500' | 'ISA540' | 'ISA570')[];
    materiality?: number;
    riskProfile?: 'low' | 'medium' | 'high';
    industry?: string;
}

export function createAuditProgram(options: CreateAuditProgramOptions): AuditProgram {
    const {
        engagementId,
        engagementName = 'Audit Program',
        standards = ['ISA315', 'ISA330', 'ISA500', 'ISA540', 'ISA570'],
        riskProfile = 'medium',
    } = options;

    // Collect procedures based on selected standards
    const allProcedures: AuditProcedure[] = [];

    if (standards.includes('ISA315')) {
        allProcedures.push(...ISA315_PROCEDURES);
    }
    if (standards.includes('ISA330')) {
        allProcedures.push(...ISA330_PROCEDURES);
    }
    if (standards.includes('ISA500')) {
        allProcedures.push(...ISA500_PROCEDURES);
    }
    if (standards.includes('ISA540')) {
        allProcedures.push(...ISA540_PROCEDURES);
    }
    if (standards.includes('ISA570')) {
        allProcedures.push(...ISA570_PROCEDURES);
    }

    // Filter based on risk profile
    const filteredProcedures = allProcedures.filter(p => {
        if (p.mandatory) return true;
        if (riskProfile === 'high') return true;
        if (riskProfile === 'medium' && p.riskLevel !== 'high') return false;
        if (riskProfile === 'low' && (p.riskLevel === 'high' || p.riskLevel === 'medium')) return false;
        return true;
    });

    // Create default risk assessments
    const riskAssessments: RiskAssessment[] = [
        {
            area: 'Revenue Recognition',
            inherentRisk: 'high',
            controlRisk: 'medium',
            detectionRisk: 'low',
            combinedRisk: 'high',
            significantRisk: true,
            riskFactors: ['Complex revenue arrangements', 'Management incentives', 'Multiple element transactions'],
            response: 'combined',
        },
        {
            area: 'Accounts Receivable',
            inherentRisk: 'medium',
            controlRisk: 'medium',
            detectionRisk: 'medium',
            combinedRisk: 'medium',
            significantRisk: false,
            riskFactors: ['Collection risk', 'Allowance estimation'],
            response: 'substantive_only',
        },
        {
            area: 'Inventory',
            inherentRisk: 'medium',
            controlRisk: 'low',
            detectionRisk: 'medium',
            combinedRisk: 'medium',
            significantRisk: false,
            riskFactors: ['Obsolescence', 'Valuation', 'Physical existence'],
            response: 'combined',
        },
        {
            area: 'Fixed Assets',
            inherentRisk: 'low',
            controlRisk: 'low',
            detectionRisk: 'high',
            combinedRisk: 'low',
            significantRisk: false,
            riskFactors: [],
            response: 'substantive_only',
        },
        {
            area: 'Accounts Payable',
            inherentRisk: 'low',
            controlRisk: 'low',
            detectionRisk: 'high',
            combinedRisk: 'low',
            significantRisk: false,
            riskFactors: ['Cutoff', 'Completeness'],
            response: 'substantive_only',
        },
    ];

    const now = new Date();

    return {
        id: crypto.randomUUID(),
        engagementId,
        name: engagementName,
        standards,
        createdAt: now,
        updatedAt: now,
        procedures: filteredProcedures,
        riskAssessments,

        getProcedures(area: string): AuditProcedure[] {
            return filteredProcedures.filter(p =>
                p.category.toLowerCase().includes(area.toLowerCase()) ||
                p.title.toLowerCase().includes(area.toLowerCase())
            );
        },

        getProceduresByTiming(timing: string): AuditProcedure[] {
            return filteredProcedures.filter(p => p.timing === timing);
        },

        getSignificantRisks(): RiskAssessment[] {
            return riskAssessments.filter(r => r.significantRisk);
        },
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ISATemplates = {
    ISA315: ISA315_PROCEDURES,
    ISA330: ISA330_PROCEDURES,
    ISA500: ISA500_PROCEDURES,
    ISA540: ISA540_PROCEDURES,
    ISA570: ISA570_PROCEDURES,
};

export function getAllProcedures(): AuditProcedure[] {
    return [
        ...ISA315_PROCEDURES,
        ...ISA330_PROCEDURES,
        ...ISA500_PROCEDURES,
        ...ISA540_PROCEDURES,
        ...ISA570_PROCEDURES,
    ];
}

export function getProceduresByStandard(standard: string): AuditProcedure[] {
    switch (standard) {
        case 'ISA315': return ISA315_PROCEDURES;
        case 'ISA330': return ISA330_PROCEDURES;
        case 'ISA500': return ISA500_PROCEDURES;
        case 'ISA540': return ISA540_PROCEDURES;
        case 'ISA570': return ISA570_PROCEDURES;
        default: return [];
    }
}
