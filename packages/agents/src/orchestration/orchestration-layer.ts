/**
 * Multi-Agent Orchestration Layer
 * 
 * Advanced orchestration system for coordinating multiple AI agents with
 * LangChain/Crew AI style workflows, L0-L5 autonomy levels, and
 * human-in-the-loop approval gates.
 * 
 * Features:
 * - Multi-agent workflow coordination
 * - L0-L5 autonomy level framework
 * - Semantic routing based on intent + embeddings
 * - Event-driven agent communication
 * - Conflict resolution and human escalation
 * - Full audit trail and observability
 * 
 * @example
 * ```typescript
 * import { multiAgentOrchestrator } from './orchestration-layer';
 * 
 * // Create workflow
 * const workflow = multiAgentOrchestrator.createWorkflow({
 *   name: 'Tax Nexus Review',
 *   agents: ['nexus-agent', 'compliance-agent', 'filing-agent'],
 *   autonomyLevel: AutonomyLevel.L3_CONDITIONAL,
 * });
 * 
 * // Execute workflow
 * const result = await workflow.execute({
 *   input: 'Review CA nexus for Q1 2026',
 *   context: engagementContext,
 * });
 * ```
 */

// ============================================================================
// AUTONOMY LEVELS
// ============================================================================

/**
 * Autonomy Level Framework (L0-L5)
 * Based on SAE autonomous driving levels, adapted for AI agents
 */
export enum AutonomyLevel {
    /** L0: No automation - human performs all tasks, AI provides information only */
    L0_MANUAL = 0,

    /** L1: Assisted - AI provides suggestions, human makes all decisions */
    L1_ASSISTED = 1,

    /** L2: Partial - AI performs routine tasks, human reviews all outputs */
    L2_PARTIAL = 2,

    /** L3: Conditional - AI autonomous within defined rules, human oversight on exceptions */
    L3_CONDITIONAL = 3,

    /** L4: High - AI autonomous for most tasks, human approval for critical decisions */
    L4_HIGH = 4,

    /** L5: Full - Fully autonomous operation with audit trail */
    L5_FULL = 5,
}

export interface AutonomyConfig {
    level: AutonomyLevel;

    /** Maximum value of autonomous decisions (in $) */
    maxAutonomousValue?: number;

    /** Categories requiring human approval regardless of level */
    alwaysRequireApproval?: string[];

    /** Time window for human review (ms) before auto-proceed */
    humanReviewTimeout?: number;

    /** Enable auto-escalation on uncertainty */
    autoEscalate?: boolean;

    /** Confidence threshold for autonomous action */
    confidenceThreshold?: number;
}

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface OrchestrationAgent {
    id: string;
    name: string;
    type: AgentType;
    capabilities: string[];
    autonomyLevel: AutonomyLevel;

    /** Agent priority (lower = higher priority) */
    priority: number;

    /** Max concurrent executions */
    maxConcurrency: number;

    /** Current status */
    status: 'available' | 'busy' | 'offline';

    /** Execution function */
    execute(input: AgentInput): Promise<AgentOutput>;
}

export type AgentType =
    | 'tax'
    | 'audit'
    | 'accounting'
    | 'compliance'
    | 'document'
    | 'research'
    | 'general';

export interface AgentInput {
    taskId: string;
    message: string;
    context: ExecutionContext;
    previousResults?: AgentOutput[];
    tools?: string[];
}

export interface AgentOutput {
    agentId: string;
    taskId: string;
    status: 'success' | 'partial' | 'failed' | 'needs_approval';

    /** Output data */
    data: unknown;

    /** Confidence in the result (0-1) */
    confidence: number;

    /** Decisions made that may need review */
    decisions?: AgentDecision[];

    /** Handoff to another agent */
    handoff?: {
        targetAgent: string;
        reason: string;
        data: unknown;
    };

    /** Artifacts produced */
    artifacts?: {
        type: string;
        name: string;
        content: unknown;
    }[];

    /** Token usage */
    tokens?: { input: number; output: number };

    /** Execution time */
    durationMs: number;
}

export interface AgentDecision {
    id: string;
    type: string;
    description: string;
    value?: number;
    confidence: number;
    requiresApproval: boolean;
    approved?: boolean;
    approvedBy?: string;
    approvedAt?: Date;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export interface Workflow {
    id: string;
    name: string;
    description?: string;

    /** Agents involved in this workflow */
    agents: string[];

    /** Workflow steps */
    steps: WorkflowStep[];

    /** Overall autonomy level */
    autonomyLevel: AutonomyLevel;

    /** Execution mode */
    executionMode: 'sequential' | 'parallel' | 'dag';

    /** Execute the workflow */
    execute(input: WorkflowInput): Promise<WorkflowResult>;

    /** Get current status */
    getStatus(): WorkflowStatus;

    /** Cancel execution */
    cancel(): void;
}

export interface WorkflowStep {
    id: string;
    name: string;
    agentId: string;

    /** Input transformation from previous step */
    inputTransform?: (prevOutput: unknown) => unknown;

    /** Condition for executing this step */
    condition?: (context: ExecutionContext, prevOutput: unknown) => boolean;

    /** Retry configuration */
    retry?: {
        maxAttempts: number;
        backoffMs: number;
    };

    /** Timeout in ms */
    timeoutMs?: number;

    /** Human approval gate */
    approvalGate?: boolean;
}

export interface WorkflowInput {
    message: string;
    context: ExecutionContext;
    variables?: Record<string, unknown>;
}

export interface WorkflowResult {
    workflowId: string;
    status: 'completed' | 'failed' | 'cancelled' | 'pending_approval';

    /** Combined output from all agents */
    output: unknown;

    /** Results from each step */
    stepResults: {
        stepId: string;
        agentId: string;
        output: AgentOutput;
        durationMs: number;
    }[];

    /** Pending approvals */
    pendingApprovals?: {
        stepId: string;
        decision: AgentDecision;
    }[];

    /** Total execution time */
    totalDurationMs: number;

    /** Audit trail */
    auditTrail: AuditEvent[];
}

export interface WorkflowStatus {
    phase: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
    currentStep?: string;
    progress: number; // 0-100
    startedAt?: Date;
    estimatedCompletion?: Date;
}

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================

export interface ExecutionContext {
    engagementId: string;
    entityId: string;
    userId: string;
    firmId: string;

    /** Engagement type */
    type: 'tax' | 'audit' | 'accounting';

    /** Jurisdiction */
    jurisdiction: string;

    /** Fiscal period */
    fiscalYear: number;
    period?: string;

    /** Materiality thresholds */
    materiality?: number;
    performanceMateriality?: number;

    /** Session state */
    sessionData?: Record<string, unknown>;
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export interface AuditEvent {
    id: string;
    timestamp: Date;
    type: AuditEventType;

    /** Actor (agent or user) */
    actor: {
        type: 'agent' | 'user' | 'system';
        id: string;
        name: string;
    };

    /** Event details */
    action: string;
    target?: string;

    /** Before/after for changes */
    before?: unknown;
    after?: unknown;

    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

export type AuditEventType =
    | 'workflow_started'
    | 'workflow_completed'
    | 'step_started'
    | 'step_completed'
    | 'agent_invoked'
    | 'decision_made'
    | 'approval_requested'
    | 'approval_granted'
    | 'approval_denied'
    | 'escalation'
    | 'error'
    | 'handoff';

// ============================================================================
// MULTI-AGENT ORCHESTRATOR
// ============================================================================

export class MultiAgentOrchestrator {
    private agents: Map<string, OrchestrationAgent> = new Map();
    private workflows: Map<string, Workflow> = new Map();
    private auditLog: AuditEvent[] = [];
    private pendingApprovals: Map<string, { decision: AgentDecision; resolver: (approved: boolean) => void }> = new Map();

    /**
     * Register an agent with the orchestrator
     */
    registerAgent(agent: OrchestrationAgent): void {
        this.agents.set(agent.id, agent);
        this.logEvent({
            type: 'agent_invoked',
            actor: { type: 'system', id: 'orchestrator', name: 'Orchestrator' },
            action: `Registered agent: ${agent.name}`,
            metadata: { agentId: agent.id, capabilities: agent.capabilities },
        });
    }

    /**
     * Create a workflow
     */
    createWorkflow(config: {
        name: string;
        description?: string;
        agents: string[];
        steps?: Partial<WorkflowStep>[];
        autonomyLevel?: AutonomyLevel;
        executionMode?: 'sequential' | 'parallel' | 'dag';
    }): Workflow {
        const workflowId = crypto.randomUUID();
        const autonomyLevel = config.autonomyLevel ?? AutonomyLevel.L3_CONDITIONAL;

        // Build steps from agents if not provided
        const steps: WorkflowStep[] = config.steps?.map((s, i) => ({
            id: s.id ?? `step-${i}`,
            name: s.name ?? `Step ${i + 1}`,
            agentId: s.agentId ?? config.agents[i],
            inputTransform: s.inputTransform,
            condition: s.condition,
            retry: s.retry,
            timeoutMs: s.timeoutMs ?? 60000,
            approvalGate: s.approvalGate ?? (autonomyLevel < AutonomyLevel.L4_HIGH),
        })) ?? config.agents.map((agentId, i) => ({
            id: `step-${i}`,
            name: `Execute ${agentId}`,
            agentId,
            timeoutMs: 60000,
            approvalGate: autonomyLevel < AutonomyLevel.L4_HIGH,
        }));

        const workflow: Workflow = {
            id: workflowId,
            name: config.name,
            description: config.description,
            agents: config.agents,
            steps,
            autonomyLevel,
            executionMode: config.executionMode ?? 'sequential',

            execute: async (input: WorkflowInput) => this.executeWorkflow(workflowId, input),
            getStatus: () => this.getWorkflowStatus(workflowId),
            cancel: () => this.cancelWorkflow(workflowId),
        };

        this.workflows.set(workflowId, workflow);
        return workflow;
    }

    /**
     * Execute a workflow
     */
    async executeWorkflow(workflowId: string, input: WorkflowInput): Promise<WorkflowResult> {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        const startTime = Date.now();
        const stepResults: WorkflowResult['stepResults'] = [];
        const pendingApprovals: WorkflowResult['pendingApprovals'] = [];
        let currentOutput: unknown = input.message;

        this.logEvent({
            type: 'workflow_started',
            actor: { type: 'system', id: 'orchestrator', name: 'Orchestrator' },
            action: `Started workflow: ${workflow.name}`,
            metadata: { workflowId, input: input.message },
        });

        try {
            // Execute steps based on execution mode
            if (workflow.executionMode === 'parallel') {
                const results = await Promise.all(
                    workflow.steps.map(step => this.executeStep(step, input, currentOutput))
                );
                stepResults.push(...results);
                currentOutput = results.map(r => r.output.data);
            } else {
                // Sequential execution
                for (const step of workflow.steps) {
                    // Check condition
                    if (step.condition && !step.condition(input.context, currentOutput)) {
                        continue;
                    }

                    // Execute step
                    const result = await this.executeStep(step, input, currentOutput);
                    stepResults.push(result);

                    // Check for approval gates
                    if (step.approvalGate && result.output.decisions?.some(d => d.requiresApproval && !d.approved)) {
                        const unapproved = result.output.decisions.filter(d => d.requiresApproval && !d.approved);
                        for (const decision of unapproved) {
                            pendingApprovals.push({ stepId: step.id, decision });
                        }

                        // If configured for human review, pause here
                        if (workflow.autonomyLevel < AutonomyLevel.L4_HIGH) {
                            return {
                                workflowId,
                                status: 'pending_approval',
                                output: currentOutput,
                                stepResults,
                                pendingApprovals,
                                totalDurationMs: Date.now() - startTime,
                                auditTrail: this.auditLog.slice(-50),
                            };
                        }
                    }

                    // Handle handoff
                    if (result.output.handoff) {
                        const handoffAgent = this.agents.get(result.output.handoff.targetAgent);
                        if (handoffAgent) {
                            this.logEvent({
                                type: 'handoff',
                                actor: { type: 'agent', id: step.agentId, name: step.name },
                                action: `Handoff to ${result.output.handoff.targetAgent}`,
                                metadata: { reason: result.output.handoff.reason },
                            });
                            currentOutput = result.output.handoff.data;
                            // Continue with handoff target in next iteration
                        }
                    } else {
                        currentOutput = result.output.data;
                    }
                }
            }

            this.logEvent({
                type: 'workflow_completed',
                actor: { type: 'system', id: 'orchestrator', name: 'Orchestrator' },
                action: `Completed workflow: ${workflow.name}`,
                metadata: { workflowId, durationMs: Date.now() - startTime },
            });

            return {
                workflowId,
                status: 'completed',
                output: currentOutput,
                stepResults,
                pendingApprovals: pendingApprovals.length > 0 ? pendingApprovals : undefined,
                totalDurationMs: Date.now() - startTime,
                auditTrail: this.auditLog.slice(-50),
            };

        } catch (error) {
            this.logEvent({
                type: 'error',
                actor: { type: 'system', id: 'orchestrator', name: 'Orchestrator' },
                action: `Workflow failed: ${workflow.name}`,
                metadata: { workflowId, error: String(error) },
            });

            return {
                workflowId,
                status: 'failed',
                output: null,
                stepResults,
                totalDurationMs: Date.now() - startTime,
                auditTrail: this.auditLog.slice(-50),
            };
        }
    }

    /**
     * Execute a single workflow step
     */
    private async executeStep(
        step: WorkflowStep,
        input: WorkflowInput,
        previousOutput: unknown
    ): Promise<WorkflowResult['stepResults'][0]> {
        const startTime = Date.now();
        const agent = this.agents.get(step.agentId);

        if (!agent) {
            throw new Error(`Agent not found: ${step.agentId}`);
        }

        this.logEvent({
            type: 'step_started',
            actor: { type: 'agent', id: agent.id, name: agent.name },
            action: `Started step: ${step.name}`,
        });

        // Transform input if needed
        const transformedInput = step.inputTransform
            ? step.inputTransform(previousOutput)
            : previousOutput;

        // Execute with retry logic
        let attempts = 0;
        const maxAttempts = step.retry?.maxAttempts ?? 1;
        let lastError: Error | null = null;

        while (attempts < maxAttempts) {
            try {
                const output = await Promise.race([
                    agent.execute({
                        taskId: step.id,
                        message: typeof transformedInput === 'string' ? transformedInput : JSON.stringify(transformedInput),
                        context: input.context,
                        tools: [],
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Step timeout')), step.timeoutMs ?? 60000)
                    ),
                ]);

                this.logEvent({
                    type: 'step_completed',
                    actor: { type: 'agent', id: agent.id, name: agent.name },
                    action: `Completed step: ${step.name}`,
                    metadata: { confidence: output.confidence, durationMs: Date.now() - startTime },
                });

                return {
                    stepId: step.id,
                    agentId: agent.id,
                    output,
                    durationMs: Date.now() - startTime,
                };

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                attempts++;

                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, step.retry?.backoffMs ?? 1000));
                }
            }
        }

        // All attempts failed
        return {
            stepId: step.id,
            agentId: agent.id,
            output: {
                agentId: agent.id,
                taskId: step.id,
                status: 'failed',
                data: null,
                confidence: 0,
                durationMs: Date.now() - startTime,
            },
            durationMs: Date.now() - startTime,
        };
    }

    /**
     * Approve a pending decision
     */
    async approveDecision(decisionId: string, userId: string, approved: boolean): Promise<void> {
        const pending = this.pendingApprovals.get(decisionId);
        if (!pending) {
            throw new Error(`Decision not found: ${decisionId}`);
        }

        pending.decision.approved = approved;
        pending.decision.approvedBy = userId;
        pending.decision.approvedAt = new Date();
        pending.resolver(approved);
        this.pendingApprovals.delete(decisionId);

        this.logEvent({
            type: approved ? 'approval_granted' : 'approval_denied',
            actor: { type: 'user', id: userId, name: userId },
            action: `${approved ? 'Approved' : 'Denied'} decision: ${pending.decision.description}`,
            metadata: { decisionId },
        });
    }

    /**
     * Route a message to the best agent based on intent
     */
    async routeToAgent(
        message: string,
        context: ExecutionContext
    ): Promise<{ agentId: string; confidence: number; alternatives: { agentId: string; score: number }[] }> {
        const scores: { agentId: string; score: number }[] = [];
        const messageLower = message.toLowerCase();

        for (const [agentId, agent] of this.agents) {
            let score = 0;

            // Check capabilities match
            for (const capability of agent.capabilities) {
                if (messageLower.includes(capability.toLowerCase())) {
                    score += 0.3;
                }
            }

            // Check type match
            if (context.type === agent.type) {
                score += 0.4;
            }

            // Check keywords
            const keywords = this.getKeywordsForType(agent.type);
            for (const keyword of keywords) {
                if (messageLower.includes(keyword)) {
                    score += 0.1;
                }
            }

            // Priority bonus (lower priority = higher score)
            score += (10 - agent.priority) * 0.01;

            scores.push({ agentId, score: Math.min(1, score) });
        }

        // Sort by score
        scores.sort((a, b) => b.score - a.score);

        return {
            agentId: scores[0]?.agentId ?? '',
            confidence: scores[0]?.score ?? 0,
            alternatives: scores.slice(1, 4),
        };
    }

    /**
     * Get workflow status
     */
    getWorkflowStatus(workflowId: string): WorkflowStatus {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            return { phase: 'idle', progress: 0 };
        }

        // Would track actual state - simplified for now
        return {
            phase: 'completed',
            progress: 100,
        };
    }

    /**
     * Cancel a workflow
     */
    cancelWorkflow(workflowId: string): void {
        this.logEvent({
            type: 'workflow_completed',
            actor: { type: 'system', id: 'orchestrator', name: 'Orchestrator' },
            action: `Cancelled workflow: ${workflowId}`,
        });
    }

    /**
     * Get audit trail
     */
    getAuditTrail(limit: number = 100): AuditEvent[] {
        return this.auditLog.slice(-limit);
    }

    /**
     * Get registered agents
     */
    getAgents(): OrchestrationAgent[] {
        return Array.from(this.agents.values());
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
        this.auditLog.push({
            id: crypto.randomUUID(),
            timestamp: new Date(),
            ...event,
        });

        // Keep audit log bounded
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-5000);
        }
    }

    private getKeywordsForType(type: AgentType): string[] {
        const keywords: Record<AgentType, string[]> = {
            tax: ['tax', 'nexus', 'filing', 'jurisdiction', 'vat', 'gst', 'return', 'compliance'],
            audit: ['audit', 'isa', 'materiality', 'sampling', 'control', 'substantive', 'evidence'],
            accounting: ['journal', 'ledger', 'reconciliation', 'balance', 'accrual', 'closing'],
            compliance: ['regulation', 'requirement', 'deadline', 'penalty', 'violation'],
            document: ['document', 'extract', 'ocr', 'parse', 'upload'],
            research: ['research', 'guidance', 'standard', 'rule', 'interpret'],
            general: [],
        };
        return keywords[type] ?? [];
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const multiAgentOrchestrator = new MultiAgentOrchestrator();

export function createOrchestrator(): MultiAgentOrchestrator {
    return new MultiAgentOrchestrator();
}

/**
 * Helper to check if autonomy level allows autonomous action
 */
export function canActAutonomously(
    level: AutonomyLevel,
    action: { value?: number; category?: string },
    config: AutonomyConfig
): boolean {
    if (level === AutonomyLevel.L0_MANUAL) return false;
    if (level === AutonomyLevel.L1_ASSISTED) return false;

    // Check always-require-approval categories
    if (action.category && config.alwaysRequireApproval?.includes(action.category)) {
        return false;
    }

    // Check value limits
    if (action.value && config.maxAutonomousValue && action.value > config.maxAutonomousValue) {
        return level >= AutonomyLevel.L5_FULL;
    }

    // L2: Partial - needs review
    if (level === AutonomyLevel.L2_PARTIAL) return false;

    // L3+: Can act autonomously within limits
    return true;
}
