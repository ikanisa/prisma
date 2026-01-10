/**
 * Malta Accounting Agent Orchestrator
 * 
 * Coordinates all Malta Accounting agents for complex multi-step operations.
 */

import type {
    MaltaAccountingAgent,
    AgentContext,
    AgentResponse,
    AgentType,
} from './base-agent.js';

// ============================================================================
// ORCHESTRATOR TYPES
// ============================================================================

/**
 * Accounting task types that can be executed.
 */
export type AccountingTaskType =
    | 'PROCESS_JOURNAL_ENTRY'
    | 'BANK_RECONCILIATION'
    | 'CALCULATE_DEPRECIATION'
    | 'YEAR_END_CLOSE'
    | 'CHECK_CLASSIFICATION'
    | 'CHECK_AUDIT_EXEMPTION'
    | 'GENERATE_BALANCE_SHEET'
    | 'GENERATE_INCOME_STATEMENT'
    | 'GENERATE_CASH_FLOW'
    | 'GENERATE_NOTES'
    | 'PREPARE_MBR_FILING'
    | 'ANALYZE_FINANCIALS'
    | 'DETECT_ANOMALIES';

/**
 * Accounting task definition.
 */
export interface AccountingTask {
    /** Task type */
    type: AccountingTaskType;
    /** Context for execution */
    context: AgentContext;
    /** Task-specific parameters */
    params: Record<string, unknown>;
    /** Priority (1-10, higher = more urgent) */
    priority?: number;
    /** Deadline for completion */
    deadline?: Date;
}

/**
 * Task execution result.
 */
export interface TaskResult {
    /** Task that was executed */
    task: AccountingTask;
    /** Agent that handled the task */
    agentId: string;
    /** Result of execution */
    response: AgentResponse;
    /** Execution start time */
    startedAt: Date;
    /** Execution end time */
    completedAt: Date;
    /** Duration in milliseconds */
    durationMs: number;
}

/**
 * Multi-task execution result.
 */
export interface WorkflowResult {
    /** All task results in order */
    results: TaskResult[];
    /** Overall success */
    success: boolean;
    /** Summary of execution */
    summary: string;
    /** Total duration */
    totalDurationMs: number;
}

// ============================================================================
// AGENT ORCHESTRATOR
// ============================================================================

/**
 * Agent Orchestrator for coordinating Malta Accounting agents.
 */
export class AgentOrchestrator {
    private agents: Map<string, MaltaAccountingAgent> = new Map();
    private taskRouting: Map<AccountingTaskType, AgentType> = new Map();

    constructor() {
        this.initializeRouting();
    }

    /**
     * Initialize task-to-agent-type routing.
     */
    private initializeRouting(): void {
        // Transaction Processing
        this.taskRouting.set('PROCESS_JOURNAL_ENTRY', 'TRANSACTION_PROCESSING');
        this.taskRouting.set('BANK_RECONCILIATION', 'TRANSACTION_PROCESSING');
        this.taskRouting.set('CALCULATE_DEPRECIATION', 'TRANSACTION_PROCESSING');
        this.taskRouting.set('YEAR_END_CLOSE', 'TRANSACTION_PROCESSING');

        // Compliance Monitoring
        this.taskRouting.set('CHECK_CLASSIFICATION', 'COMPLIANCE_MONITORING');
        this.taskRouting.set('CHECK_AUDIT_EXEMPTION', 'COMPLIANCE_MONITORING');

        // Financial Reporting
        this.taskRouting.set('GENERATE_BALANCE_SHEET', 'FINANCIAL_REPORTING');
        this.taskRouting.set('GENERATE_INCOME_STATEMENT', 'FINANCIAL_REPORTING');
        this.taskRouting.set('GENERATE_CASH_FLOW', 'FINANCIAL_REPORTING');
        this.taskRouting.set('GENERATE_NOTES', 'FINANCIAL_REPORTING');

        // Filing
        this.taskRouting.set('PREPARE_MBR_FILING', 'FILING');

        // Analytics
        this.taskRouting.set('ANALYZE_FINANCIALS', 'ANALYTICS');
        this.taskRouting.set('DETECT_ANOMALIES', 'ANALYTICS');
    }

    /**
     * Register an agent with the orchestrator.
     */
    register(agent: MaltaAccountingAgent): void {
        this.agents.set(agent.agentId, agent);
        console.log(`[Orchestrator] Registered agent: ${agent.agentId} (${agent.agentType})`);
    }

    /**
     * Unregister an agent.
     */
    unregister(agentId: string): boolean {
        return this.agents.delete(agentId);
    }

    /**
     * Get all registered agents.
     */
    getAgents(): MaltaAccountingAgent[] {
        return Array.from(this.agents.values());
    }

    /**
     * Get agents by type.
     */
    getAgentsByType(type: AgentType): MaltaAccountingAgent[] {
        return Array.from(this.agents.values()).filter(a => a.agentType === type);
    }

    /**
     * Find the best agent for a task.
     */
    findAgentForTask(task: AccountingTask): MaltaAccountingAgent | null {
        const requiredType = this.taskRouting.get(task.type);
        if (!requiredType) {
            console.warn(`[Orchestrator] Unknown task type: ${task.type}`);
            return null;
        }

        const candidates = this.getAgentsByType(requiredType).filter(agent => {
            // Check framework compatibility
            if (agent.framework !== 'BOTH' && agent.framework !== task.context.framework) {
                return false;
            }
            return true;
        });

        if (candidates.length === 0) {
            console.warn(`[Orchestrator] No agent found for task type: ${task.type}`);
            return null;
        }

        // Return the agent with highest autonomy level (most capable)
        return candidates.sort((a, b) => b.autonomyLevel - a.autonomyLevel)[0];
    }

    /**
     * Execute a single task.
     */
    async execute(task: AccountingTask): Promise<TaskResult> {
        const startedAt = new Date();

        const agent = this.findAgentForTask(task);
        if (!agent) {
            return {
                task,
                agentId: 'none',
                response: {
                    success: false,
                    error: `No suitable agent found for task type: ${task.type}`,
                    requiresReview: false,
                },
                startedAt,
                completedAt: new Date(),
                durationMs: 0,
            };
        }

        console.log(`[Orchestrator] Executing task ${task.type} with agent ${agent.agentId}`);

        try {
            // Agent execution would happen here
            // For now, return a placeholder response
            const response: AgentResponse = {
                success: true,
                requiresReview: false,
                traceId: crypto.randomUUID(),
            };

            const completedAt = new Date();
            return {
                task,
                agentId: agent.agentId,
                response,
                startedAt,
                completedAt,
                durationMs: completedAt.getTime() - startedAt.getTime(),
            };
        } catch (error) {
            const completedAt = new Date();
            return {
                task,
                agentId: agent.agentId,
                response: {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    requiresReview: true,
                    reviewReason: 'Task execution failed',
                },
                startedAt,
                completedAt,
                durationMs: completedAt.getTime() - startedAt.getTime(),
            };
        }
    }

    /**
     * Execute multiple tasks in sequence (workflow).
     */
    async executeWorkflow(tasks: AccountingTask[]): Promise<WorkflowResult> {
        const results: TaskResult[] = [];
        const workflowStart = new Date();

        for (const task of tasks) {
            const result = await this.execute(task);
            results.push(result);

            // Stop workflow on failure unless it's low priority
            if (!result.response.success && (task.priority ?? 5) >= 5) {
                break;
            }
        }

        const workflowEnd = new Date();
        const allSuccess = results.every(r => r.response.success);

        return {
            results,
            success: allSuccess,
            summary: allSuccess
                ? `Completed ${results.length} tasks successfully`
                : `Workflow stopped after ${results.length} tasks (${results.filter(r => !r.response.success).length} failed)`,
            totalDurationMs: workflowEnd.getTime() - workflowStart.getTime(),
        };
    }

    /**
     * Execute year-end close workflow.
     */
    async executeYearEndClose(context: AgentContext): Promise<WorkflowResult> {
        const tasks: AccountingTask[] = [
            // 1. Calculate depreciation
            { type: 'CALCULATE_DEPRECIATION', context, params: { finalMonth: true } },
            // 2. Year-end close
            { type: 'YEAR_END_CLOSE', context, params: {} },
            // 3. Generate financial statements
            { type: 'GENERATE_BALANCE_SHEET', context, params: {} },
            { type: 'GENERATE_INCOME_STATEMENT', context, params: {} },
            { type: 'GENERATE_CASH_FLOW', context, params: {} },
            { type: 'GENERATE_NOTES', context, params: {} },
            // 4. Analyze and detect anomalies
            { type: 'ANALYZE_FINANCIALS', context, params: {} },
            { type: 'DETECT_ANOMALIES', context, params: {} },
            // 5. Check classification and exemptions
            { type: 'CHECK_CLASSIFICATION', context, params: {} },
            { type: 'CHECK_AUDIT_EXEMPTION', context, params: {} },
        ];

        return this.executeWorkflow(tasks);
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create an Agent Orchestrator instance.
 */
export function createOrchestrator(): AgentOrchestrator {
    return new AgentOrchestrator();
}

/**
 * Default singleton instance.
 */
let _orchestrator: AgentOrchestrator | null = null;

export const agentOrchestrator = {
    instance(): AgentOrchestrator {
        if (!_orchestrator) {
            _orchestrator = new AgentOrchestrator();
        }
        return _orchestrator;
    },
};
