import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.js';

type SupabaseDb = SupabaseClient<Database>;

type OrchestrationStatus = Database['public']['Enums']['agent_orchestration_status'];
type TaskStatus = Database['public']['Enums']['agent_task_status'];

export interface McpToolDefinition {
  toolKey: string | null;
  name: string;
  description?: string | null;
  provider: string;
  schema: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AgentManifestDefinition {
  agentKey: string;
  version: string;
  persona: string;
  promptTemplate: string;
  toolKeys: string[];
  defaultRole?: string;
  safetyLevel?: string;
  metadata?: Record<string, unknown>;
}

export interface DirectorAgentOptions {
  supabase: SupabaseDb;
  logInfo?: (message: string, meta?: Record<string, unknown>) => void;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
}

export interface SafetyAgentOptions {
  supabase: SupabaseDb;
  logInfo?: (message: string, meta?: Record<string, unknown>) => void;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
}

export interface OrchestrationSessionInput {
  orgId: string;
  createdByUserId: string | null;
  objective: string;
  metadata?: Record<string, unknown>;
  directorAgentKey?: string;
  safetyAgentKey?: string;
}

export interface OrchestrationTaskInput {
  agentKey?: string;
  title: string;
  input?: Record<string, unknown>;
  dependsOn?: string[];
  metadata?: Record<string, unknown>;
}

export interface OrchestrationSessionRecord {
  id: string;
  orgId: string;
  objective: string;
  status: OrchestrationStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrchestrationTaskRecord {
  id: string;
  sessionId: string;
  agentManifestId: string | null;
  title: string;
  status: TaskStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  dependsOn: string[];
  startedAt: string | null;
  completedAt: string | null;
}

export interface DirectorAgent {
  initialiseManifests(): Promise<void>;
  createSession(input: OrchestrationSessionInput): Promise<OrchestrationSessionRecord>;
  createTasks(sessionId: string, tasks: OrchestrationTaskInput[]): Promise<OrchestrationTaskRecord[]>;
  updateTaskStatus(params: {
    taskId: string;
    status: TaskStatus;
    output?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  }): Promise<OrchestrationTaskRecord | null>;
  getSessionBoard(sessionId: string): Promise<{
    session: OrchestrationSessionRecord | null;
    tasks: OrchestrationTaskRecord[];
  }>;
}

export interface SafetyAgent {
  recordEvent(params: {
    sessionId: string;
    taskId?: string | null;
    severity: 'INFO' | 'WARN' | 'BLOCKED';
    ruleCode: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}
