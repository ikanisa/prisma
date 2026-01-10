/**
 * Malta Audit Agent Types
 *
 * Type definitions for Malta-specific ISA-compliant audit agents.
 * Covers Companies Act (Cap. 386), LN 139/2025, and ISA requirements.
 * 
 * Note: These types are self-contained to avoid dependency on workspace packages
 * that may have build issues.
 */

// ============================================================================
// BASE TYPES (Compatible with @prisma/audit-agents when available)
// ============================================================================

/**
 * Risk levels per ISA 315.
 */
export type RiskLevel = 'low' | 'moderate' | 'significant' | 'high';

/**
 * Assertion types per ISA 315.
 */
export type AssertionType =
    | 'existence'
    | 'rights_obligations'
    | 'completeness'
    | 'valuation_allocation'
    | 'occurrence'
    | 'accuracy'
    | 'cutoff'
    | 'classification'
    | 'presentation_disclosure';

/**
 * Base agent response.
 */
export interface AgentResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    warnings?: string[];
    nextSteps?: string[];
}

/**
 * Base audit context.
 */
export interface AuditContext {
    engagementId: string;
    clientName: string;
    periodEnd: string;
    industry: string;
    firstYearAudit: boolean;
    groupAudit: boolean;
    listedEntity: boolean;
}

/**
 * Base materiality calculation.
 */
export interface MaterialityCalculation {
    overallMateriality: number;
    performanceMateriality: number;
    specificMateriality?: Record<string, number>;
    trivialThreshold: number;
    basis: string;
    percentage: number;
    rationale: string;
    benchmark?: string;
    benchmarkAmount?: number;
    percentageApplied?: number;
}

/**
 * Base risk assessment.
 */
export interface RiskAssessment {
    accountOrAssertion: string;
    assertionLevel?: AssertionType[];
    inherentRisk: RiskLevel;
    controlRisk: RiskLevel;
    combinedRisk: RiskLevel;
    isSignificantRisk: boolean;
    isFraudRisk: boolean;
    rationale: string;
    responseRequired: string[];
}

/**
 * Base audit opinion.
 */
export interface AuditOpinion {
    opinionType: 'unmodified' | 'qualified' | 'adverse' | 'disclaimer';
    basisForModification?: string;
    keyAuditMatters: KeyAuditMatter[];
    emphasisOfMatter?: string[];
    otherMatter?: string[];
    goingConcern?: GoingConcernAssessment;
}

/**
 * Key audit matter.
 */
export interface KeyAuditMatter {
    matter: string;
    whyKAM: string;
    howAddressed: string[];
    relatedDisclosures?: string[];
}

/**
 * Going concern assessment.
 */
export interface GoingConcernAssessment {
    periodAssessed: string;
    eventsOrConditions: string[];
    managementPlans: string[];
    adequacyOfDisclosure: 'adequate' | 'inadequate';
    materialUncertainty: boolean;
    opinionImpact: 'none' | 'emphasis_of_matter' | 'adverse' | 'disclaimer';
    rationale: string;
}

// ============================================================================
// ENGAGEMENT ROUTING TYPES
// ============================================================================

/**
 * Engagement type based on LN 139/2025 routing.
 */
export type MaltaEngagementType =
    | 'FULL_AUDIT'        // Full ISA audit required
    | 'ISRE_2400_REVIEW'  // Limited review engagement
    | 'NO_ASSURANCE';     // Exemption - filing only

/**
 * Exemption rule applied per LN 139/2025.
 */
export type ExemptionRule =
    | 'RULE_6_NEW_COMPANY'      // First 2 accounting periods
    | 'RULE_7_MICRO_ENTITY'     // Article 185(2) micro exemption
    | 'RULE_8_SMALL_GROUP'      // Small group exemption
    | 'RULE_9_MERCHANT_SHIPPING' // Merchant Shipping Act entities
    | 'NONE';                    // No exemption applies

/**
 * Article 185(2) threshold data for exemption determination.
 */
export interface Article185Thresholds {
    balanceSheet: number;      // €46,600 threshold
    netTurnover: number;       // €93,000 threshold
    averageEmployees: number;  // 2 employees threshold
}

/**
 * Two-year financial data for threshold evaluation.
 */
export interface TwoYearFinancialData {
    year1: Article185Thresholds;
    year2: Article185Thresholds;
}

/**
 * Engagement routing decision.
 */
export interface EngagementRoutingDecision {
    engagementType: MaltaEngagementType;
    exemptionRule: ExemptionRule;
    thresholdsExceededYear1: number;
    thresholdsExceededYear2: number;
    maxExceeded: number;
    startupIncentiveEligible: boolean;
    mfsaRegulated: boolean;
    rationale: string;
    nextSteps: string[];
}

// ============================================================================
// MALTA AUDIT CONTEXT
// ============================================================================

/**
 * Malta-specific audit context extending base AuditContext.
 */
export interface MaltaAuditContext extends AuditContext {
    /** Malta company registration number (C-XXXXX) */
    companyRegistrationNo: string;
    /** Entity classification per Companies Act */
    entityClassification: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE';
    /** Engagement type from routing */
    engagementType: MaltaEngagementType;
    /** Whether entity is MFSA regulated */
    mfsaRegulated: boolean;
    /** MFSA regulation category if regulated */
    mfsaCategory?: 'MIFID' | 'INSURANCE' | 'VFA' | 'UCITS' | 'FUND';
    /** Whether this is a PIE (Public Interest Entity) */
    publicInterestEntity: boolean;
    /** Accounting framework used */
    accountingFramework: 'GAPSME' | 'IFRS';
    /** Year end date */
    yearEndDate: Date;
    /** Engagement partner warrant number */
    partnerWarrantNo?: string;
}

// ============================================================================
// PLANNING TYPES
// ============================================================================

/**
 * Malta materiality calculation with Companies Act benchmarks.
 */
export interface MaltaMaterialityCalculation extends MaterialityCalculation {
    /** Entity type used for benchmark selection */
    entityType: 'profit_oriented' | 'loss_making' | 'non_profit' | 'asset_heavy';
    /** Malta-specific adjustments applied */
    maltaAdjustments?: string[];
    /** Industry risk factor applied */
    industryRiskFactor?: number;
}

/**
 * Malta industry risk profile.
 */
export interface MaltaIndustryRiskProfile {
    industry: string;
    inherentRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
    regulatoryBody?: string;
    specificRisks: string[];
    requiredProcedures: string[];
}

/**
 * Malta high-risk industries.
 */
export const MALTA_HIGH_RISK_INDUSTRIES = [
    'remote_gaming',        // MGA regulated
    'crypto_assets',        // MFSA VFA
    'shipping',             // Merchant Shipping Act
    'financial_services',   // MFSA MiFID/Insurance
    'real_estate',          // Property valuations
    'construction',         // Revenue recognition
] as const;

/**
 * Client acceptance result.
 */
export interface ClientAcceptanceResult {
    accepted: boolean;
    independenceConfirmed: boolean;
    conflictsIdentified: string[];
    competenceAssessed: boolean;
    resourcesAvailable: boolean;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    partnerApprovalRequired: boolean;
    rationale: string;
}

// ============================================================================
// RISK ASSESSMENT TYPES
// ============================================================================

/**
 * Malta risk assessment with local factors.
 */
export interface MaltaRiskAssessment extends RiskAssessment {
    /** Malta-specific risk indicators */
    maltaRiskIndicators?: string[];
    /** MFSA compliance requirements if applicable */
    mfsaRequirements?: string[];
    /** Crypto/blockchain verification needed */
    blockchainVerificationRequired?: boolean;
}

/**
 * Benford's Law analysis result.
 */
export interface BenfordsLawResult {
    anomalyDetected: boolean;
    pValue: number;
    chiSquareStatistic: number;
    observedDistribution: number[];
    expectedDistribution: number[];
    recommendation: string;
    flaggedTransactions?: string[];
}

/**
 * Fraud risk indicators per ISA 240.
 */
export interface FraudRiskIndicators {
    revenueRecognitionRisk: boolean;
    managementOverrideRisk: boolean;
    relatedPartyRisk: boolean;
    unusualTransactionsIdentified: boolean;
    pressureFactorsPresent: boolean;
    opportunityFactorsPresent: boolean;
    rationalizationIndicators: boolean;
    fraudTriangleScore: 'LOW' | 'MODERATE' | 'HIGH';
}

// ============================================================================
// SUBSTANTIVE TESTING TYPES
// ============================================================================

/**
 * Substantive test configuration.
 */
export interface SubstantiveTestConfig {
    procedureId: string;
    account: string;
    assertion: string;
    method: 'vouching' | 'confirmation' | 'recalculation' | 'analytical' | 'cutoff';
    sampleSize: number;
    performanceMateriality: number;
    testAll: boolean;  // True if testing 100% above materiality
}

/**
 * Confirmation request.
 */
export interface ConfirmationRequest {
    type: 'bank' | 'customer' | 'supplier' | 'legal' | 'other';
    recipientName: string;
    recipientAddress: string;
    balanceDate: Date;
    balanceAmount: number;
    currency: string;
    sentDate?: Date;
    responseReceived?: boolean;
    responseDate?: Date;
    confirmedAmount?: number;
    differences?: string;
}

/**
 * ERP data extraction result.
 */
export interface ERPExtractionResult {
    source: 'SAP' | 'ORACLE' | 'QUICKBOOKS' | 'XERO' | 'SAGE' | 'MANUAL';
    extractionDate: Date;
    recordCount: number;
    totalValue: number;
    dataQuality: 'HIGH' | 'MODERATE' | 'LOW';
    validationErrors: string[];
    transactions: ERPTransaction[];
}

/**
 * ERP transaction record.
 */
export interface ERPTransaction {
    transactionId: string;
    date: Date;
    account: string;
    description: string;
    debitAmount: number;
    creditAmount: number;
    reference?: string;
    documentPath?: string;
}

// ============================================================================
// GOING CONCERN TYPES
// ============================================================================

/**
 * Malta going concern assessment.
 */
export interface MaltaGoingConcernAssessment extends GoingConcernAssessment {
    /** Liquidity ratios */
    liquidityRatios: {
        currentRatio: number;
        quickRatio: number;
        cashRatio: number;
    };
    /** Working capital position */
    workingCapital: number;
    /** Debt coverage ratio */
    debtCoverageRatio: number;
    /** 12-month cash flow forecast */
    cashFlowForecast?: CashFlowForecast;
    /** Stress test scenarios */
    stressTestResults?: StressTestResult[];
    /** HITL review triggered */
    hitlReviewTriggered: boolean;
}

/**
 * Cash flow forecast.
 */
export interface CashFlowForecast {
    forecastPeriod: string;
    openingCash: number;
    projectedReceipts: number;
    projectedPayments: number;
    closingCash: number;
    monthlyBreakdown: MonthlyForecast[];
}

/**
 * Monthly forecast breakdown.
 */
export interface MonthlyForecast {
    month: string;
    receipts: number;
    payments: number;
    netCashFlow: number;
    closingBalance: number;
}

/**
 * Stress test result.
 */
export interface StressTestResult {
    scenario: string;
    revenueImpact: number;
    cashImpact: number;
    daysOfCoverage: number;
    breachesCovenants: boolean;
    conclusion: string;
}

/**
 * Going concern trigger thresholds.
 */
export const GOING_CONCERN_TRIGGERS = {
    currentRatio: 1.0,       // < 1.0 triggers HITL review
    quickRatio: 0.5,         // < 0.5 critical
    debtCoverage: 1.5,       // < 1.5 concerning
    workingCapital: 0,       // Negative triggers review
    daysOfCash: 30,          // < 30 days triggers review
} as const;

// ============================================================================
// REPORTING TYPES
// ============================================================================

/**
 * Malta audit opinion with local requirements.
 */
export interface MaltaAuditOpinion extends AuditOpinion {
    /** Malta-specific disclosures */
    maltaDisclosures?: string[];
    /** MBR filing reference */
    mbrFilingReference?: string;
    /** Accountancy Board requirements met */
    accountancyBoardCompliant: boolean;
    /** EQCR completed (for PIEs) */
    eqcrCompleted?: boolean;
    /** EQCR reviewer */
    eqcrReviewer?: string;
}

/**
 * Engagement Quality Control Review.
 */
export interface EQCRResult {
    reviewerId: string;
    reviewerWarrantNo: string;
    reviewDate: Date;
    significantJudgments: string[];
    conclusionsReached: string[];
    consultationsRequired: boolean;
    consultationsSummary?: string;
    approved: boolean;
    conditions?: string[];
}

/**
 * MBR filing submission.
 */
export interface MBRFilingSubmission {
    companyRegistrationNo: string;
    filingType: 'ANNUAL_RETURN' | 'AUDITED_ACCOUNTS' | 'ABBREVIATED_ACCOUNTS';
    periodEnd: Date;
    submissionDate: Date;
    referenceNumber: string;
    status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'PENDING';
    documents: string[];
}

// ============================================================================
// HITL GATE TYPES
// ============================================================================

/**
 * Human-in-the-Loop gate definition.
 */
export interface HITLGate {
    gateId: string;
    gateName: string;
    triggerCondition: string;
    requiredReviewer: 'PARTNER' | 'MANAGER' | 'SENIOR' | 'EQCR';
    timeoutHours: number;
    escalationPath: string;
}

/**
 * HITL gate decision.
 */
export interface HITLGateDecision {
    gateId: string;
    engagementId: string;
    triggeredAt: Date;
    triggeredBy: string;
    triggerReason: string;
    reviewerId?: string;
    reviewerRole?: string;
    decision?: 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'PENDING';
    decisionDate?: Date;
    rationale?: string;
    conditions?: string[];
}

/**
 * Standard HITL gates for Malta audit.
 */
export const MALTA_HITL_GATES: HITLGate[] = [
    {
        gateId: 'GATE_001',
        gateName: 'New Client Acceptance',
        triggerCondition: 'New client engagement',
        requiredReviewer: 'PARTNER',
        timeoutHours: 48,
        escalationPath: 'Managing Partner',
    },
    {
        gateId: 'GATE_002',
        gateName: 'Audit Plan Approval',
        triggerCondition: 'All engagements',
        requiredReviewer: 'MANAGER',
        timeoutHours: 72,
        escalationPath: 'Engagement Partner',
    },
    {
        gateId: 'GATE_003',
        gateName: 'Sample Size Override',
        triggerCondition: 'High-risk areas',
        requiredReviewer: 'SENIOR',
        timeoutHours: 24,
        escalationPath: 'Audit Manager',
    },
    {
        gateId: 'GATE_004',
        gateName: 'Materiality Override',
        triggerCondition: 'Materiality exceeds 10% of benchmark',
        requiredReviewer: 'PARTNER',
        timeoutHours: 24,
        escalationPath: 'Quality Partner',
    },
    {
        gateId: 'GATE_005',
        gateName: 'Modified Opinion',
        triggerCondition: 'Qualified/Adverse/Disclaimer opinion',
        requiredReviewer: 'PARTNER',
        timeoutHours: 48,
        escalationPath: 'EQCR + Managing Partner',
    },
    {
        gateId: 'GATE_006',
        gateName: 'Going Concern Issue',
        triggerCondition: 'Current ratio < 1.0 or material uncertainty',
        requiredReviewer: 'PARTNER',
        timeoutHours: 48,
        escalationPath: 'EQCR + Risk Partner',
    },
] as const;

// ============================================================================
// AGENT INTERFACE
// ============================================================================

/**
 * Base Malta Audit Agent interface.
 */
export interface MaltaAuditAgent {
    readonly agentId: string;
    readonly name: string;
    readonly version: string;
    readonly agentType:
    | 'ROUTING'
    | 'PLANNING'
    | 'RISK_ASSESSMENT'
    | 'SUBSTANTIVE_TESTING'
    | 'GOING_CONCERN'
    | 'REPORTING'
    | 'ORCHESTRATOR';
    readonly isaReferences: string[];
    readonly autonomyLevel: 0 | 1 | 2 | 3 | 4 | 5;
}

/**
 * Agent response with Malta-specific metadata.
 */
export interface MaltaAgentResponse<T> extends AgentResponse<T> {
    /** Agent that produced this response */
    agentId: string;
    /** Malta-specific audit trail reference */
    auditTrailId?: string;
    /** HITL gate triggered */
    hitlGateTriggered?: string;
    /** Human review required */
    requiresReview: boolean;
    /** Review reason */
    reviewReason?: string;
    /** Execution duration in ms */
    durationMs: number;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

/**
 * MFSA Registry API response.
 */
export interface MFSARegulatedStatus {
    regulated: boolean;
    category?: 'MIFID' | 'INSURANCE' | 'VFA' | 'UCITS' | 'FUND';
    licenseNumber?: string;
    licenseStatus?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
    supervisingDivision?: string;
}

/**
 * MFSA Approved Auditor.
 */
export interface MFSAApprovedAuditor {
    name: string;
    warrantNumber: string;
    firm: string;
    approvalDate: Date;
    categories: string[];
    status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
}

/**
 * MBR Company Details.
 */
export interface MBRCompanyDetails {
    registrationNumber: string;
    companyName: string;
    registeredAddress: string;
    incorporationDate: Date;
    companyType: string;
    status: 'ACTIVE' | 'DISSOLVED' | 'STRUCK_OFF' | 'IN_LIQUIDATION';
    directors: string[];
    shareholders: string[];
    lastAnnualReturnDate?: Date;
    nextFilingDeadline?: Date;
}

// ============================================================================
// AUDIT TRAIL TYPES
// ============================================================================

/**
 * Immutable audit trail entry.
 */
export interface AuditTrailEntry {
    id: string;
    engagementId: string;
    agentId: string;
    action: string;
    inputHash: string;
    outputHash: string;
    timestamp: Date;
    userId?: string;
    ipAddress?: string;
}

/**
 * Engagement archive.
 */
export interface EngagementArchive {
    engagementId: string;
    companyRegistrationNo: string;
    periodEnd: Date;
    engagementType: MaltaEngagementType;
    opinionType: AuditOpinion['opinionType'];
    partnerId: string;
    archiveDate: Date;
    retentionExpiry: Date;  // 7 years per Companies Act
    documentHashes: Record<string, string>;
    sealed: boolean;
}
