/**
 * Agent Communication Protocol
 * 
 * Event-driven communication system for multi-agent coordination.
 * Provides pub/sub messaging, request/response patterns, and
 * conflict resolution.
 * 
 * Features:
 * - Type-safe event definitions
 * - Priority-based message queuing
 * - Dead letter handling for failed messages
 * - Request/response with timeout
 * - Broadcast to agent groups
 * - Conflict detection and resolution
 * 
 * @example
 * ```typescript
 * import { agentComms } from './agent-communication';
 * 
 * // Subscribe to events
 * agentComms.subscribe('tax-agent', 'nexus.threshold.breached', async (event) => {
 *   await handleThresholdBreach(event.payload);
 * });
 * 
 * // Publish event
 * await agentComms.publish({
 *   type: 'nexus.threshold.breached',
 *   source: 'monitoring-agent',
 *   payload: { jurisdiction: 'US-CA', percent: 105 },
 * });
 * 
 * // Request/response
 * const result = await agentComms.request('compliance-agent', {
 *   action: 'check_registration_status',
 *   data: { jurisdiction: 'US-CA' },
 * });
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AgentMessage {
    id: string;
    type: MessageType;
    source: string;
    target?: string; // Specific target or undefined for broadcast

    /** Message priority */
    priority: Priority;

    /** Payload data */
    payload: unknown;

    /** Correlation ID for tracking conversations */
    correlationId?: string;

    /** Reply-to address for request/response */
    replyTo?: string;

    /** Message metadata */
    metadata: {
        timestamp: Date;
        ttlMs?: number;
        retryCount?: number;
        maxRetries?: number;
    };
}

export type MessageType =
    // Lifecycle events
    | 'agent.started'
    | 'agent.stopped'
    | 'agent.heartbeat'

    // Task events
    | 'task.assigned'
    | 'task.started'
    | 'task.progress'
    | 'task.completed'
    | 'task.failed'

    // Data events
    | 'data.updated'
    | 'data.created'
    | 'data.deleted'

    // Tax-specific events
    | 'nexus.threshold.approaching'
    | 'nexus.threshold.breached'
    | 'nexus.registration.required'
    | 'filing.deadline.approaching'
    | 'filing.submitted'

    // Audit-specific events
    | 'audit.risk.identified'
    | 'audit.anomaly.detected'
    | 'audit.control.deviation'
    | 'audit.evidence.collected'
    | 'audit.workpaper.updated'

    // Coordination events
    | 'handoff.request'
    | 'handoff.accepted'
    | 'handoff.rejected'
    | 'escalation.required'
    | 'approval.requested'
    | 'approval.granted'
    | 'approval.denied'

    // Conflict events
    | 'conflict.detected'
    | 'conflict.resolved'

    // Custom event type
    | string;

export enum Priority {
    CRITICAL = 0,
    HIGH = 1,
    NORMAL = 2,
    LOW = 3,
    BACKGROUND = 4,
}

export interface Subscription {
    id: string;
    subscriberId: string;
    eventType: string | RegExp;
    handler: (message: AgentMessage) => Promise<void>;
    filter?: (message: AgentMessage) => boolean;
    once?: boolean;
}

export interface RequestOptions {
    timeoutMs?: number;
    retries?: number;
    priority?: Priority;
}

export interface RequestMessage {
    action: string;
    data: unknown;
    correlationId?: string;
}

export interface ResponseMessage {
    success: boolean;
    data?: unknown;
    error?: {
        code: string;
        message: string;
    };
}

export interface ConflictEvent {
    id: string;
    type: ConflictType;
    agents: string[];
    resource: string;
    description: string;
    proposals: ConflictProposal[];
    status: 'detected' | 'resolving' | 'resolved' | 'escalated';
    resolution?: ConflictResolution;
}

export type ConflictType =
    | 'resource_contention'
    | 'contradictory_output'
    | 'priority_conflict'
    | 'data_inconsistency';

export interface ConflictProposal {
    agentId: string;
    action: string;
    confidence: number;
    reasoning: string;
}

export interface ConflictResolution {
    method: 'priority' | 'voting' | 'consensus' | 'human' | 'rule_based';
    winner?: string;
    outcome: string;
    resolvedBy: string;
    resolvedAt: Date;
}

// ============================================================================
// AGENT COMMUNICATION SERVICE
// ============================================================================

export class AgentCommunicationService {
    private subscriptions: Map<string, Subscription[]> = new Map();
    private messageQueue: AgentMessage[] = [];
    private deadLetterQueue: AgentMessage[] = [];
    private pendingRequests: Map<string, { resolve: (v: ResponseMessage) => void; reject: (e: Error) => void; timeout: NodeJS.Timeout }> = new Map();
    private conflicts: Map<string, ConflictEvent> = new Map();
    private processing = false;

    /**
     * Subscribe to events
     */
    subscribe(
        subscriberId: string,
        eventType: string | RegExp,
        handler: (message: AgentMessage) => Promise<void>,
        options?: { filter?: (message: AgentMessage) => boolean; once?: boolean }
    ): string {
        const subscriptionId = crypto.randomUUID();
        const subscription: Subscription = {
            id: subscriptionId,
            subscriberId,
            eventType,
            handler,
            filter: options?.filter,
            once: options?.once,
        };

        const existing = this.subscriptions.get(subscriberId) ?? [];
        existing.push(subscription);
        this.subscriptions.set(subscriberId, existing);

        return subscriptionId;
    }

    /**
     * Unsubscribe from events
     */
    unsubscribe(subscriberId: string, subscriptionId?: string): void {
        if (subscriptionId) {
            const subs = this.subscriptions.get(subscriberId) ?? [];
            this.subscriptions.set(subscriberId, subs.filter(s => s.id !== subscriptionId));
        } else {
            this.subscriptions.delete(subscriberId);
        }
    }

    /**
     * Publish an event
     */
    async publish(event: Omit<AgentMessage, 'id' | 'metadata'> & { metadata?: Partial<AgentMessage['metadata']> }): Promise<void> {
        const message: AgentMessage = {
            id: crypto.randomUUID(),
            ...event,
            priority: event.priority ?? Priority.NORMAL,
            metadata: {
                timestamp: new Date(),
                ttlMs: event.metadata?.ttlMs ?? 300000, // 5 min default
                retryCount: 0,
                maxRetries: event.metadata?.maxRetries ?? 3,
                ...event.metadata,
            },
        };

        // Add to priority queue
        this.enqueue(message);

        // Process queue
        this.processQueue();
    }

    /**
     * Broadcast to all agents of a type
     */
    async broadcast(
        source: string,
        eventType: string,
        payload: unknown,
        priority: Priority = Priority.NORMAL
    ): Promise<void> {
        await this.publish({
            type: eventType,
            source,
            target: undefined, // No specific target = broadcast
            priority,
            payload,
        });
    }

    /**
     * Send a request and wait for response
     */
    async request(
        targetAgent: string,
        request: RequestMessage,
        options?: RequestOptions
    ): Promise<ResponseMessage> {
        const correlationId = request.correlationId ?? crypto.randomUUID();
        const timeoutMs = options?.timeoutMs ?? 30000;

        return new Promise((resolve, reject) => {
            // Set up timeout
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(correlationId);
                reject(new Error(`Request to ${targetAgent} timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            this.pendingRequests.set(correlationId, { resolve, reject, timeout });

            // Send request message
            this.publish({
                type: 'task.assigned',
                source: 'communication-service',
                target: targetAgent,
                priority: options?.priority ?? Priority.NORMAL,
                payload: request,
                correlationId,
                replyTo: 'communication-service',
            }).catch(reject);
        });
    }

    /**
     * Send a response to a request
     */
    async respond(correlationId: string, response: ResponseMessage): Promise<void> {
        const pending = this.pendingRequests.get(correlationId);
        if (pending) {
            clearTimeout(pending.timeout);
            pending.resolve(response);
            this.pendingRequests.delete(correlationId);
        }
    }

    /**
     * Report a conflict between agents
     */
    reportConflict(conflict: Omit<ConflictEvent, 'id' | 'status'>): string {
        const id = crypto.randomUUID();
        const fullConflict: ConflictEvent = {
            id,
            ...conflict,
            status: 'detected',
        };

        this.conflicts.set(id, fullConflict);

        // Publish conflict event
        this.publish({
            type: 'conflict.detected',
            source: 'communication-service',
            priority: Priority.HIGH,
            payload: fullConflict,
        });

        return id;
    }

    /**
     * Resolve a conflict
     */
    async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void> {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) {
            throw new Error(`Conflict not found: ${conflictId}`);
        }

        conflict.status = 'resolved';
        conflict.resolution = resolution;

        await this.publish({
            type: 'conflict.resolved',
            source: 'communication-service',
            priority: Priority.HIGH,
            payload: conflict,
        });
    }

    /**
     * Auto-resolve conflicts using configured strategies
     */
    async autoResolveConflict(conflictId: string): Promise<ConflictResolution> {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) {
            throw new Error(`Conflict not found: ${conflictId}`);
        }

        conflict.status = 'resolving';

        // Strategy 1: Highest confidence wins
        const sortedByConfidence = [...conflict.proposals].sort((a, b) => b.confidence - a.confidence);
        const winner = sortedByConfidence[0];

        // Strategy 2: If close confidences, need human
        if (sortedByConfidence.length >= 2) {
            const diff = sortedByConfidence[0].confidence - sortedByConfidence[1].confidence;
            if (diff < 0.1) {
                // Too close - escalate to human
                conflict.status = 'escalated';
                await this.publish({
                    type: 'escalation.required',
                    source: 'communication-service',
                    priority: Priority.CRITICAL,
                    payload: conflict,
                });
                return {
                    method: 'human',
                    outcome: 'Escalated to human for resolution',
                    resolvedBy: 'system',
                    resolvedAt: new Date(),
                };
            }
        }

        const resolution: ConflictResolution = {
            method: 'priority',
            winner: winner?.agentId,
            outcome: winner?.action ?? 'No action taken',
            resolvedBy: 'auto-resolver',
            resolvedAt: new Date(),
        };

        await this.resolveConflict(conflictId, resolution);
        return resolution;
    }

    /**
     * Get pending conflicts
     */
    getPendingConflicts(): ConflictEvent[] {
        return Array.from(this.conflicts.values()).filter(c => c.status !== 'resolved');
    }

    /**
     * Get dead letter queue
     */
    getDeadLetterQueue(): AgentMessage[] {
        return [...this.deadLetterQueue];
    }

    /**
     * Retry dead letters
     */
    async retryDeadLetters(): Promise<number> {
        let retried = 0;
        const toRetry = [...this.deadLetterQueue];
        this.deadLetterQueue = [];

        for (const message of toRetry) {
            message.metadata.retryCount = 0;
            this.enqueue(message);
            retried++;
        }

        await this.processQueue();
        return retried;
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private enqueue(message: AgentMessage): void {
        // Insert in priority order
        let inserted = false;
        for (let i = 0; i < this.messageQueue.length; i++) {
            if (message.priority < this.messageQueue[i].priority) {
                this.messageQueue.splice(i, 0, message);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            this.messageQueue.push(message);
        }
    }

    private async processQueue(): Promise<void> {
        if (this.processing) return;
        this.processing = true;

        try {
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift()!;

                // Check TTL
                const age = Date.now() - message.metadata.timestamp.getTime();
                if (message.metadata.ttlMs && age > message.metadata.ttlMs) {
                    this.deadLetterQueue.push(message);
                    continue;
                }

                // Deliver to subscribers
                const delivered = await this.deliverMessage(message);

                if (!delivered && message.target) {
                    // Target-specific message not delivered
                    (message.metadata.retryCount ??= 0)++;
                    if (message.metadata.retryCount < (message.metadata.maxRetries ?? 3)) {
                        this.enqueue(message);
                    } else {
                        this.deadLetterQueue.push(message);
                    }
                }
            }
        } finally {
            this.processing = false;
        }
    }

    private async deliverMessage(message: AgentMessage): Promise<boolean> {
        let delivered = false;

        for (const [subscriberId, subscriptions] of this.subscriptions) {
            // Check if this subscriber should receive the message
            if (message.target && message.target !== subscriberId) {
                continue;
            }

            for (const subscription of subscriptions) {
                // Check event type match
                const matches = typeof subscription.eventType === 'string'
                    ? subscription.eventType === message.type || subscription.eventType === '*'
                    : subscription.eventType.test(message.type);

                if (!matches) continue;

                // Check filter
                if (subscription.filter && !subscription.filter(message)) continue;

                try {
                    await subscription.handler(message);
                    delivered = true;

                    // Remove if once
                    if (subscription.once) {
                        this.unsubscribe(subscriberId, subscription.id);
                    }
                } catch (error) {
                    console.error(`Handler error for ${subscriberId}:${subscription.id}:`, error);
                }
            }
        }

        return delivered;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const agentComms = new AgentCommunicationService();

export function createCommunicationService(): AgentCommunicationService {
    return new AgentCommunicationService();
}

/**
 * Helper to create a standard event message
 */
export function createEvent(
    type: MessageType,
    source: string,
    payload: unknown,
    options?: {
        target?: string;
        priority?: Priority;
        correlationId?: string;
    }
): Omit<AgentMessage, 'id' | 'metadata'> {
    return {
        type,
        source,
        target: options?.target,
        priority: options?.priority ?? Priority.NORMAL,
        payload,
        correlationId: options?.correlationId,
    };
}
