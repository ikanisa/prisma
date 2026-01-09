/**
 * Audit Logger
 * 
 * Core audit logging functionality with buffering, batching, and alerting.
 */

import type {
    AuditEvent,
    AuditAction,
    AuditSeverity,
    AuditOutcome,
    AuditConfig,
    AuditStore,
    FieldChange,
} from './types';

// ============================================================================
// AUDIT LOGGER
// ============================================================================

const DEFAULT_CONFIG: AuditConfig = {
    enabled: true,
    auditActions: 'all',
    minSeverity: 'low',
    logBodies: false,
    sensitiveFields: ['password', 'secret', 'token', 'apiKey', 'creditCard', 'ssn'],
    retentionDays: 365,
};

export class AuditLogger {
    private config: AuditConfig;
    private store: AuditStore;
    private buffer: AuditEvent[] = [];
    private flushInterval?: NodeJS.Timeout;
    private alertHandlers: ((event: AuditEvent) => void)[] = [];

    constructor(store: AuditStore, config?: Partial<AuditConfig>) {
        this.store = store;
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Start buffer flush interval
        if (this.config.enabled) {
            this.flushInterval = setInterval(() => {
                this.flush().catch(console.error);
            }, 5000);
        }
    }

    /**
     * Log an audit event
     */
    async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
        if (!this.config.enabled) return;
        if (!this.shouldAudit(event.action, event.severity)) return;

        const fullEvent: AuditEvent = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            ...event,
            // Mask sensitive fields
            changes: event.changes ? this.maskChanges(event.changes) : undefined,
            metadata: event.metadata ? this.maskMetadata(event.metadata) : undefined,
        };

        this.buffer.push(fullEvent);

        // Check for alerts
        this.checkAlerts(fullEvent);

        // Flush if buffer is large
        if (this.buffer.length >= 100) {
            await this.flush();
        }
    }

    /**
     * Log authentication event
     */
    async logAuth(
        action: 'auth.login' | 'auth.logout' | 'auth.login_failed' | 'auth.password_change',
        actor: AuditEvent['actor'],
        context: AuditEvent['context'],
        outcome: AuditOutcome = 'success',
        error?: AuditEvent['error']
    ): Promise<void> {
        await this.log({
            action,
            severity: action === 'auth.login_failed' ? 'high' : 'medium',
            outcome,
            actor,
            context,
            error,
        });
    }

    /**
     * Log data access event
     */
    async logDataAccess(
        action: 'data.view' | 'data.export' | 'data.search' | 'data.download',
        actor: AuditEvent['actor'],
        target: AuditEvent['target'],
        context: AuditEvent['context']
    ): Promise<void> {
        await this.log({
            action,
            severity: action === 'data.export' || action === 'data.download' ? 'medium' : 'low',
            outcome: 'success',
            actor,
            target,
            context,
        });
    }

    /**
     * Log data modification with change tracking
     */
    async logDataChange(
        action: 'data.create' | 'data.update' | 'data.delete',
        actor: AuditEvent['actor'],
        target: AuditEvent['target'],
        context: AuditEvent['context'],
        before?: Record<string, unknown>,
        after?: Record<string, unknown>
    ): Promise<void> {
        const changes = this.computeChanges(before, after);

        await this.log({
            action,
            severity: action === 'data.delete' ? 'high' : 'medium',
            outcome: 'success',
            actor,
            target,
            context,
            changes: {
                before,
                after,
                diff: changes,
            },
        });
    }

    /**
     * Log admin action
     */
    async logAdminAction(
        action: AuditAction,
        actor: AuditEvent['actor'],
        target: AuditEvent['target'],
        context: AuditEvent['context'],
        outcome: AuditOutcome = 'success',
        metadata?: Record<string, unknown>
    ): Promise<void> {
        await this.log({
            action,
            severity: 'high',
            outcome,
            actor,
            target,
            context,
            metadata,
        });
    }

    /**
     * Log API call
     */
    async logApiCall(
        actor: AuditEvent['actor'],
        context: AuditEvent['context'] & { method: string; endpoint: string; statusCode: number },
        outcome: AuditOutcome
    ): Promise<void> {
        const action = outcome === 'success' ? 'api.call' :
            context.statusCode === 429 ? 'api.rate_limited' : 'api.error';

        await this.log({
            action,
            severity: outcome === 'failure' ? 'medium' : 'low',
            outcome,
            actor,
            context,
        });
    }

    /**
     * Register alert handler
     */
    onAlert(handler: (event: AuditEvent) => void): void {
        this.alertHandlers.push(handler);
    }

    /**
     * Flush buffered events to store
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const events = [...this.buffer];
        this.buffer = [];

        try {
            await this.store.writeBatch(events);
        } catch (error) {
            console.error('Failed to flush audit events:', error);
            // Re-add to buffer for retry
            this.buffer.unshift(...events);
        }
    }

    /**
     * Cleanup resources
     */
    async close(): Promise<void> {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        await this.flush();
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private shouldAudit(action: string, severity: AuditSeverity): boolean {
        // Check action filter
        if (this.config.auditActions !== 'all') {
            if (!this.config.auditActions.includes(action as AuditAction)) {
                return false;
            }
        }

        // Check severity filter
        const severityOrder: AuditSeverity[] = ['low', 'medium', 'high', 'critical'];
        const minIndex = severityOrder.indexOf(this.config.minSeverity);
        const eventIndex = severityOrder.indexOf(severity);

        return eventIndex >= minIndex;
    }

    private checkAlerts(event: AuditEvent): void {
        if (!this.config.alerting?.enabled) return;

        const shouldAlert =
            this.config.alerting.severities.includes(event.severity) ||
            (this.config.alerting.actions?.includes(event.action as AuditAction));

        if (shouldAlert) {
            for (const handler of this.alertHandlers) {
                try {
                    handler(event);
                } catch (e) {
                    console.error('Alert handler error:', e);
                }
            }
        }
    }

    private computeChanges(before?: Record<string, unknown>, after?: Record<string, unknown>): FieldChange[] {
        if (!before && !after) return [];

        const changes: FieldChange[] = [];
        const allKeys = new Set([
            ...Object.keys(before ?? {}),
            ...Object.keys(after ?? {}),
        ]);

        for (const key of allKeys) {
            const oldValue = before?.[key];
            const newValue = after?.[key];

            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({
                    field: key,
                    oldValue,
                    newValue,
                    sensitive: this.config.sensitiveFields.some(f =>
                        key.toLowerCase().includes(f.toLowerCase())
                    ),
                });
            }
        }

        return changes;
    }

    private maskChanges(changes: AuditEvent['changes']): AuditEvent['changes'] {
        if (!changes) return changes;

        return {
            before: changes.before ? this.maskMetadata(changes.before) : undefined,
            after: changes.after ? this.maskMetadata(changes.after) : undefined,
            diff: changes.diff?.map(d => ({
                ...d,
                oldValue: d.sensitive ? '[REDACTED]' : d.oldValue,
                newValue: d.sensitive ? '[REDACTED]' : d.newValue,
            })),
        };
    }

    private maskMetadata(data: Record<string, unknown>): Record<string, unknown> {
        const masked = { ...data };

        for (const field of this.config.sensitiveFields) {
            const lowerField = field.toLowerCase();
            for (const key of Object.keys(masked)) {
                if (key.toLowerCase().includes(lowerField)) {
                    masked[key] = '[REDACTED]';
                }
            }
        }

        return masked;
    }
}

// ============================================================================
// IN-MEMORY STORE (for development/testing)
// ============================================================================

export class InMemoryAuditStore implements AuditStore {
    private events: AuditEvent[] = [];

    async write(event: AuditEvent): Promise<void> {
        this.events.push(event);
    }

    async writeBatch(events: AuditEvent[]): Promise<void> {
        this.events.push(...events);
    }

    async query(filter: import('./types').AuditQueryFilter): Promise<import('./types').AuditQueryResult> {
        let filtered = [...this.events];

        // Apply filters
        if (filter.startDate) {
            filtered = filtered.filter(e => e.timestamp >= filter.startDate!);
        }
        if (filter.endDate) {
            filtered = filtered.filter(e => e.timestamp <= filter.endDate!);
        }
        if (filter.actorId) {
            filtered = filtered.filter(e => e.actor.id === filter.actorId);
        }
        if (filter.targetType) {
            filtered = filtered.filter(e => e.target?.type === filter.targetType);
        }
        if (filter.actions?.length) {
            filtered = filtered.filter(e => filter.actions!.includes(e.action as AuditAction));
        }
        if (filter.severities?.length) {
            filtered = filtered.filter(e => filter.severities!.includes(e.severity));
        }
        if (filter.tenantId) {
            filtered = filtered.filter(e => e.context.tenantId === filter.tenantId);
        }

        // Sort
        filtered.sort((a, b) => {
            const order = filter.sortOrder === 'asc' ? 1 : -1;
            return order * (b.timestamp.getTime() - a.timestamp.getTime());
        });

        const total = filtered.length;
        const offset = filter.offset ?? 0;
        const limit = filter.limit ?? 100;

        return {
            events: filtered.slice(offset, offset + limit),
            total,
            hasMore: offset + limit < total,
        };
    }

    async getById(id: string): Promise<AuditEvent | null> {
        return this.events.find(e => e.id === id) ?? null;
    }

    async getByCorrelation(correlationId: string): Promise<AuditEvent[]> {
        return this.events.filter(e => e.correlationId === correlationId);
    }

    async cleanup(olderThan: Date): Promise<number> {
        const before = this.events.length;
        this.events = this.events.filter(e => e.timestamp >= olderThan);
        return before - this.events.length;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createAuditLogger(store: AuditStore, config?: Partial<AuditConfig>): AuditLogger {
    return new AuditLogger(store, config);
}
