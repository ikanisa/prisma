/**
 * Agent Message Bus
 *
 * Provides a lightweight in-memory pub/sub layer for agent-to-agent coordination.
 * Designed to mirror the protocol in the autonomous agent report while keeping
 * runtime dependencies minimal.
 */

export type AgentTaskType =
    | 'TAX_NEXUS'
    | 'AUDIT_EVIDENCE'
    | 'RISK_ASSESS'
    | 'COMPLIANCE_CHECK'
    | 'WORKPAPER'
    | 'RESEARCH'
    | 'INTEGRATION_SYNC'
    | 'AUTONOMY_ALERT'
    | 'ORCHESTRATION';

export type AgentPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AgentAutonomyLevel = 'FULL_AUTO' | 'HUMAN_REVIEW' | 'ADVISORY';

export interface AgentMessageContext {
    clientId: string;
    fiscalYear: string;
    jurisdiction?: string;
    engagementId?: string;
    materialityThreshold?: number;
    periodStart?: string;
    periodEnd?: string;
}

export interface AgentMessage {
    id: string;
    agentId: string;
    taskType: AgentTaskType;
    context: AgentMessageContext;
    data: unknown;
    priority: AgentPriority;
    autonomyLevel: AgentAutonomyLevel;
    createdAt: string;
    traceId?: string;
    correlationId?: string;
}

export interface AgentMessageInput extends Omit<AgentMessage, 'id' | 'createdAt'> {
    id?: string;
    createdAt?: string;
}

export interface AgentMessageFilter {
    agentId?: string;
    taskType?: AgentTaskType | AgentTaskType[];
    autonomyLevel?: AgentAutonomyLevel | AgentAutonomyLevel[];
    minimumPriority?: AgentPriority;
}

export type AgentMessageHandler = (message: AgentMessage) => void | Promise<void>;

export interface AgentMessageDispatchError {
    subscriberId: string;
    error: string;
}

export interface AgentMessageDispatchResult {
    delivered: number;
    failed: number;
    errors: AgentMessageDispatchError[];
}

const PRIORITY_ORDER: Record<AgentPriority, number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3,
};

interface SubscriberEntry {
    id: string;
    filter: AgentMessageFilter;
    handler: AgentMessageHandler;
}

export function createAgentMessage(input: AgentMessageInput): AgentMessage {
    return {
        id: input.id ?? crypto.randomUUID(),
        createdAt: input.createdAt ?? new Date().toISOString(),
        agentId: input.agentId,
        taskType: input.taskType,
        context: input.context,
        data: input.data,
        priority: input.priority,
        autonomyLevel: input.autonomyLevel,
        traceId: input.traceId,
        correlationId: input.correlationId,
    };
}

export class AgentMessageBus {
    private subscribers: Map<string, SubscriberEntry> = new Map();

    subscribe(filter: AgentMessageFilter, handler: AgentMessageHandler): () => void {
        const id = crypto.randomUUID();
        this.subscribers.set(id, { id, filter, handler });

        return () => {
            this.subscribers.delete(id);
        };
    }

    getSubscriberCount(): number {
        return this.subscribers.size;
    }

    clear(): void {
        this.subscribers.clear();
    }

    async publish(message: AgentMessage): Promise<AgentMessageDispatchResult> {
        const matching = Array.from(this.subscribers.values()).filter((entry) =>
            matchesFilter(entry.filter, message)
        );

        const errors: AgentMessageDispatchError[] = [];

        await Promise.all(
            matching.map(async (entry) => {
                try {
                    await entry.handler(message);
                } catch (error) {
                    errors.push({
                        subscriberId: entry.id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            })
        );

        return {
            delivered: matching.length - errors.length,
            failed: errors.length,
            errors,
        };
    }
}

export const agentMessageBus = new AgentMessageBus();

function matchesFilter(filter: AgentMessageFilter, message: AgentMessage): boolean {
    if (filter.agentId && filter.agentId !== message.agentId) {
        return false;
    }

    if (filter.taskType) {
        const taskTypes = Array.isArray(filter.taskType) ? filter.taskType : [filter.taskType];
        if (!taskTypes.includes(message.taskType)) {
            return false;
        }
    }

    if (filter.autonomyLevel) {
        const levels = Array.isArray(filter.autonomyLevel)
            ? filter.autonomyLevel
            : [filter.autonomyLevel];
        if (!levels.includes(message.autonomyLevel)) {
            return false;
        }
    }

    if (filter.minimumPriority) {
        const minimum = PRIORITY_ORDER[filter.minimumPriority];
        const current = PRIORITY_ORDER[message.priority];
        if (current < minimum) {
            return false;
        }
    }

    return true;
}
