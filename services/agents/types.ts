export type DomainAgentKey =
  | 'auditExecution'
  | 'accountingClose'
  | 'financialReporting'
  | 'taxCompliance'
  | 'accountsPayable'
  | 'corporateFinance'
  | 'advisory'
  | 'governance'
  | 'clientCollaboration'
  | 'dataPreparation'
  | 'knowledgeCurator'
  | 'riskAndCompliance'
  | 'opsMonitoring';

export interface DomainAgentMetadata {
  key: DomainAgentKey;
  title: string;
  description: string;
  status: 'implemented' | 'in_progress' | 'planned';
  owner: string;
  capabilities: string[];
  dependencies?: DomainAgentKey[];
  toolCatalog?: string[];
  datasetKeys?: string[];
  knowledgeBases?: string[];
  notes?: string;
}

export interface OrchestrationTask {
  id: string;
  agentKey: DomainAgentKey;
  title: string;
  description: string;
  inputs?: Record<string, unknown>;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  requiresHumanReview: boolean;
  metadata?: Record<string, unknown>;
  datasets?: string[];
  knowledgeBases?: string[];
  toolReferences?: string[];
}

export interface OrchestrationPlan {
  objective: string;
  tasks: OrchestrationTask[];
  createdAt: string;
  createdBy: string;
}

export interface OrchestratorContext {
  orgId: string;
  orgSlug: string;
  userId: string;
  objective: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  constraints?: string[];
}
