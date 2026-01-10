/**
 * Rwanda Audit Types
 * 
 * Common types for Rwanda Audit AI Agent System.
 * ISA-compliant with ICPAR regulatory requirements.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum RiskLevel {
    LOW = 'low',
    MODERATE = 'moderate',
    HIGH = 'high',
    CRITICAL = 'critical',
}

export enum AuditPhase {
    PLANNING = 'planning',
    RISK_ASSESSMENT = 'risk_assessment',
    SUBSTANTIVE_TESTING = 'substantive_testing',
    GOING_CONCERN = 'going_concern',
    COMPLETION = 'completion',
    REPORTING = 'reporting',
}

export enum OpinionType {
    UNMODIFIED = 'unmodified',
    QUALIFIED = 'qualified',
    ADVERSE = 'adverse',
    DISCLAIMER = 'disclaimer',
}

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface RwandaAuditAgent {
    readonly name: string;
    readonly version: string;
    readonly category: 'audit';
    readonly jurisdiction: 'RW';
    getCapabilities(): string[];
}

export interface AgentConfig {
    openaiApiKey?: string;
    organizationId?: string;
    userId?: string;
    enableAIFeatures?: boolean;
}

export interface AuditContext {
    entityId: string;
    entityName: string;
    fiscalYearEnd: Date;
    reportingFramework: 'IFRS' | 'IFRS_SME';
    isPublicInterestEntity: boolean;
    icparRegistrationNumber?: string;
    previousAuditor?: string;
}

// ============================================================================
// MATERIALITY
// ============================================================================

export interface MaterialityCalculation {
    overallMateriality: number;
    performanceMateriality: number;
    trivialThreshold: number;
    benchmarkUsed: string;
    benchmarkValue: number;
    percentageApplied: number;
    justification: string;
}

// ============================================================================
// RISK ASSESSMENT
// ============================================================================

export interface RiskAssessment {
    accountArea: string;
    inherentRisk: RiskLevel;
    controlRisk: RiskLevel;
    detectionRisk: RiskLevel;
    combinedRisk: RiskLevel;
    significantRisk: boolean;
    riskFactors: string[];
    auditResponse: string[];
}

export interface FraudRiskIndicator {
    indicator: string;
    category: 'incentive' | 'opportunity' | 'rationalization';
    severity: RiskLevel;
    evidence: string[];
}

// ============================================================================
// AUDIT PROCEDURES
// ============================================================================

export interface AuditProcedure {
    procedureId: string;
    description: string;
    assertion: 'existence' | 'completeness' | 'accuracy' | 'valuation' | 'rights' | 'presentation';
    testType: 'substantive' | 'control' | 'analytical';
    status: 'planned' | 'in_progress' | 'completed' | 'deferred';
    result?: 'satisfactory' | 'exception' | 'misstatement';
    findings?: string[];
    workpaperRef?: string;
}

export interface SampleSelection {
    populationSize: number;
    sampleSize: number;
    selectionMethod: 'random' | 'systematic' | 'haphazard' | 'mus';
    confidenceLevel: number;
    tolerableError: number;
    expectedError: number;
}

// ============================================================================
// GOING CONCERN
// ============================================================================

export interface GoingConcernAssessment {
    assessmentDate: Date;
    forecastPeriod: number; // months
    conclusion: 'no_uncertainty' | 'material_uncertainty' | 'significant_doubt';
    indicators: GoingConcernIndicator[];
    mitigatingFactors: string[];
    managementPlans: string[];
    auditResponse: string;
}

export interface GoingConcernIndicator {
    category: 'financial' | 'operating' | 'other';
    description: string;
    severity: RiskLevel;
    present: boolean;
}

// ============================================================================
// KEY AUDIT MATTERS
// ============================================================================

export interface KeyAuditMatter {
    matter: string;
    whyConsidered: string;
    howAddressed: string;
    relatedAccounts: string[];
    isaReference: string;
}

// ============================================================================
// AUDIT FINDINGS
// ============================================================================

export interface AuditFinding {
    findingId: string;
    description: string;
    criteria: string;
    condition: string;
    cause: string;
    effect: string;
    recommendation: string;
    severity: RiskLevel;
    managementResponse?: string;
    status: 'open' | 'resolved' | 'disputed';
}

export interface Misstatement {
    misstatementsId: string;
    accountArea: string;
    description: string;
    amount: number;
    type: 'factual' | 'judgmental' | 'projected';
    corrected: boolean;
    impactOnOpinion: boolean;
}

// ============================================================================
// AUDIT REPORT
// ============================================================================

export interface AuditReport {
    reportId: string;
    entityName: string;
    fiscalYearEnd: Date;
    reportDate: Date;
    opinionType: OpinionType;
    opinionParagraph: string;
    basisForOpinion: string;
    goingConcernParagraph?: string;
    keyAuditMatters?: KeyAuditMatter[];
    emphasisOfMatter?: string[];
    otherMatter?: string[];
    otherInformation: string;
    responsibilitiesOfManagement: string;
    auditorResponsibilities: string;
    auditorSignature: string;
    auditorFirmName: string;
    icparNumber: string;
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

export interface Anomaly {
    anomalyId: string;
    type: 'statistical' | 'pattern' | 'benford' | 'duplicate' | 'timing';
    description: string;
    severity: RiskLevel;
    affectedRecords: number;
    totalValue: number;
    confidence: number;
    explanation?: string;
    investigated: boolean;
    resolution?: string;
}

export interface BenfordsAnalysis {
    firstDigitDistribution: Record<string, number>;
    expectedDistribution: Record<string, number>;
    chiSquareStatistic: number;
    pValue: number;
    conformsToLaw: boolean;
}
