import type OpenAI from 'openai';

export type AgentRole = 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN';

export const ROLE_PRIORITY: Record<AgentRole, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  SYSTEM_ADMIN: 3,
};

export function roleFromString(value: unknown): AgentRole | undefined {
  if (typeof value !== 'string') return undefined;
  const upper = value.trim().toUpperCase();
  if (upper === 'EMPLOYEE' || upper === 'STAFF') return 'EMPLOYEE';
  if (upper === 'MANAGER') return 'MANAGER';
  if (upper === 'SYSTEM_ADMIN' || upper === 'ADMIN' || upper === 'OWNER') {
    return 'SYSTEM_ADMIN';
  }
  return undefined;
}

export function hasSufficientRole(userRole: AgentRole, requiredRole: AgentRole): boolean {
  return ROLE_PRIORITY[userRole] >= ROLE_PRIORITY[requiredRole];
}

export function highestRole(roles: AgentRole[]): AgentRole {
  return roles.reduce<AgentRole>((acc, role) => {
    return ROLE_PRIORITY[role] > ROLE_PRIORITY[acc] ? role : acc;
  }, 'EMPLOYEE');
}

export interface AgentRequestFlags {
  externalFiling?: boolean;
  calculatorOverride?: boolean;
  [key: string]: boolean | undefined;
}

export interface AgentRequestTool {
  toolKey: string;
  minRole?: AgentRole;
}

export interface AgentRequestContext {
  description?: string;
  flags?: AgentRequestFlags;
  minRoleRequired?: AgentRole;
  requestedTools?: AgentRequestTool[];
}

export interface AgentPlanToolIntent {
  toolKey: string;
  purpose: string;
  inputs?: Record<string, unknown>;
  notes?: string;
  minRole?: AgentRole;
}

export interface AgentPlanStep {
  stepIndex: number;
  title: string;
  summary: string;
  exitCriteria?: string;
  toolIntents?: AgentPlanToolIntent[];
  dependsOn?: number[];
}

export interface AgentPlanDocument {
  planVersion: string;
  agentType: string;
  createdAt: string;
  createdByRole: AgentRole;
  requiresCitations: boolean;
  steps: AgentPlanStep[];
  notes?: string;
  requestContext?: AgentRequestContext;
}

export interface AgentPlanRefusal {
  reason: string;
  message: string;
  code?: string;
  requiredRole?: AgentRole;
}

export interface SupabaseClientLike {
  from(table: string): any;
}

export interface OpenAiDebugLoggerEvent {
  endpoint: string;
  response: any;
  requestPayload?: unknown;
  metadata?: Record<string, unknown>;
}

export type OpenAiDebugLogger = (event: OpenAiDebugLoggerEvent) => Promise<void> | void;

export interface GenerateAgentPlanInput {
  agentType: 'CLOSE' | 'TAX' | 'AUDIT' | 'ADVISORY' | 'CLIENT';
  supabase: SupabaseClientLike;
  openai: OpenAI;
  userRole: AgentRole;
  requestContext?: AgentRequestContext;
  enforceCitations: boolean;
  abortSignal?: AbortSignal;
  debugLogger?: OpenAiDebugLogger;
}

export type AgentPlanGenerationResult =
  | ({ status: 'success'; plan: AgentPlanDocument } & AgentPlanGenerationMetadata)
  | ({ status: 'refused'; refusal: AgentPlanRefusal } & AgentPlanGenerationMetadata);

export interface AgentPlanGenerationMetadata {
  personaVersion: string;
  policyPackVersion: string;
  model: string;
  attempts: number;
  isFallback: boolean;
  usage?: Record<string, unknown>;
  costUsd?: number;
  lastError?: string;
}
