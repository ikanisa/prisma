/**
 * OpenAI Agent Builder Types
 * 
 * Types for Agent Builder workflow creation, export, and management
 */

export interface AgentBuilderNode {
  id: string;
  type: 'agent' | 'tool' | 'condition' | 'merge' | 'input' | 'output' | 'delay' | 'webhook';
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  connections?: AgentBuilderConnection[];
}

export interface AgentBuilderConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: string;
}

export interface AgentBuilderWorkflow {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: AgentBuilderNode[];
  connections: AgentBuilderConnection[];
  metadata?: {
    author?: string;
    tags?: string[];
    category?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface AgentBuilderTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  workflow: Omit<AgentBuilderWorkflow, 'id' | 'name' | 'description'>;
  preview?: string;
}

export interface AgentBuilderExport {
  format: 'json' | 'yaml' | 'python' | 'typescript';
  workflow: AgentBuilderWorkflow;
  includeMetadata?: boolean;
}

export interface AgentBuilderPreview {
  workflowId: string;
  input: Record<string, unknown>;
  executionId?: string;
}

export interface AgentBuilderExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  steps: AgentBuilderExecutionStep[];
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface AgentBuilderExecutionStep {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface AgentBuilderValidationResult {
  valid: boolean;
  errors: Array<{
    nodeId?: string;
    connectionId?: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    nodeId?: string;
    connectionId?: string;
    message: string;
  }>;
}

