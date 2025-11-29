/**
 * Audit Agents - Barrel Export
 * All 10 ISA-compliant Audit Specialist Agents
 * 
 * Note: Using namespace exports to avoid name collisions
 * for SYSTEM_PROMPT and other common exports.
 */

// Planning Agent
export {
  PLANNING_AGENT_CONFIG,
  handlePlanningRequest,
  calculateAuditMateriality,
  assessRisks,
  createAuditProgram,
  SYSTEM_PROMPT as PLANNING_SYSTEM_PROMPT,
  type PlanningRequest,
  type PlanningResponse,
} from './planning';

// Risk Assessment Agent
export {
  RISK_AGENT_CONFIG,
  handleRiskRequest,
  assessAccountRisk,
  identifySignificantRisks,
  SYSTEM_PROMPT as RISK_SYSTEM_PROMPT,
  type RiskRequest,
} from './risk-assessment';

// Substantive Testing Agent
export {
  SUBSTANTIVE_AGENT_CONFIG,
  handleSubstantiveRequest,
  designSubstantiveProcedure,
  calculateAuditSample,
  projectSampleMisstatement,
  evaluateTestResults,
  SYSTEM_PROMPT as SUBSTANTIVE_SYSTEM_PROMPT,
  type SubstantiveRequest,
} from './substantive-testing';

// Internal Controls Agent
export {
  CONTROLS_AGENT_CONFIG,
  handleControlsRequest,
  evaluateControlDesign,
  testOperatingEffectiveness,
  SYSTEM_PROMPT as CONTROLS_SYSTEM_PROMPT,
  type ControlsRequest,
} from './internal-controls';

// Fraud Risk Agent
export {
  FRAUD_AGENT_CONFIG,
  handleFraudRequest,
  identifyFraudRisks,
  analyzeJournalEntries,
  SYSTEM_PROMPT as FRAUD_SYSTEM_PROMPT,
  type FraudRequest,
} from './fraud-risk';

// Analytics Agent
export {
  ANALYTICS_AGENT_CONFIG,
  handleAnalyticsRequest,
  performBenfordAnalysis,
  detectOutliers,
  SYSTEM_PROMPT as ANALYTICS_SYSTEM_PROMPT,
  type AnalyticsRequest,
} from './analytics';

// Group Audit Agent
export {
  GROUP_AUDIT_AGENT_CONFIG,
  handleGroupAuditRequest,
  classifyComponent,
  allocateComponentMateriality,
  SYSTEM_PROMPT as GROUP_SYSTEM_PROMPT,
  type GroupAuditRequest,
} from './group-audit';

// Completion Agent
export {
  COMPLETION_AGENT_CONFIG,
  handleCompletionRequest,
  assessGoingConcern,
  evaluateSubsequentEvent,
  prepareWrittenRepresentations,
  SYSTEM_PROMPT as COMPLETION_SYSTEM_PROMPT,
  type CompletionRequest,
} from './completion';

// Quality Review Agent
export {
  QUALITY_REVIEW_AGENT_CONFIG,
  handleQualityReviewRequest,
  reviewSignificantJudgments,
  reviewIndependence,
  reviewOpinionAppropriate,
  SYSTEM_PROMPT as QUALITY_SYSTEM_PROMPT,
  type QualityReviewRequest,
} from './quality-review';

// Report Agent
export {
  REPORT_AGENT_CONFIG,
  handleReportRequest,
  formulateOpinion,
  identifyKeyAuditMatters,
  prepareAuditReport,
  SYSTEM_PROMPT as REPORT_SYSTEM_PROMPT,
  type ReportRequest,
} from './report';
