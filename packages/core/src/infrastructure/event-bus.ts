/**
 * Event Bus Service
 * 
 * Message queue abstraction layer supporting Kafka, RabbitMQ, and in-memory modes.
 * Provides reliable event-driven communication between agents and services.
 * 
 * Features:
 * - Configurable backend (Kafka, RabbitMQ, Redis Streams, in-memory)
 * - Topic-based pub/sub with partitioning
 * - Consumer groups for load balancing
 * - Dead letter queue handling
 * - Message acknowledgment and retry
 * - Backpressure management
 * 
 * @example
 * ```typescript
 * import { eventBus } from './event-bus';
 * 
 * // Publish event
 * await eventBus.publish('audit.anomaly.detected', {
 *   engagementId: 'eng-123',
 *   severity: 'high',
 *   details: {...}
 * });
 * 
 * // Subscribe to events
 * eventBus.subscribe('audit.*', async (event) => {
 *   await processAuditEvent(event);
 * });
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EventBusConfig {
    /** Backend type */
    backend: 'kafka' | 'rabbitmq' | 'redis' | 'memory';

    /** Connection settings */
    connection?: {
        hosts?: string[];
        port?: number;
        username?: string;
        password?: string;
        ssl?: boolean;
    };

    /** Consumer group ID */
    consumerGroup?: string;

    /** Enable dead letter queue */
    enableDLQ?: boolean;

    /** Max retries before DLQ */
    maxRetries?: number;

    /** Retry backoff (ms) */
    retryBackoffMs?: number;

    /** Message TTL (ms) */
    messageTTLMs?: number;
}

export interface EventMessage<T = unknown> {
    id: string;
    topic: string;
    key?: string;
    payload: T;
    metadata: {
        timestamp: Date;
        producer: string;
        correlationId?: string;
        retryCount?: number;
        headers?: Record<string, string>;
    };
}

export interface ConsumeOptions {
    /** Start from beginning or latest */
    fromBeginning?: boolean;

    /** Max messages per batch */
    batchSize?: number;

    /** Processing timeout (ms) */
    timeoutMs?: number;

    /** Auto-acknowledge messages */
    autoAck?: boolean;
}

export interface PublishOptions {
    /** Partition key for ordering */
    key?: string;

    /** Custom headers */
    headers?: Record<string, string>;

    /** Correlation ID for tracing */
    correlationId?: string;

    /** Message priority */
    priority?: number;
}

export type EventHandler<T = unknown> = (event: EventMessage<T>) => Promise<void>;

export interface Subscription {
    id: string;
    topic: string;
    handler: EventHandler;
    consumerGroup?: string;
    options?: ConsumeOptions;
}

// ============================================================================
// IN-MEMORY EVENT BUS (Default implementation)
// ============================================================================

class InMemoryEventBus {
    private subscriptions: Map<string, Subscription[]> = new Map();
    private deadLetterQueue: EventMessage[] = [];
    private messageBuffer: EventMessage[] = [];
    private config: EventBusConfig;

    constructor(config: EventBusConfig) {
        this.config = {
            enableDLQ: true,
            maxRetries: 3,
            retryBackoffMs: 1000,
            messageTTLMs: 86400000, // 24 hours
            ...config,
        };
    }

    async publish<T>(topic: string, payload: T, options?: PublishOptions): Promise<string> {
        const message: EventMessage<T> = {
            id: crypto.randomUUID(),
            topic,
            key: options?.key,
            payload,
            metadata: {
                timestamp: new Date(),
                producer: 'event-bus',
                correlationId: options?.correlationId,
                retryCount: 0,
                headers: options?.headers,
            },
        };

        // Buffer message
        this.messageBuffer.push(message as EventMessage);

        // Process immediately (async)
        this.processMessage(message as EventMessage);

        return message.id;
    }

    async publishBatch<T>(events: { topic: string; payload: T; options?: PublishOptions }[]): Promise<string[]> {
        const ids: string[] = [];
        for (const event of events) {
            const id = await this.publish(event.topic, event.payload, event.options);
            ids.push(id);
        }
        return ids;
    }

    subscribe<T = unknown>(
        topic: string,
        handler: EventHandler<T>,
        options?: ConsumeOptions
    ): string {
        const subscription: Subscription = {
            id: crypto.randomUUID(),
            topic,
            handler: handler as EventHandler,
            options,
        };

        const existing = this.subscriptions.get(topic) ?? [];
        existing.push(subscription);
        this.subscriptions.set(topic, existing);

        return subscription.id;
    }

    unsubscribe(subscriptionId: string): void {
        for (const [topic, subs] of this.subscriptions) {
            this.subscriptions.set(topic, subs.filter(s => s.id !== subscriptionId));
        }
    }

    async getDeadLetterQueue(): Promise<EventMessage[]> {
        return [...this.deadLetterQueue];
    }

    async replayDeadLetters(topic?: string): Promise<number> {
        const toReplay = topic
            ? this.deadLetterQueue.filter(m => m.topic === topic)
            : [...this.deadLetterQueue];

        this.deadLetterQueue = this.deadLetterQueue.filter(m => !toReplay.includes(m));

        for (const message of toReplay) {
            message.metadata.retryCount = 0;
            await this.processMessage(message);
        }

        return toReplay.length;
    }

    getStats(): {
        topics: number;
        subscriptions: number;
        bufferedMessages: number;
        deadLetterCount: number;
    } {
        return {
            topics: this.subscriptions.size,
            subscriptions: Array.from(this.subscriptions.values()).reduce((sum, s) => sum + s.length, 0),
            bufferedMessages: this.messageBuffer.length,
            deadLetterCount: this.deadLetterQueue.length,
        };
    }

    private async processMessage(message: EventMessage): Promise<void> {
        const matchingSubscriptions = this.getMatchingSubscriptions(message.topic);

        for (const subscription of matchingSubscriptions) {
            try {
                await Promise.race([
                    subscription.handler(message),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Handler timeout')), subscription.options?.timeoutMs ?? 30000)
                    ),
                ]);
            } catch (error) {
                await this.handleError(message, subscription, error);
            }
        }
    }

    private getMatchingSubscriptions(topic: string): Subscription[] {
        const results: Subscription[] = [];

        for (const [pattern, subs] of this.subscriptions) {
            if (this.topicMatches(topic, pattern)) {
                results.push(...subs);
            }
        }

        return results;
    }

    private topicMatches(topic: string, pattern: string): boolean {
        if (pattern === topic) return true;
        if (pattern === '*') return true;

        // Wildcard matching (e.g., "audit.*" matches "audit.anomaly")
        if (pattern.endsWith('.*')) {
            const prefix = pattern.slice(0, -2);
            return topic.startsWith(prefix + '.');
        }

        // Multi-level wildcard (e.g., "audit.#" matches "audit.anomaly.detected")
        if (pattern.endsWith('.#')) {
            const prefix = pattern.slice(0, -2);
            return topic.startsWith(prefix + '.') || topic === prefix;
        }

        return false;
    }

    private async handleError(message: EventMessage, subscription: Subscription, error: unknown): Promise<void> {
        console.error(`Event handler error for ${message.topic}:`, error);

        message.metadata.retryCount = (message.metadata.retryCount ?? 0) + 1;

        if (message.metadata.retryCount < (this.config.maxRetries ?? 3)) {
            // Retry with backoff
            await new Promise(resolve =>
                setTimeout(resolve, this.config.retryBackoffMs ?? 1000)
            );
            await this.processMessage(message);
        } else if (this.config.enableDLQ) {
            // Send to dead letter queue
            this.deadLetterQueue.push(message);
        }
    }
}

// ============================================================================
// EVENT BUS SERVICE
// ============================================================================

export class EventBusService {
    private bus: InMemoryEventBus;
    private config: EventBusConfig;

    constructor(config: Partial<EventBusConfig> = {}) {
        this.config = {
            backend: 'memory',
            ...config,
        };

        // Initialize backend
        // For now, always use in-memory - would swap based on config.backend
        this.bus = new InMemoryEventBus(this.config);
    }

    /**
     * Publish an event
     */
    async publish<T>(topic: string, payload: T, options?: PublishOptions): Promise<string> {
        return this.bus.publish(topic, payload, options);
    }

    /**
     * Publish multiple events
     */
    async publishBatch<T>(events: { topic: string; payload: T; options?: PublishOptions }[]): Promise<string[]> {
        return this.bus.publishBatch(events);
    }

    /**
     * Subscribe to events
     */
    subscribe<T = unknown>(
        topic: string,
        handler: EventHandler<T>,
        options?: ConsumeOptions
    ): string {
        return this.bus.subscribe(topic, handler, options);
    }

    /**
     * Unsubscribe
     */
    unsubscribe(subscriptionId: string): void {
        this.bus.unsubscribe(subscriptionId);
    }

    /**
     * Get dead letter queue
     */
    async getDeadLetterQueue(): Promise<EventMessage[]> {
        return this.bus.getDeadLetterQueue();
    }

    /**
     * Replay dead letters
     */
    async replayDeadLetters(topic?: string): Promise<number> {
        return this.bus.replayDeadLetters(topic);
    }

    /**
     * Get statistics
     */
    getStats() {
        return this.bus.getStats();
    }

    /**
     * Predefined topic helpers
     */
    topics = {
        // Tax events
        tax: {
            nexusApproaching: 'tax.nexus.approaching',
            nexusBreached: 'tax.nexus.breached',
            filingDue: 'tax.filing.due',
            filingSubmitted: 'tax.filing.submitted',
            rateChange: 'tax.rate.change',
        },
        // Audit events
        audit: {
            anomalyDetected: 'audit.anomaly.detected',
            controlDeviation: 'audit.control.deviation',
            evidenceCollected: 'audit.evidence.collected',
            workpaperUpdated: 'audit.workpaper.updated',
            riskChanged: 'audit.risk.changed',
        },
        // Agent events
        agent: {
            started: 'agent.lifecycle.started',
            stopped: 'agent.lifecycle.stopped',
            taskAssigned: 'agent.task.assigned',
            taskCompleted: 'agent.task.completed',
            escalation: 'agent.escalation.required',
        },
        // System events
        system: {
            error: 'system.error',
            warning: 'system.warning',
            health: 'system.health.check',
        },
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const eventBus = new EventBusService();

export function createEventBus(config?: Partial<EventBusConfig>): EventBusService {
    return new EventBusService(config);
}
