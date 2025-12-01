/**
 * @prisma-glow/audit-agents
 * AI-Powered ISA-Compliant Audit Specialist Agents
 * 
 * Complete suite of 18 specialized audit agents covering the full audit lifecycle:
 * - Planning & Risk Assessment
 * - Substantive Testing & Controls
 * - Fraud Detection & Analytics
 * - Group Audits & Completion
 * - Quality Review & Reporting
 * - Materiality & Sampling
 * - Documentation & Independence
 * - IT Audit & Specialized Domains
 * 
 * @version 1.1.0
 * @license MIT
 */

// Internal imports for getAuditAgentHandler function
import { handlePlanningRequest } from './agents/planning';
import { handleRiskRequest } from './agents/risk-assessment';
import { handleSubstantiveRequest } from './agents/substantive-testing';
import { handleControlsRequest } from './agents/internal-controls';
import { handleFraudRequest } from './agents/fraud-risk';
import { handleAnalyticsRequest } from './agents/analytics';
import { handleGroupAuditRequest } from './agents/group-audit';
import { handleCompletionRequest } from './agents/completion';
import { handleQualityReviewRequest } from './agents/quality-review';
import { handleReportRequest } from './agents/report';
import { handleMaterialitySamplingRequest } from './agents/materiality-sampling';
import { handleDocumentationRequest } from './agents/documentation';
import { handleIndependenceEthicsRequest } from './agents/independence-ethics';
import { handleITAuditRequest } from './agents/it-systems';
import { handleInternalAuditRequest } from './agents/internal-audit';
import { handleESGRequest } from './agents/esg-assurance';
import { handleForensicRequest } from './agents/forensic';
import { handlePublicSectorRequest } from './agents/public-sector';
import type { AgentResponse } from './types';

// Agent Configurations
export {
  PLANNING_AGENT_CONFIG,
  handlePlanningRequest,
  calculateAuditMateriality,
  assessRisks,
  createAuditProgram,
  type PlanningRequest,
  type PlanningResponse,
} from './agents/planning';

export {
  RISK_AGENT_CONFIG,
  handleRiskRequest,
  assessAccountRisk,
  identifySignificantRisks,
  type RiskRequest,
} from './agents/risk-assessment';

export {
  SUBSTANTIVE_AGENT_CONFIG,
  handleSubstantiveRequest,
  designSubstantiveProcedure,
  calculateAuditSample,
  projectSampleMisstatement,
  evaluateTestResults,
  type SubstantiveRequest,
} from './agents/substantive-testing';

export {
  CONTROLS_AGENT_CONFIG,
  handleControlsRequest,
  evaluateControlDesign,
  testOperatingEffectiveness,
  type ControlsRequest,
} from './agents/internal-controls';

export {
  FRAUD_AGENT_CONFIG,
  handleFraudRequest,
  identifyFraudRisks,
  analyzeJournalEntries,
  type FraudRequest,
} from './agents/fraud-risk';

export {
  ANALYTICS_AGENT_CONFIG,
  handleAnalyticsRequest,
  performBenfordAnalysis,
  detectOutliers,
  type AnalyticsRequest,
} from './agents/analytics';

export {
  GROUP_AUDIT_AGENT_CONFIG,
  handleGroupAuditRequest,
  classifyComponent,
  allocateComponentMateriality,
  type GroupAuditRequest,
} from './agents/group-audit';

export {
  COMPLETION_AGENT_CONFIG,
  handleCompletionRequest,
  assessGoingConcern,
  evaluateSubsequentEvent,
  prepareWrittenRepresentations,
  type CompletionRequest,
} from './agents/completion';

export {
  QUALITY_REVIEW_AGENT_CONFIG,
  handleQualityReviewRequest,
  reviewSignificantJudgments,
  reviewIndependence,
  reviewOpinionAppropriate,
  type QualityReviewRequest,
} from './agents/quality-review';

export {
  REPORT_AGENT_CONFIG,
  handleReportRequest,
  formulateOpinion,
  identifyKeyAuditMatters,
  prepareAuditReport,
  type ReportRequest,
} from './agents/report';

// New Agent Exports - Methodological Agents
export {
  MATERIALITY_SAMPLING_AGENT_CONFIG,
  handleMaterialitySamplingRequest,
  calculateMaterialityThresholds,
  calculateSampleSize as calculateMaterialitySampleSize,
  projectSampleMisstatement as projectMaterialityMisstatement,
  type MaterialityRequest,
  type SampleDesign,
  type ProjectedMisstatement,
} from './agents/materiality-sampling';

export {
  DOCUMENTATION_AGENT_CONFIG,
  handleDocumentationRequest,
  getWorkpaperTemplate,
  reviewDocumentation,
  rollforwardWorkpapers,
  type DocumentationRequest,
  type WorkpaperTemplate,
  type DocumentationReview,
  type RollforwardResult,
} from './agents/documentation';

export {
  INDEPENDENCE_ETHICS_AGENT_CONFIG,
  handleIndependenceEthicsRequest,
  assessThreat,
  evaluateNonAuditService,
  checkPartnerRotation,
  type IndependenceRequest,
  type ThreatAssessment,
  type IndependenceCheck,
  type NASAssessment,
  type RotationCheck,
} from './agents/independence-ethics';

export {
  IT_SYSTEMS_AGENT_CONFIG,
  handleITAuditRequest,
  assessITEnvironment,
  testITGC,
  reviewUserAccess,
  assessCybersecurity,
  type ITAuditRequest,
  type ITGCAssessment,
  type AppControlAssessment,
  type AccessReviewResult,
  type CybersecurityAssessment,
} from './agents/it-systems';

export {
  INTERNAL_AUDIT_AGENT_CONFIG,
  handleInternalAuditRequest,
  developAuditPlan,
  assessRisks as assessInternalAuditRisks,
  createEngagementPlan,
  conductComplianceReview,
  type InternalAuditRequest,
  type AuditPlanEntry,
  type RiskAssessmentMatrix,
  type EngagementPlan,
  type ComplianceReview,
} from './agents/internal-audit';

export {
  ESG_ASSURANCE_AGENT_CONFIG,
  handleESGRequest,
  planESGAssurance,
  assessMateriality,
  testKPI,
  type ESGRequest,
  type ESGAssurancePlan,
  type MaterialityAssessment,
  type KPITestResult,
  type DisclosureEvaluation,
} from './agents/esg-assurance';

export {
  FORENSIC_AGENT_CONFIG,
  handleForensicRequest,
  planInvestigation,
  traceTransaction,
  developHypothesis,
  analyzeIndicators,
  type ForensicRequest,
  type InvestigationPlan,
  type TransactionTrace,
  type FraudHypothesis,
  type IndicatorAnalysis,
} from './agents/forensic';

export {
  PUBLIC_SECTOR_AGENT_CONFIG,
  handlePublicSectorRequest,
  planFinancialAudit,
  planPerformanceAudit,
  evaluateBudget,
  assessCompliance,
  type PublicSectorRequest,
  type PublicSectorAuditPlan,
  type PerformanceAuditPlan,
  type BudgetEvaluation,
  type ComplianceAssessment,
} from './agents/public-sector';

// Types
export type {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  AuditContext,
  MaterialityCalculation,
  RiskAssessment,
  AuditProcedure,
  ProcedureResult,
  Misstatement,
  ControlDeficiency,
  InternalControl,
  FraudIndicator,
  AuditEvidence,
  GroupComponent,
  KeyAuditMatter,
  GoingConcernAssessment,
  SubsequentEvent,
  AuditOpinion,
  AssertionType,
  RiskLevel,
  AuditStandard,
} from './types';

// Utilities
export {
  calculateMateriality,
  calculateSampleSize as calculateUtilSampleSize,
  calculateCombinedRisk,
  isSignificantRisk,
  projectMisstatement,
  evaluateMateriality,
} from './utils';

/**
 * Agent Registry - All 18 Audit Specialists
 */
export const AUDIT_AGENTS = [
  // Original 10 agents
  { id: 'audit-plan-012', name: 'Audit Planning Specialist' },
  { id: 'audit-risk-013', name: 'Risk Assessment Specialist' },
  { id: 'audit-subst-014', name: 'Substantive Testing Specialist' },
  { id: 'audit-control-015', name: 'Internal Controls Specialist' },
  { id: 'audit-fraud-016', name: 'Fraud Risk Assessment Specialist' },
  { id: 'audit-analytics-017', name: 'Audit Data Analytics Specialist' },
  { id: 'audit-group-018', name: 'Group Audit Specialist' },
  { id: 'audit-complete-019', name: 'Audit Completion Specialist' },
  { id: 'audit-quality-020', name: 'Engagement Quality Reviewer' },
  { id: 'audit-report-021', name: 'Audit Report Specialist' },
  // New 8 agents
  { id: 'audit-matsampling-043', name: 'Materiality & Sampling Specialist' },
  { id: 'audit-doc-044', name: 'Audit Documentation Specialist' },
  { id: 'audit-ethics-045', name: 'Independence & Ethics Specialist' },
  { id: 'audit-it-046', name: 'IT & Systems Audit Specialist' },
  { id: 'audit-internal-047', name: 'Internal Audit & Compliance Specialist' },
  { id: 'audit-esg-048', name: 'ESG & Sustainability Assurance Specialist' },
  { id: 'audit-forensic-049', name: 'Forensic & Investigation Specialist' },
  { id: 'audit-public-050', name: 'Public Sector Audit Specialist' },
] as const;

/**
 * Get agent handler by ID
 */
export function getAuditAgentHandler(agentId: string): ((request: any) => Promise<AgentResponse<any>>) | null {
  const handlers: Record<string, (request: any) => Promise<AgentResponse<any>>> = {
    // Original handlers
    'audit-plan-012': handlePlanningRequest,
    'audit-risk-013': handleRiskRequest,
    'audit-subst-014': handleSubstantiveRequest,
    'audit-control-015': handleControlsRequest,
    'audit-fraud-016': handleFraudRequest,
    'audit-analytics-017': handleAnalyticsRequest,
    'audit-group-018': handleGroupAuditRequest,
    'audit-complete-019': handleCompletionRequest,
    'audit-quality-020': handleQualityReviewRequest,
    'audit-report-021': handleReportRequest,
    // New handlers
    'audit-matsampling-043': handleMaterialitySamplingRequest,
    'audit-doc-044': handleDocumentationRequest,
    'audit-ethics-045': handleIndependenceEthicsRequest,
    'audit-it-046': handleITAuditRequest,
    'audit-internal-047': handleInternalAuditRequest,
    'audit-esg-048': handleESGRequest,
    'audit-forensic-049': handleForensicRequest,
    'audit-public-050': handlePublicSectorRequest,
  };

  return handlers[agentId] || null;
}
