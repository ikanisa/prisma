/**
 * Workflow Engine
 * 
 * DAG-based workflow orchestration for multi-agent coordination.
 * Supports parallel execution, checkpointing, and resume from failure.
 * 
 * @example
 * ```typescript
 * const engine = new WorkflowEngine();
 * const instance = await engine.createInstance(auditWorkflow, context);
 * const result = await engine.run(instance.instanceId);
 * ```
 */

import type { AgentContext, AgentResponse, AgentRequest } from '../orchestrator.js';
import { orchestrator } from '../orchestrator.js';
import { agentMessageBus } from './agent-message-bus.js';
import type { AgentMessageBus } from './agent-message-bus.js';
import { createAgentMessage } from './agent-message-bus.js';
import { hitlManager } from './hitl-manager.js';
import type { HITLManager } from './hitl-manager.js';
import type {
    WorkflowDefinition,
    WorkflowInstance,
    WorkflowResult,
    WorkflowStatus,
    WorkflowEvent,
    WorkflowCheckpoint,
    TaskNode,
    TaskStatus,
    TaskError,
    ApprovalContext,
} from './types.js';

// ============================================================================
// WORKFLOW ENGINE
// ============================================================================

export class WorkflowEngine {
    private instances: Map<string, WorkflowInstance> = new Map();
    private definitions: Map<string, WorkflowDefinition> = new Map();
    private checkpointStore: Map<string, WorkflowCheckpoint[]> = new Map();
    private hitlManager: HITLManager;
    private messageBus: AgentMessageBus;
    private executor: (request: AgentRequest) => Promise<AgentResponse>;

    constructor(private options: WorkflowEngineOptions = {}) {
        this.options = {
            maxConcurrentWorkflows: options.maxConcurrentWorkflows ?? 10,
            defaultTimeout: options.defaultTimeout ?? 300000, // 5 minutes
            checkpointInterval: options.checkpointInterval ?? 30000, // 30 seconds
            persistCheckpoints: options.persistCheckpoints ?? true,
        };
        this.hitlManager = options.hitlManager ?? hitlManager;
        this.messageBus = options.messageBus ?? agentMessageBus;
        this.executor = options.executor ?? ((request) => orchestrator.run(request));
    }

    // ========================================================================
    // WORKFLOW REGISTRATION
    // ========================================================================

    /**
     * Register a workflow definition
     */
    registerWorkflow(definition: WorkflowDefinition): void {
        this.validateDefinition(definition);
        this.definitions.set(definition.id, definition);
    }

    /**
     * Get a registered workflow definition
     */
    getDefinition(definitionId: string): WorkflowDefinition | undefined {
        return this.definitions.get(definitionId);
    }

    // ========================================================================
    // WORKFLOW LIFECYCLE
    // ========================================================================

    /**
     * Create a new workflow instance
     */
    async createInstance(
        definitionId: string,
        context: AgentContext,
        variables: Record<string, unknown> = {}
    ): Promise<WorkflowInstance> {
        const definition = this.definitions.get(definitionId);
        if (!definition) {
            throw new Error(`Workflow definition not found: ${definitionId}`);
        }

        const instanceId = crypto.randomUUID();
        const now = new Date();

        // Clone tasks from definition
        const tasks = new Map<string, TaskNode>();
        for (const task of definition.tasks) {
            tasks.set(task.id, {
                ...task,
                status: 'pending',
                retryCount: 0,
                approvalRequestId: undefined,
            });
        }

        const instance: WorkflowInstance = {
            instanceId,
            definitionId,
            workflowName: definition.name,
            status: 'pending',
            context,
            tasks,
            checkpoints: [],
            variables,
            events: [],
            timing: {
                createdAt: now,
                pausedDurationMs: 0,
            },
            metadata: {
                createdBy: context.userId,
                firmId: context.firmId,
                engagementId: context.engagementId,
                tags: [],
                priority: 0,
            },
        };

        this.instances.set(instanceId, instance);
        this.emitEvent(instance, 'workflow_started', {});

        return instance;
    }

    /**
     * Run a workflow instance to completion
     */
    async run(instanceId: string): Promise<WorkflowResult> {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`Workflow instance not found: ${instanceId}`);
        }

        const definition = this.definitions.get(instance.definitionId);
        if (!definition) {
            throw new Error(`Workflow definition not found: ${instance.definitionId}`);
        }

        instance.status = 'running';
        instance.timing.startedAt = new Date();

        try {
            // Execute tasks in topological order
            while (this.hasPendingTasks(instance)) {
                // Handle paused state
                if (['paused', 'awaiting_approval', 'cancelled'].includes(instance.status)) {
                    break;
                }

                // Find ready tasks (all dependencies completed)
                const readyTasks = this.getReadyTasks(instance);

                if (readyTasks.length === 0) {
                    // Check for deadlock or waiting for approval
                    if (this.hasBlockedTasks(instance)) {
                        break;
                    }
                    throw new Error('Workflow deadlock detected: no tasks ready but pending tasks exist');
                }

                // Execute ready tasks in parallel (up to maxParallelTasks)
                const maxParallel = definition.defaultConfig.maxParallelTasks;
                const tasksToRun = readyTasks.slice(0, maxParallel);

                await Promise.all(
                    tasksToRun.map(task => this.executeTask(instance, task))
                );

                // Create checkpoint after each batch
                if (this.options.persistCheckpoints) {
                    await this.createCheckpoint(instance);
                }
            }

            // Check final status
            if (this.allTasksCompleted(instance)) {
                instance.status = 'completed';
                this.emitEvent(instance, 'workflow_completed', {});
            }

        } catch (error) {
            instance.status = 'failed';
            this.emitEvent(instance, 'workflow_failed', {
                error: error instanceof Error ? error.message : String(error)
            });

            if (definition.defaultConfig.onFailure === 'rollback') {
                await this.rollback(instance);
            }
        }

        instance.timing.completedAt = new Date();
        instance.timing.totalDurationMs =
            instance.timing.completedAt.getTime() -
            (instance.timing.startedAt?.getTime() ?? instance.timing.createdAt.getTime());

        return this.buildResult(instance);
    }

    /**
     * Resume a paused or failed workflow from last checkpoint
     */
    async resume(instanceId: string, fromCheckpoint?: string): Promise<WorkflowResult> {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`Workflow instance not found: ${instanceId}`);
        }

        // Restore from checkpoint if specified
        if (fromCheckpoint) {
            const checkpoint = instance.checkpoints.find(c => c.id === fromCheckpoint);
            if (!checkpoint) {
                throw new Error(`Checkpoint not found: ${fromCheckpoint}`);
            }
            await this.restoreFromCheckpoint(instance, checkpoint);
        }

        instance.status = 'running';
        this.emitEvent(instance, 'workflow_resumed', { checkpoint: fromCheckpoint });

        return this.run(instanceId);
    }

    /**
     * Approve a workflow task and resume execution if needed.
     */
    async approveTask(
        instanceId: string,
        approvalRequestId: string,
        userId: string,
        comment?: string,
        modifications?: Record<string, unknown>
    ): Promise<WorkflowResult> {
        const approval = await this.hitlManager.approve(approvalRequestId, userId, comment, modifications);
        const instance = this.requireInstance(instanceId);
        const task = this.findTaskByApproval(instance, approvalRequestId);

        task.status = 'pending';
        this.emitEvent(instance, 'approval_granted', {
            taskId: task.id,
            approvalRequestId,
            riskLevel: approval.riskLevel,
        });
        await this.publishApprovalMessage(instance, task, approvalRequestId, 'approved');

        if (instance.status === 'awaiting_approval') {
            instance.status = 'running';
            return this.run(instanceId);
        }

        return this.buildResult(instance);
    }

    /**
     * Deny a workflow task approval and mark the workflow as failed.
     */
    async denyTask(
        instanceId: string,
        approvalRequestId: string,
        userId: string,
        reason: string
    ): Promise<WorkflowResult> {
        const approval = await this.hitlManager.deny(approvalRequestId, userId, reason);
        const instance = this.requireInstance(instanceId);
        const task = this.findTaskByApproval(instance, approvalRequestId);

        task.status = 'failed';
        task.error = {
            code: 'APPROVAL_DENIED',
            message: reason,
            retryable: false,
            timestamp: new Date(),
        };

        instance.status = 'failed';
        this.emitEvent(instance, 'approval_denied', {
            taskId: task.id,
            approvalRequestId,
            riskLevel: approval.riskLevel,
        });
        await this.publishApprovalMessage(instance, task, approvalRequestId, 'denied');

        return this.buildResult(instance);
    }

    /**
     * Pause a running workflow
     */
    async pause(instanceId: string): Promise<void> {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`Workflow instance not found: ${instanceId}`);
        }

        instance.status = 'paused';
        this.emitEvent(instance, 'workflow_paused', {});
        await this.createCheckpoint(instance);
    }

    /**
     * Cancel a workflow
     */
    async cancel(instanceId: string): Promise<void> {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`Workflow instance not found: ${instanceId}`);
        }

        instance.status = 'cancelled';

        // Mark pending tasks as skipped
        for (const [, task] of instance.tasks) {
            if (task.status === 'pending' || task.status === 'ready') {
                task.status = 'skipped';
            }
        }
    }

    // ========================================================================
    // TASK EXECUTION
    // ========================================================================

    /**
     * Execute a single task
     */
    private async executeTask(instance: WorkflowInstance, task: TaskNode): Promise<void> {
        task.status = 'running';
        task.timing = {
            queuedAt: task.timing?.queuedAt,
            startedAt: new Date(),
        };
        this.emitEvent(instance, 'task_started', { taskId: task.id, taskName: task.name });

        // Check if approval is required
        if (task.config.requiresApproval) {
            const approval = await this.requestApproval(instance, task);
            if (approval.status !== 'approved') {
                return;
            }
        }

        try {
            // Build agent request
            const request: AgentRequest = {
                message: task.description,
                context: instance.context,
                tools: task.config.tools,
            };

            // Apply input mapping
            if (task.config.inputMapping) {
                for (const [varName, taskOutputRef] of Object.entries(task.config.inputMapping)) {
                    const value = this.resolveVariable(instance, taskOutputRef);
                    (request as any)[varName] = value;
                }
            }

            // Execute via orchestrator
            const response = await this.executeWithTimeout(
                () => this.executor(request),
                task.config.timeout ?? this.options.defaultTimeout!
            );

            task.result = response;
            task.status = response.status === 'completed' ? 'completed' : 'failed';
            task.timing!.completedAt = new Date();
            task.timing!.durationMs =
                task.timing!.completedAt.getTime() - task.timing!.startedAt!.getTime();

            // Apply output mapping
            if (task.config.outputMapping && response.status === 'completed') {
                for (const [varName, outputPath] of Object.entries(task.config.outputMapping)) {
                    instance.variables[varName] = this.extractOutput(response, outputPath);
                }
            }

            this.emitEvent(instance, 'task_completed', {
                taskId: task.id,
                status: task.status,
                durationMs: task.timing!.durationMs,
            });

        } catch (error) {
            task.error = {
                code: 'TASK_EXECUTION_ERROR',
                message: error instanceof Error ? error.message : String(error),
                retryable: true,
                timestamp: new Date(),
            };
            task.status = 'failed';
            task.timing!.completedAt = new Date();

            this.emitEvent(instance, 'task_failed', {
                taskId: task.id,
                error: task.error.message
            });

            // Retry if configured
            if (task.retryCount < task.maxRetries) {
                task.retryCount++;
                task.status = 'pending';
                this.emitEvent(instance, 'task_retried', {
                    taskId: task.id,
                    attempt: task.retryCount
                });
            }
        }
    }

    /**
     * Execute with timeout
     */
    private async executeWithTimeout<T>(
        fn: () => Promise<T>,
        timeoutMs: number
    ): Promise<T> {
        return Promise.race([
            fn(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Task execution timed out')), timeoutMs)
            ),
        ]);
    }

    // ========================================================================
    // CHECKPOINTING
    // ========================================================================

    /**
     * Create a checkpoint of current workflow state
     */
    async createCheckpoint(instance: WorkflowInstance): Promise<WorkflowCheckpoint> {
        const checkpoint: WorkflowCheckpoint = {
            id: crypto.randomUUID(),
            taskId: this.getCurrentTaskId(instance),
            timestamp: new Date(),
            state: this.serializeState(instance),
            resumable: true,
        };

        instance.checkpoints.push(checkpoint);
        instance.currentCheckpointId = checkpoint.id;
        this.emitEvent(instance, 'checkpoint_created', { checkpointId: checkpoint.id });

        // Persist to external store if configured
        if (this.options.persistCheckpoints) {
            const checkpoints = this.checkpointStore.get(instance.instanceId) ?? [];
            checkpoints.push(checkpoint);
            this.checkpointStore.set(instance.instanceId, checkpoints);
        }

        return checkpoint;
    }

    /**
     * Restore workflow state from checkpoint
     */
    private async restoreFromCheckpoint(
        instance: WorkflowInstance,
        checkpoint: WorkflowCheckpoint
    ): Promise<void> {
        const state = checkpoint.state as Record<string, unknown>;

        // Restore task states
        const taskStates = state.tasks as Record<string, TaskStatus>;
        for (const [taskId, status] of Object.entries(taskStates)) {
            const task = instance.tasks.get(taskId);
            if (task) {
                task.status = status;
            }
        }

        // Restore variables
        instance.variables = state.variables as Record<string, unknown>;
        instance.currentCheckpointId = checkpoint.id;

        this.emitEvent(instance, 'checkpoint_restored', { checkpointId: checkpoint.id });
    }

    /**
     * Serialize workflow state for checkpointing
     */
    private serializeState(instance: WorkflowInstance): Record<string, unknown> {
        const tasks: Record<string, TaskStatus> = {};
        for (const [taskId, task] of instance.tasks) {
            tasks[taskId] = task.status;
        }

        return {
            tasks,
            variables: { ...instance.variables },
            status: instance.status,
            timestamp: new Date().toISOString(),
        };
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    private validateDefinition(definition: WorkflowDefinition): void {
        // Check for cycles in task dependencies
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (taskId: string): boolean => {
            visited.add(taskId);
            recursionStack.add(taskId);

            const task = definition.tasks.find(t => t.id === taskId);
            if (task) {
                for (const depId of task.dependencies) {
                    if (!visited.has(depId) && hasCycle(depId)) {
                        return true;
                    }
                    if (recursionStack.has(depId)) {
                        return true;
                    }
                }
            }

            recursionStack.delete(taskId);
            return false;
        };

        for (const task of definition.tasks) {
            if (!visited.has(task.id) && hasCycle(task.id)) {
                throw new Error(`Workflow definition has cyclic dependencies: ${definition.id}`);
            }
        }
    }

    private getReadyTasks(instance: WorkflowInstance): TaskNode[] {
        const ready: TaskNode[] = [];

        for (const [, task] of instance.tasks) {
            if (task.status !== 'pending') continue;

            const allDepsCompleted = task.dependencies.every(depId => {
                const dep = instance.tasks.get(depId);
                return dep?.status === 'completed';
            });

            if (allDepsCompleted) {
                task.status = 'ready';
                task.timing = { queuedAt: new Date() };
                ready.push(task);
            }
        }

        // Sort by priority (higher priority first)
        return ready.sort((a, b) => b.priority - a.priority);
    }

    private hasPendingTasks(instance: WorkflowInstance): boolean {
        for (const [, task] of instance.tasks) {
            if (task.status === 'pending' || task.status === 'ready' || task.status === 'running') {
                return true;
            }
        }
        return false;
    }

    private hasBlockedTasks(instance: WorkflowInstance): boolean {
        for (const [, task] of instance.tasks) {
            if (task.status === 'awaiting_approval') {
                return true;
            }
        }
        return false;
    }

    private allTasksCompleted(instance: WorkflowInstance): boolean {
        for (const [, task] of instance.tasks) {
            if (task.status !== 'completed' && task.status !== 'skipped') {
                return false;
            }
        }
        return true;
    }

    private getCurrentTaskId(instance: WorkflowInstance): string {
        for (const [taskId, task] of instance.tasks) {
            if (task.status === 'running') {
                return taskId;
            }
        }
        return '';
    }

    private async requestApproval(
        instance: WorkflowInstance,
        task: TaskNode
    ) {
        const approvalContext = this.buildApprovalContext(instance, task);
        const approval = await this.hitlManager.requestApproval({
            workflowInstanceId: instance.instanceId,
            taskId: task.id,
            taskName: task.name,
            requestedBy: instance.metadata.createdBy,
            riskLevel: task.config.riskLevel,
            context: approvalContext,
        });

        task.approvalRequestId = approval.id;

        if (approval.status === 'approved') {
            this.emitEvent(instance, 'approval_granted', {
                taskId: task.id,
                approvalRequestId: approval.id,
                riskLevel: task.config.riskLevel,
            });
            await this.publishApprovalMessage(instance, task, approval.id, 'approved');
            return approval;
        }

        task.status = 'awaiting_approval';
        instance.status = 'awaiting_approval';
        this.emitEvent(instance, 'approval_requested', {
            taskId: task.id,
            approvalRequestId: approval.id,
            riskLevel: task.config.riskLevel,
        });
        await this.publishApprovalMessage(instance, task, approval.id, 'pending');
        return approval;
    }

    private buildApprovalContext(instance: WorkflowInstance, task: TaskNode): ApprovalContext {
        return {
            summary: `Approval required for ${task.name}`,
            reasoning: [
                `Risk level: ${task.config.riskLevel}`,
                `Agent type: ${task.agentType}`,
            ],
            data: {
                taskId: task.id,
                workflowInstanceId: instance.instanceId,
                engagementId: instance.context.engagementId,
                tools: task.config.tools ?? [],
                description: task.description,
            },
            recommendations: ['Review evidence and approve or deny this task.'],
            relatedDocuments: [],
        };
    }

    private async publishApprovalMessage(
        instance: WorkflowInstance,
        task: TaskNode,
        approvalRequestId: string,
        status: 'pending' | 'approved' | 'denied'
    ): Promise<void> {
        await this.messageBus.publish(
            createAgentMessage({
                agentId: task.agentType,
                taskType: 'AUTONOMY_ALERT',
                context: {
                    clientId: instance.context.clientId,
                    fiscalYear: String(new Date().getFullYear()),
                    engagementId: instance.context.engagementId,
                    jurisdiction: instance.context.jurisdiction,
                },
                data: {
                    workflowInstanceId: instance.instanceId,
                    taskId: task.id,
                    taskName: task.name,
                    approvalRequestId,
                    status,
                    riskLevel: task.config.riskLevel,
                },
                priority: status === 'denied' ? 'CRITICAL' : 'HIGH',
                autonomyLevel: 'HUMAN_REVIEW',
                traceId: instance.context.engagementId,
                correlationId: instance.instanceId,
            })
        );
    }

    private findTaskByApproval(instance: WorkflowInstance, approvalRequestId: string): TaskNode {
        for (const task of instance.tasks.values()) {
            if (task.approvalRequestId === approvalRequestId) {
                return task;
            }
        }
        throw new Error(`Task not found for approval request: ${approvalRequestId}`);
    }

    private requireInstance(instanceId: string): WorkflowInstance {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`Workflow instance not found: ${instanceId}`);
        }
        return instance;
    }

    private resolveVariable(instance: WorkflowInstance, ref: string): unknown {
        const parts = ref.split('.');
        let value: unknown = instance.variables;

        for (const part of parts) {
            if (value && typeof value === 'object') {
                value = (value as Record<string, unknown>)[part];
            } else {
                return undefined;
            }
        }

        return value;
    }

    private extractOutput(response: AgentResponse, path: string): unknown {
        const parts = path.split('.');
        let value: unknown = response;

        for (const part of parts) {
            if (value && typeof value === 'object') {
                value = (value as Record<string, unknown>)[part];
            } else {
                return undefined;
            }
        }

        return value;
    }

    private emitEvent(
        instance: WorkflowInstance,
        type: WorkflowEvent['type'],
        payload: Record<string, unknown>
    ): void {
        instance.events.push({
            id: crypto.randomUUID(),
            type,
            timestamp: new Date(),
            payload,
        });
    }

    private buildResult(instance: WorkflowInstance): WorkflowResult {
        let completed = 0;
        let failed = 0;
        let skipped = 0;
        const errors: TaskError[] = [];

        for (const [, task] of instance.tasks) {
            switch (task.status) {
                case 'completed':
                    completed++;
                    break;
                case 'failed':
                    failed++;
                    if (task.error) errors.push(task.error);
                    break;
                case 'skipped':
                    skipped++;
                    break;
            }
        }

        return {
            instanceId: instance.instanceId,
            status: instance.status,
            completedTasks: completed,
            failedTasks: failed,
            skippedTasks: skipped,
            outputs: instance.variables,
            timing: instance.timing,
            errors,
        };
    }

    private async rollback(instance: WorkflowInstance): Promise<void> {
        // In a full implementation, this would reverse completed tasks
        // For now, just mark all non-completed tasks as skipped
        for (const [, task] of instance.tasks) {
            if (task.status !== 'completed') {
                task.status = 'skipped';
            }
        }
    }

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    getWorkflowStatus(instanceId: string): WorkflowStatus | undefined {
        return this.instances.get(instanceId)?.status;
    }

    getWorkflowEvents(instanceId: string): WorkflowEvent[] {
        return this.instances.get(instanceId)?.events ?? [];
    }

    listActiveWorkflows(): WorkflowInstance[] {
        return Array.from(this.instances.values()).filter(
            i => i.status === 'running' || i.status === 'paused' || i.status === 'awaiting_approval'
        );
    }
}

// ============================================================================
// ENGINE OPTIONS
// ============================================================================

export interface WorkflowEngineOptions {
    maxConcurrentWorkflows?: number;
    defaultTimeout?: number;
    checkpointInterval?: number;
    persistCheckpoints?: boolean;
    hitlManager?: HITLManager;
    messageBus?: AgentMessageBus;
    executor?: (request: AgentRequest) => Promise<AgentResponse>;
}

// Export singleton
export const workflowEngine = new WorkflowEngine();
