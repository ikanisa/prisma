export type AccountingModule =
  | 'consolidation'
  | 'revenue'
  | 'leases'
  | 'ecl'
  | 'impairment'
  | 'tax'
  | 'cashflow'
  | 'disclosures'
  | 'esef'
  | 'gapsme'
  | 'industry'
  | 'specialised'
  | 'telemetry';

export type ApprovalDecisionState = 'approved' | 'rejected' | 'pending';

export interface ApprovalDecision {
  approverId?: string;
  role?: string;
  decision: ApprovalDecisionState;
  notes?: string;
  decidedAt?: string;
}

export interface ApprovalSnapshot extends ApprovalDecision {
  role: string;
  required: boolean;
}

export interface ModuleInput {
  orgId: string;
  actorId: string;
  payload?: Record<string, unknown>;
  approvals?: ApprovalDecision[];
  metadata?: Record<string, unknown>;
}

export interface TraceEvent {
  id: string;
  module: AccountingModule;
  orgId: string;
  actorId: string;
  action: string;
  approvals: ApprovalDecision[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type ModuleStatus = 'draft' | 'pending_approval' | 'ready' | 'blocked';

export interface ModuleExecutionResult {
  module: AccountingModule;
  status: ModuleStatus;
  summary: string;
  approvals: ApprovalSnapshot[];
  trace: TraceEvent;
  metrics: Record<string, number>;
  nextSteps: string[];
  context: Record<string, unknown>;
}

export interface AccountingModuleDefinition {
  key: AccountingModule;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  defaultPayload: Record<string, unknown>;
}
