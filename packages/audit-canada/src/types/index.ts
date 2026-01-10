/**
 * Canada Audit Types
 * 
 * Type definitions for Canadian Auditing Standards (CAS) automation.
 * Aligned with CPA Canada Assurance Handbook and CPAB requirements.
 * 
 * @package @prisma/audit-canada
 */

// ============================================================================
// CORE AUDIT TYPES
// ============================================================================

export type CASStandard =
    | 'CAS_200' | 'CAS_210' | 'CAS_220' | 'CAS_230' | 'CAS_240'
    | 'CAS_250' | 'CAS_260' | 'CAS_265'
    | 'CAS_300' | 'CAS_315' | 'CAS_320' | 'CAS_330'
    | 'CAS_402' | 'CAS_450'
    | 'CAS_500' | 'CAS_501' | 'CAS_505' | 'CAS_510' | 'CAS_520' | 'CAS_530' | 'CAS_540' | 'CAS_550' | 'CAS_560' | 'CAS_570' | 'CAS_580'
    | 'CAS_600' | 'CAS_610' | 'CAS_620'
    | 'CAS_700' | 'CAS_701' | 'CAS_705' | 'CAS_706' | 'CAS_710' | 'CAS_720';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'significant';

export type AuditPhase =
    | 'planning'
    | 'risk_assessment'
    | 'internal_controls'
    | 'substantive_testing'
    | 'completion'
    | 'reporting';

// ============================================================================
// ENTITY & ENGAGEMENT TYPES
// ============================================================================

export type EntityType =
    | 'public_company'      // TSX/TSXV listed
    | 'private_enterprise'  // Private corp
    | 'not_for_profit'      // NPO/charity
    | 'public_sector'       // Government
    | 'pie';                // Public Interest Entity

export type CanadianProvince =
    | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU'
    | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

export interface AuditEngagement {
    engagementId: string;
    entityId: string;
    entityName: string;
    entityType: EntityType;
    fiscalYearEnd: Date;
    industry: string;
    province: CanadianProvince;
    isFirstYearAudit: boolean;
    isGroupAudit: boolean;
    requiresCPABOversight: boolean;  // Public companies
    requiresSOX404: boolean;         // SEC registrants
    requiresNI52109: boolean;        // Canadian reporting issuers
}

export interface ClientProfile {
    entityId: string;
    entityName: string;
    entityType: EntityType;
    industry: string;
    revenueCAD: number;
    totalAssetsCAD: number;
    employeeCount: number;
    province: CanadianProvince;
    debtToEquity: number;
    isPubliclyTraded: boolean;
    hasForeignOperations: boolean;
    hasRelatedPartyTransactions: boolean;
    priorYearAuditFindings: AuditFinding[];
}

// ============================================================================
// RISK ASSESSMENT TYPES (CAS 315)
// ============================================================================

export interface RiskAssessment {
    engagementId: string;
    assessmentDate: Date;
    entityRisks: EntityRisk[];
    controlRisks: ControlRisk[];
    assertionRisks: AssertionRisk[];
    fraudRisks: FraudRisk[];
    significantRisks: SignificantRisk[];
    materiality: MaterialityThresholds;
    overallRiskLevel: RiskLevel;
}

export interface EntityRisk {
    riskId: string;
    area: string;
    description: string;
    likelihood: RiskLevel;
    impact: RiskLevel;
    overallLevel: RiskLevel;
    casReference: CASStandard;
    cpabReference?: string;
    mitigatingFactors?: string[];
    auditResponse: string[];
}

export interface ControlRisk {
    riskId: string;
    process: string;
    controlDescription: string;
    designEffectiveness: 'effective' | 'ineffective' | 'not_tested';
    operatingEffectiveness: 'effective' | 'ineffective' | 'not_tested';
    deficiencyLevel?: 'minor' | 'significant' | 'material_weakness';
    remediation?: string;
}

export interface AssertionRisk {
    riskId: string;
    accountOrClass: string;
    assertion: Assertion;
    riskLevel: RiskLevel;
    isSignificantRisk: boolean;
    auditProcedures: string[];
}

export type Assertion =
    // Classes of transactions and events
    | 'occurrence'
    | 'completeness'
    | 'accuracy'
    | 'cutoff'
    | 'classification'
    // Account balances
    | 'existence'
    | 'rights_and_obligations'
    | 'valuation_and_allocation'
    // Presentation and disclosure
    | 'occurrence_and_rights'
    | 'completeness_disclosure'
    | 'classification_and_understandability'
    | 'accuracy_and_valuation';

export interface FraudRisk {
    riskId: string;
    fraudType: 'revenue_recognition' | 'asset_misappropriation' | 'fraudulent_reporting' | 'override_of_controls';
    description: string;
    riskLevel: RiskLevel;
    fraudTriangleFactors: {
        pressure: string[];
        opportunity: string[];
        rationalization: string[];
    };
    auditResponse: string[];
    casReference: 'CAS_240';
}

export interface SignificantRisk {
    riskId: string;
    description: string;
    relatedAssertion: Assertion;
    accountsAffected: string[];
    requiresSpecialProcedures: boolean;
    procedures: string[];
    casReference: CASStandard;
}

export interface MaterialityThresholds {
    overallMateriality: number;
    performanceMateriality: number;
    trivialThreshold: number;
    benchmark: string;
    benchmarkPercentage: number;
    calculationBasis: string;
}

// ============================================================================
// AUDIT PROCEDURES & TESTING TYPES
// ============================================================================

export interface AuditProcedure {
    procedureId: string;
    name: string;
    objective: string;
    casReference: CASStandard;
    phase: AuditPhase;
    nature: 'risk_assessment' | 'test_of_controls' | 'substantive_analytical' | 'test_of_details';
    timing: 'interim' | 'year_end' | 'subsequent';
    extent: string;
    steps: string[];
    estimatedHours: number;
    riskLevel: RiskLevel;
    required: boolean;
    jurisdictionNotes?: string;
}

export interface AuditTest {
    testId: string;
    procedureId: string;
    sampleSize: number;
    samplingMethod: 'statistical' | 'non_statistical' | 'haphazard';
    confidenceLevel?: number;
    expectedErrorRate?: number;
    tolerableErrorRate?: number;
    testDate: Date;
    testedBy: string;
    status: 'planned' | 'in_progress' | 'completed';
}

export interface JournalEntryTest {
    testId: string;
    fiscalYear: string;
    totalPopulation: number;
    highRiskEntries: number;
    anomaliesDetected: number;
    benfordOutliers: number;
    testCriteria: JETestCriteria[];
    findings: AuditFinding[];
    workpaperRef: string;
}

export interface JETestCriteria {
    criteriaId: string;
    description: string;
    entriesMatched: number;
    riskIndicator: string;
}

export interface EstimateTest {
    testId: string;
    estimateType: EstimateType;
    clientEstimate: number;
    auditorEstimate: number;
    variance: number;
    variancePercent: number;
    withinTolerance: boolean;
    methodology: string;
    casReference: 'CAS_540';
    conclusion: string;
}

export type EstimateType =
    | 'ECL_IFRS9'
    | 'ALLOWANCE_DOUBTFUL_ACCOUNTS'
    | 'GOODWILL_IMPAIRMENT'
    | 'INVENTORY_NRV'
    | 'WARRANTY_PROVISION'
    | 'LEASE_DISCOUNT_RATE'
    | 'REVENUE_VARIABLE_CONSIDERATION'
    | 'DEFERRED_TAX_ASSET';

// ============================================================================
// AUDIT FINDINGS & REPORTING TYPES
// ============================================================================

export interface AuditFinding {
    findingId: string;
    type: FindingType;
    severity: 'minor' | 'significant' | 'material';
    description: string;
    accountAffected: string;
    amount?: number;
    proposedAdjustment?: number;
    casReference: CASStandard;
    clientResponse?: string;
    status: 'open' | 'resolved' | 'waived';
}

export type FindingType =
    | 'misstatement'
    | 'control_deficiency'
    | 'fraud_indicator'
    | 'going_concern'
    | 'related_party'
    | 'subsequent_event'
    | 'scope_limitation';

export interface AuditOpinion {
    opinionType: OpinionType;
    basisParagraph: string;
    opinionParagraph: string;
    emphasisOfMatter?: string[];
    otherMatter?: string[];
    keyAuditMatters?: KeyAuditMatter[];
    casReference: 'CAS_700' | 'CAS_705';
}

export type OpinionType =
    | 'unmodified'
    | 'qualified'
    | 'adverse'
    | 'disclaimer';

export interface KeyAuditMatter {
    kamId: string;
    title: string;
    description: string;
    auditResponse: string;
    noteReference: string;
    casReference: 'CAS_701';
}

export interface AuditReport {
    reportId: string;
    engagementId: string;
    reportDate: Date;
    opinion: AuditOpinion;
    addressee: string;
    entityName: string;
    periodCovered: {
        start: Date;
        end: Date;
    };
    signatoryPartner: string;
    firmName: string;
    firmLocation: string;
    sections: AuditReportSection[];
}

export interface AuditReportSection {
    sectionId: string;
    title: string;
    content: string;
    order: number;
}

// ============================================================================
// CPAB INSPECTION TYPES
// ============================================================================

export interface CPABReadinessAssessment {
    assessmentId: string;
    engagementId: string;
    assessmentDate: Date;
    overallScore: number;
    passThreshold: number;
    passed: boolean;
    areaScores: CPABAreaScore[];
    gaps: CPABGap[];
    remediationPlan: CPABRemediation[];
}

export interface CPABAreaScore {
    area: CPABFocusArea;
    score: number;
    weight: number;
    findings: string[];
}

export type CPABFocusArea =
    | 'revenue_recognition'
    | 'accounting_estimates'
    | 'group_audits'
    | 'internal_controls'
    | 'audit_documentation'
    | 'professional_skepticism'
    | 'going_concern';

export interface CPABGap {
    gapId: string;
    area: CPABFocusArea;
    description: string;
    severity: 'minor' | 'significant' | 'critical';
    casReference: CASStandard;
    expectedDocumentation: string[];
    actualDocumentation: string[];
}

export interface CPABRemediation {
    gapId: string;
    action: string;
    responsibility: string;
    dueDate: Date;
    status: 'pending' | 'in_progress' | 'completed';
}

// ============================================================================
// AUDIT WORKPAPER TYPES
// ============================================================================

export interface AuditWorkpaper {
    workpaperId: string;
    engagementId: string;
    reference: string;
    title: string;
    preparedBy: string;
    preparedDate: Date;
    reviewedBy?: string;
    reviewedDate?: Date;
    casReference: CASStandard;
    content: string;
    conclusion: string;
    crossReferences: string[];
    attachments: string[];
}

// ============================================================================
// AGENT TYPES
// ============================================================================

export type AuditAgentType =
    | 'risk_assessment'
    | 'fraud_risk'
    | 'substantive_testing'
    | 'journal_entry_testing'
    | 'estimates_testing'
    | 'audit_reporting'
    | 'kam_generation'
    | 'cpab_readiness';

export interface AuditAgentConfig {
    agentType: AuditAgentType;
    enableAI: boolean;
    cpabMode: boolean;  // Enhanced documentation for CPAB
    organizationId?: string;
    userId?: string;
}

export interface AuditContext {
    engagementId: string;
    userId: string;
    organizationId: string;
    fiscalYearEnd: Date;
    entityType: EntityType;
    province: CanadianProvince;
    isCPABEngagement: boolean;
}

export interface AuditAgentResponse<T = unknown> {
    success: boolean;
    data?: T;
    errors?: string[];
    warnings?: string[];
    workpaperRef?: string;
    casReferences: CASStandard[];
    processingTimeMs: number;
}
