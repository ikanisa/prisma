/**
 * Workflow Types
 * 
 * Core types for multi-agent workflow orchestration.
 * Supports DAG-based task scheduling, checkpointing, and HITL integration.
 */

import type { EngagementType } from '@prisma/db';
import type { AgentResponse, AgentContext } from '../orchestrator.js';

// ============================================================================
// TASK & WORKFLOW TYPES
// ============================================================================

export type TaskStatus =
    | 'pending'
    | 'ready'
    | 'running'
    | 'awaiting_approval'
    | 'completed'
    | 'failed'
    | 'skipped';

export type WorkflowStatus =
    | 'pending'
    | 'running'
    | 'paused'
    | 'awaiting_approval'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface TaskNode {
    id: string;
    name: string;
    agentType: EngagementType;
    description: string;
    dependencies: string[];
    status: TaskStatus;
    priority: number;
    config: TaskConfig;
    result?: AgentResponse;
    error?: TaskError;
    timing?: TaskTiming;
    approvalRequestId?: string;
    retryCount: number;
    maxRetries: number;
}

export interface TaskConfig {
    timeout?: number;
    requiresApproval: boolean;
    approvalRoles?: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    autoApproveThreshold?: number;
    tools?: string[];
    inputMapping?: Record<string, string>;
    outputMapping?: Record<string, string>;
}

export interface TaskError {
    code: string;
    message: string;
    stack?: string;
    retryable: boolean;
    timestamp: Date;
}

export interface TaskTiming {
    queuedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
}

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export interface WorkflowDefinition {
    id: string;
    name: string;
    version: string;
    description: string;
    tasks: TaskNode[];
    triggers?: WorkflowTrigger[];
    defaultConfig: WorkflowConfig;
}

export interface WorkflowTrigger {
    type: 'manual' | 'scheduled' | 'event' | 'api';
    config: Record<string, unknown>;
}

export interface WorkflowConfig {
    maxParallelTasks: number;
    globalTimeout: number;
    onFailure: 'stop' | 'continue' | 'rollback';
    checkpointOnComplete: boolean;
    notifyOnComplete: boolean;
}

// ============================================================================
// WORKFLOW INSTANCE (RUNTIME STATE)
// ============================================================================

export interface WorkflowInstance {
    instanceId: string;
    definitionId: string;
    workflowName: string;
    status: WorkflowStatus;
    context: AgentContext;
    tasks: Map<string, TaskNode>;
    checkpoints: WorkflowCheckpoint[];
    currentCheckpointId?: string;
    variables: Record<string, unknown>;
    events: WorkflowEvent[];
    timing: WorkflowTiming;
    metadata: WorkflowMetadata;
}

export interface WorkflowCheckpoint {
    id: string;
    taskId: string;
    timestamp: Date;
    state: Record<string, unknown>;
    resumable: boolean;
}

export interface WorkflowEvent {
    id: string;
    type: WorkflowEventType;
    taskId?: string;
    timestamp: Date;
    payload: Record<string, unknown>;
    userId?: string;
}

export type WorkflowEventType =
    | 'workflow_started'
    | 'workflow_completed'
    | 'workflow_failed'
    | 'workflow_paused'
    | 'workflow_resumed'
    | 'task_started'
    | 'task_completed'
    | 'task_failed'
    | 'task_retried'
    | 'approval_requested'
    | 'approval_granted'
    | 'approval_denied'
    | 'checkpoint_created'
    | 'checkpoint_restored';

export interface WorkflowTiming {
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    totalDurationMs?: number;
    pausedDurationMs: number;
}

export interface WorkflowMetadata {
    createdBy: string;
    firmId: string;
    engagementId: string;
    tags: string[];
    priority: number;
}

// ============================================================================
// HITL (HUMAN-IN-THE-LOOP) TYPES
// ============================================================================

export interface ApprovalRequest {
    id: string;
    workflowInstanceId: string;
    taskId: string;
    taskName: string;
    requestedAt: Date;
    requestedBy: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    status: ApprovalStatus;
    context: ApprovalContext;
    decision?: ApprovalDecision;
    slaDeadline?: Date;
}

export type ApprovalStatus =
    | 'pending'
    | 'approved'
    | 'denied'
    | 'escalated'
    | 'expired';

export interface ApprovalContext {
    summary: string;
    reasoning: string[];
    data: Record<string, unknown>;
    recommendations: string[];
    relatedDocuments?: string[];
}

export interface ApprovalDecision {
    approved: boolean;
    decidedBy: string;
    decidedAt: Date;
    comment?: string;
    modifications?: Record<string, unknown>;
}

// ============================================================================
// REASONING & CHAIN-OF-THOUGHT
// ============================================================================

export interface ReasoningStep {
    stepNumber: number;
    thought: string;
    action: string;
    observation: string;
    confidence: number;
    sources?: ReasoningSource[];
}

export interface ReasoningSource {
    type: 'document' | 'standard' | 'calculation' | 'prior_knowledge';
    reference: string;
    relevance: number;
}

export interface ChainOfThought {
    taskId: string;
    steps: ReasoningStep[];
    conclusion: string;
    overallConfidence: number;
    citations: string[];
}

// ============================================================================
// WORKFLOW RESULTS
// ============================================================================

export interface WorkflowResult {
    instanceId: string;
    status: WorkflowStatus;
    completedTasks: number;
    failedTasks: number;
    skippedTasks: number;
    outputs: Record<string, unknown>;
    timing: WorkflowTiming;
    errors: TaskError[];
}
