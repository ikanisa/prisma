/**
 * Audit Agent Type Definitions
 * Comprehensive types for ISA-compliant audit agents
 */

import { z } from 'zod';

// Base Agent Configuration
export interface AgentConfig {
  id: string;
  name: string;
  type: 'specialist' | 'orchestrator' | 'operational';
  tier: 1 | 2 | 3 | 4;
  domain: 'audit';
  description: string;
  version: string;
}

// Audit Standards
export type AuditStandard = 'ISA' | 'PCAOB' | 'GAAS' | 'UK-SA' | 'CAS';

// Audit Risk Levels
export type RiskLevel = 'low' | 'moderate' | 'significant' | 'high';

// Assertion Types
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

// Materiality Calculation
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
  ragGuidance?: string;
  citations?: string;
}

// Risk Assessment
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

// Audit Procedure
export interface AuditProcedure {
  id: string;
  type: 'risk_assessment' | 'test_of_controls' | 'substantive_analytical' | 'test_of_details';
  description: string;
  assertions: AssertionType[];
  riskAddressed: string[];
  sampleSize?: number;
  samplingMethod?: 'statistical' | 'non_statistical' | 'judgmental';
  expectedEvidence: string[];
  performer?: string;
  reviewer?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'reviewed';
  results?: ProcedureResult;
}

// Procedure Result
export interface ProcedureResult {
  conclusion: string;
  exceptionsFound: number;
  misstatements?: Misstatement[];
  controlDeficiencies?: ControlDeficiency[];
  evidenceObtained: string[];
  furtherProceduresNeeded: boolean;
}

// Misstatement
export interface Misstatement {
  amount: number;
  account: string;
  nature: 'factual' | 'judgmental' | 'projected';
  description: string;
  corrected: boolean;
  impactOnOpinion: 'none' | 'qualifies' | 'adverse' | 'disclaimer';
}

// Control Deficiency
export interface ControlDeficiency {
  control: string;
  deficiencyType: 'design' | 'operating_effectiveness';
  severity: 'deficiency' | 'significant_deficiency' | 'material_weakness';
  description: string;
  potentialMisstatement: string;
  compensatingControls: string[];
  managementResponse?: string;
}

// Internal Control
export interface InternalControl {
  id: string;
  controlActivity: string;
  cosoComponent: 'control_environment' | 'risk_assessment' | 'control_activities' | 'information_communication' | 'monitoring';
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  automation: 'manual' | 'automated' | 'hybrid';
  keyControl: boolean;
  assertions: AssertionType[];
  designEffective: boolean | null;
  operatingEffective: boolean | null;
  testingPerformed?: string;
}

// Fraud Indicator
export interface FraudIndicator {
  indicator: string;
  category: 'fraudulent_financial_reporting' | 'misappropriation_of_assets';
  severity: 'low' | 'moderate' | 'high';
  evidenceOfIndicator: string[];
  investigation: string;
  resolution?: string;
}

// Audit Evidence
export interface AuditEvidence {
  id: string;
  procedureId: string;
  type: 'inspection' | 'observation' | 'inquiry' | 'confirmation' | 'recalculation' | 'reperformance' | 'analytical';
  source: 'internal' | 'external';
  description: string;
  reliability: 'high' | 'moderate' | 'low';
  sufficiency: 'sufficient' | 'insufficient';
  documentReference: string;
}

// Group Audit Component
export interface GroupComponent {
  id: string;
  name: string;
  jurisdiction: string;
  classification: 'significant_size' | 'significant_risk' | 'non_significant';
  componentMateriality: number;
  workEffort: 'full_audit' | 'specified_accounts' | 'specified_procedures' | 'analytical_only';
  componentAuditor?: string;
  instructionsSent: boolean;
  reportingReceived: boolean;
  reviewCompleted: boolean;
}

// Key Audit Matter
export interface KeyAuditMatter {
  matter: string;
  whyKAM: string;
  howAddressed: string[];
  relatedDisclosures: string[];
}

// Going Concern Assessment
export interface GoingConcernAssessment {
  periodAssessed: string; // e.g., "12 months from 2024-12-31"
  eventsOrConditions: string[];
  managementPlans: string[];
  adequacyOfDisclosure: 'adequate' | 'inadequate';
  materialUncertainty: boolean;
  opinionImpact: 'none' | 'emphasis_of_matter' | 'adverse' | 'disclaimer';
  rationale: string;
}

// Subsequent Event
export interface SubsequentEvent {
  eventDate: string;
  description: string;
  type: 'adjusting' | 'non_adjusting';
  financialStatementImpact: string;
  disclosureRequired: boolean;
  disclosureProvided: boolean;
}

// Audit Opinion
export interface AuditOpinion {
  opinionType: 'unmodified' | 'qualified' | 'adverse' | 'disclaimer';
  basisForModification?: string;
  keyAuditMatters: KeyAuditMatter[];
  emphasisOfMatter?: string[];
  otherMatter?: string[];
  goingConcern?: GoingConcernAssessment;
}

// Agent Request/Response
export interface AgentRequest {
  context: AuditContext;
  task: string;
  parameters?: Record<string, unknown>;
}

export interface AgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  nextSteps?: string[];
  evidenceGenerated?: AuditEvidence[];
}

// Audit Context
export interface AuditContext {
  engagementId: string;
  clientName: string;
  periodEnd: string;
  industry: string;
  firstYearAudit: boolean;
  groupAudit: boolean;
  listedEntity: boolean;
  standards: AuditStandard[];
  materiality?: MaterialityCalculation;
  riskAssessment?: RiskAssessment[];
}

// Zod Schemas for Validation
export const MaterialitySchema = z.object({
  overallMateriality: z.number().positive(),
  performanceMateriality: z.number().positive(),
  specificMateriality: z.record(z.number().positive()).optional(),
  trivialThreshold: z.number().positive(),
  basis: z.string(),
  percentage: z.number().positive().max(10),
  rationale: z.string().min(10),
});

export const RiskAssessmentSchema = z.object({
  accountOrAssertion: z.string(),
  assertionLevel: z.array(z.string()).optional(),
  inherentRisk: z.enum(['low', 'moderate', 'significant', 'high']),
  controlRisk: z.enum(['low', 'moderate', 'significant', 'high']),
  combinedRisk: z.enum(['low', 'moderate', 'significant', 'high']),
  isSignificantRisk: z.boolean(),
  isFraudRisk: z.boolean(),
  rationale: z.string().min(20),
  responseRequired: z.array(z.string()),
});

export const AuditProcedureSchema = z.object({
  id: z.string(),
  type: z.enum(['risk_assessment', 'test_of_controls', 'substantive_analytical', 'test_of_details']),
  description: z.string().min(10),
  assertions: z.array(z.string()),
  riskAddressed: z.array(z.string()),
  sampleSize: z.number().optional(),
  samplingMethod: z.enum(['statistical', 'non_statistical', 'judgmental']).optional(),
  expectedEvidence: z.array(z.string()),
  status: z.enum(['planned', 'in_progress', 'completed', 'reviewed']),
});
