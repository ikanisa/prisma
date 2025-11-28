/**
 * @prisma-glow/audit-agents
 * AI-Powered ISA-Compliant Audit Specialist Agents
 * 
 * Complete suite of 10 specialized audit agents covering the full audit lifecycle:
 * - Planning & Risk Assessment
 * - Substantive Testing & Controls
 * - Fraud Detection & Analytics
 * - Group Audits & Completion
 * - Quality Review & Reporting
 * 
 * @version 1.0.0
 * @license MIT
 */

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
  calculateSampleSize,
  calculateCombinedRisk,
  isSignificantRisk,
  projectMisstatement,
  evaluateMateriality,
} from './utils';

/**
 * Agent Registry - All 10 Audit Specialists
 */
export const AUDIT_AGENTS = [
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
] as const;

/**
 * Get agent handler by ID
 */
export function getAuditAgentHandler(agentId: string): ((request: any) => Promise<AgentResponse<any>>) | null {
  const handlers: Record<string, (request: any) => Promise<AgentResponse<any>>> = {
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
  };

  return handlers[agentId] || null;
}
