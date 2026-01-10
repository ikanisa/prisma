/**
 * Rwanda Agent Orchestrator
 * 
 * Coordinates multi-agent workflows for accounting, audit, and tax operations.
 * 
 * @package @prisma/accounting-rwanda
 */

import type {
    RwandaAccountingAgent,
    AgentContext,
    AgentResponse,
    AgentType,
} from './base-agent.js';

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * Accounting task types.
 */
export type AccountingTaskType =
    | 'CLASSIFY_TRANSACTION'
    | 'CREATE_JOURNAL_ENTRY'
    | 'CALCULATE_DEPRECIATION'
    | 'CALCULATE_VAT'
    | 'CALCULATE_RSSB'
    | 'CALCULATE_PAYE'
    | 'CALCULATE_CIT'
    | 'PREPARE_VAT_RETURN'
    | 'PREPARE_CIT_RETURN'
    | 'PREPARE_RSSB_SUBMISSION'
    | 'GENERATE_BALANCE_SHEET'
    | 'GENERATE_INCOME_STATEMENT'
    | 'YEAR_END_CLOSE'
    | 'RISK_ASSESSMENT'
    | 'CALCULATE_MATERIALITY'
    | 'DETECT_ANOMALIES'
    | 'GENERATE_KAM';

/**
 * Task definition.
 */
export interface AccountingTask<T = unknown> {
    id: string;
    type: AccountingTaskType;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    context: AgentContext;
    input: T;
    createdAt: Date;
    deadline?: Date;
}

/**
 * Task result.
 */
export interface TaskResult<T = unknown> {
    taskId: string;
    taskType: AccountingTaskType;
    success: boolean;
    data?: T;
    error?: string;
    warnings?: string[];
    agentId: string;
    executionTimeMs: number;
    requiresReview: boolean;
    reviewReason?: string;
}

/**
 * Workflow result for multi-step operations.
 */
export interface WorkflowResult {
    workflowId: string;
    name: string;
    steps: TaskResult[];
    overallSuccess: boolean;
    totalExecutionTimeMs: number;
    requiresReview: boolean;
    reviewReasons: string[];
}

// ============================================================================
// AGENT ORCHESTRATOR
// ============================================================================

/**
 * Agent orchestrator for coordinating Rwanda accounting agents.
 */
export class AgentOrchestrator {
    private static instance_: AgentOrchestrator | null = null;

    readonly agentId = 'rwanda-agent-orchestrator';
    readonly name = 'Rwanda Agent Orchestrator';
    readonly version = '1.0.0';

    private agents: Map<string, RwandaAccountingAgent> = new Map();
    private taskQueue: AccountingTask[] = [];

    private constructor() { }

    /**
     * Get singleton instance.
     */
    static instance(): AgentOrchestrator {
        if (!AgentOrchestrator.instance_) {
            AgentOrchestrator.instance_ = new AgentOrchestrator();
        }
        return AgentOrchestrator.instance_;
    }

    /**
     * Register an agent.
     */
    register(agent: RwandaAccountingAgent): void {
        this.agents.set(agent.agentId, agent);
    }

    /**
     * Get registered agent by ID.
     */
    getAgent(agentId: string): RwandaAccountingAgent | undefined {
        return this.agents.get(agentId);
    }

    /**
     * Get all agents of a specific type.
     */
    getAgentsByType(type: AgentType): RwandaAccountingAgent[] {
        return Array.from(this.agents.values()).filter(a => a.agentType === type);
    }

    /**
     * Get all registered agents.
     */
    getAllAgents(): RwandaAccountingAgent[] {
        return Array.from(this.agents.values());
    }

    /**
     * Submit a task for processing.
     */
    async submitTask<TInput, TOutput>(
        task: AccountingTask<TInput>
    ): Promise<TaskResult<TOutput>> {
        const startTime = Date.now();

        // Find appropriate agent for task
        const agent = this.findAgentForTask(task.type);

        if (!agent) {
            return {
                taskId: task.id,
                taskType: task.type,
                success: false,
                error: `No agent registered for task type: ${task.type}`,
                agentId: 'orchestrator',
                executionTimeMs: Date.now() - startTime,
                requiresReview: true,
                reviewReason: 'No agent available',
            };
        }

        try {
            // Execute task (agents implement their own execute methods)
            const response = await this.executeTask(agent, task);

            return {
                taskId: task.id,
                taskType: task.type,
                success: response.success,
                data: response.data as TOutput,
                error: response.error,
                warnings: response.warnings,
                agentId: agent.agentId,
                executionTimeMs: Date.now() - startTime,
                requiresReview: response.requiresReview,
                reviewReason: response.reviewReason,
            };
        } catch (error) {
            return {
                taskId: task.id,
                taskType: task.type,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                agentId: agent.agentId,
                executionTimeMs: Date.now() - startTime,
                requiresReview: true,
                reviewReason: 'Execution error',
            };
        }
    }

    /**
     * Execute a workflow (sequence of tasks).
     */
    async executeWorkflow(
        workflowId: string,
        name: string,
        tasks: AccountingTask[]
    ): Promise<WorkflowResult> {
        const startTime = Date.now();
        const results: TaskResult[] = [];
        const reviewReasons: string[] = [];

        for (const task of tasks) {
            const result = await this.submitTask(task);
            results.push(result);

            if (result.requiresReview && result.reviewReason) {
                reviewReasons.push(result.reviewReason);
            }

            // Stop workflow on critical failure
            if (!result.success && task.priority === 'CRITICAL') {
                break;
            }
        }

        return {
            workflowId,
            name,
            steps: results,
            overallSuccess: results.every(r => r.success),
            totalExecutionTimeMs: Date.now() - startTime,
            requiresReview: results.some(r => r.requiresReview),
            reviewReasons,
        };
    }

    /**
     * Find agent for task type.
     */
    private findAgentForTask(taskType: AccountingTaskType): RwandaAccountingAgent | undefined {
        const taskToAgentType: Record<AccountingTaskType, AgentType> = {
            CLASSIFY_TRANSACTION: 'TRANSACTION_PROCESSING',
            CREATE_JOURNAL_ENTRY: 'TRANSACTION_PROCESSING',
            CALCULATE_DEPRECIATION: 'TRANSACTION_PROCESSING',
            CALCULATE_VAT: 'COMPLIANCE_MONITORING',
            CALCULATE_RSSB: 'COMPLIANCE_MONITORING',
            CALCULATE_PAYE: 'COMPLIANCE_MONITORING',
            CALCULATE_CIT: 'COMPLIANCE_MONITORING',
            PREPARE_VAT_RETURN: 'FILING',
            PREPARE_CIT_RETURN: 'FILING',
            PREPARE_RSSB_SUBMISSION: 'FILING',
            GENERATE_BALANCE_SHEET: 'FINANCIAL_REPORTING',
            GENERATE_INCOME_STATEMENT: 'FINANCIAL_REPORTING',
            YEAR_END_CLOSE: 'TRANSACTION_PROCESSING',
            RISK_ASSESSMENT: 'AUDIT',
            CALCULATE_MATERIALITY: 'AUDIT',
            DETECT_ANOMALIES: 'AUDIT',
            GENERATE_KAM: 'AUDIT',
        };

        const agentType = taskToAgentType[taskType];
        const agents = this.getAgentsByType(agentType);

        // Return first available agent of the type
        return agents[0];
    }

    /**
     * Execute task with agent.
     */
    private async executeTask<T>(
        _agent: RwandaAccountingAgent,
        _task: AccountingTask<T>
    ): Promise<AgentResponse> {
        // This would call the agent's execute method
        // For now, return a placeholder
        return {
            success: true,
            requiresReview: false,
        };
    }

    /**
     * Get workflow for month-end close.
     */
    createMonthEndWorkflow(context: AgentContext, period: Date): AccountingTask[] {
        const baseId = `month-end-${period.toISOString().slice(0, 7)}`;

        return [
            {
                id: `${baseId}-reconcile`,
                type: 'CREATE_JOURNAL_ENTRY',
                priority: 'HIGH',
                context,
                input: { action: 'reconcile-bank-accounts' },
                createdAt: new Date(),
            },
            {
                id: `${baseId}-depreciation`,
                type: 'CALCULATE_DEPRECIATION',
                priority: 'MEDIUM',
                context,
                input: { period },
                createdAt: new Date(),
            },
            {
                id: `${baseId}-rssb`,
                type: 'CALCULATE_RSSB',
                priority: 'HIGH',
                context,
                input: { period },
                createdAt: new Date(),
            },
            {
                id: `${baseId}-vat`,
                type: 'CALCULATE_VAT',
                priority: 'HIGH',
                context,
                input: { period },
                createdAt: new Date(),
            },
            {
                id: `${baseId}-vat-return`,
                type: 'PREPARE_VAT_RETURN',
                priority: 'CRITICAL',
                context,
                input: { period },
                createdAt: new Date(),
            },
        ];
    }

    /**
     * Get workflow for year-end close.
     */
    createYearEndWorkflow(context: AgentContext, yearEnd: Date): AccountingTask[] {
        const baseId = `year-end-${yearEnd.getFullYear()}`;

        return [
            {
                id: `${baseId}-close`,
                type: 'YEAR_END_CLOSE',
                priority: 'CRITICAL',
                context,
                input: { yearEnd },
                createdAt: new Date(),
            },
            {
                id: `${baseId}-balance-sheet`,
                type: 'GENERATE_BALANCE_SHEET',
                priority: 'HIGH',
                context,
                input: { yearEnd },
                createdAt: new Date(),
            },
            {
                id: `${baseId}-income-statement`,
                type: 'GENERATE_INCOME_STATEMENT',
                priority: 'HIGH',
                context,
                input: { yearEnd },
                createdAt: new Date(),
            },
            {
                id: `${baseId}-cit`,
                type: 'CALCULATE_CIT',
                priority: 'CRITICAL',
                context,
                input: { yearEnd },
                createdAt: new Date(),
            },
            {
                id: `${baseId}-cit-return`,
                type: 'PREPARE_CIT_RETURN',
                priority: 'CRITICAL',
                context,
                input: { yearEnd },
                createdAt: new Date(),
            },
        ];
    }
}

/**
 * Factory function.
 */
export function createOrchestrator(): AgentOrchestrator {
    return AgentOrchestrator.instance();
}

/**
 * Lazy singleton wrapper.
 */
export const agentOrchestrator = {
    instance: () => AgentOrchestrator.instance(),
};
