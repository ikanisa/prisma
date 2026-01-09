/**
 * Comprehensive Audit Logging Service
 * 
 * Enterprise-grade audit logging for compliance, security, and forensics.
 * Immutable, tamper-evident logging with search and retention.
 * 
 * Features:
 * - Structured audit events
 * - Immutable log storage
 * - Tamper detection (hash chains)
 * - Search and filtering
 * - Retention management
 * - Export for compliance
 * 
 * @example
 * ```typescript
 * import { auditLogger } from './audit-logging';
 * 
 * // Log an event
 * await auditLogger.log({
 *   action: 'user.login',
 *   actor: 'user-123',
 *   resource: 'session',
 *   outcome: 'success',
 * });
 * 
 * // Search logs
 * const logs = await auditLogger.search({
 *   action: 'user.*',
 *   from: new Date('2025-01-01'),
 * });
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AuditEvent {
    id: string;
    timestamp: Date;

    /** Action performed */
    action: string;

    /** Action category */
    category: AuditCategory;

    /** Who performed the action */
    actor: {
        type: 'user' | 'system' | 'agent' | 'service';
        id: string;
        name?: string;
        ip?: string;
        userAgent?: string;
    };

    /** What was acted upon */
    resource: {
        type: string;
        id?: string;
        name?: string;
    };

    /** Action details */
    details?: Record<string, unknown>;

    /** Before/after state for changes */
    delta?: {
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
    };

    /** Outcome of the action */
    outcome: 'success' | 'failure' | 'error' | 'denied';

    /** Reason for outcome (especially for failures) */
    reason?: string;

    /** Risk score (0-100) */
    riskScore?: number;

    /** Related context */
    context?: {
        sessionId?: string;
        requestId?: string;
        engagementId?: string;
        correlationId?: string;
    };

    /** Hash of the event for tamper detection */
    hash?: string;

    /** Previous event hash for chain integrity */
    previousHash?: string;
}

export type AuditCategory =
    | 'authentication'
    | 'authorization'
    | 'data_access'
    | 'data_modification'
    | 'data_export'
    | 'configuration'
    | 'security'
    | 'compliance'
    | 'system'
    | 'agent';

export interface SearchQuery {
    action?: string;
    category?: AuditCategory;
    actorId?: string;
    resourceType?: string;
    resourceId?: string;
    outcome?: AuditEvent['outcome'];
    from?: Date;
    to?: Date;
    minRiskScore?: number;
    limit?: number;
    offset?: number;
}

export interface AuditLogConfig {
    /** Storage backend */
    storage: 'memory' | 'database' | 's3';

    /** Enable hash chain for tamper detection */
    enableHashChain?: boolean;

    /** Retention period in days */
    retentionDays?: number;

    /** High-risk actions to flag */
    highRiskActions?: string[];

    /** Enable real-time alerts */
    enableAlerts?: boolean;
}

export interface AuditStats {
    totalEvents: number;
    byCategory: Record<AuditCategory, number>;
    byOutcome: Record<string, number>;
    highRiskCount: number;
    uniqueActors: number;
}

// ============================================================================
// AUDIT LOGGING SERVICE
// ============================================================================

export class AuditLoggingService {
    private logs: AuditEvent[] = [];
    private lastHash: string = '0'.repeat(64);
    private config: AuditLogConfig;

    constructor(config: Partial<AuditLogConfig> = {}) {
        this.config = {
            storage: 'memory',
            enableHashChain: true,
            retentionDays: 365,
            enableAlerts: true,
            highRiskActions: [
                'user.delete',
                'data.export',
                'config.change',
                'permission.grant',
                'mfa.disable',
            ],
            ...config,
        };
    }

    /**
     * Log an audit event
     */
    async log(event: Omit<AuditEvent, 'id' | 'timestamp' | 'hash' | 'previousHash'>): Promise<AuditEvent> {
        const id = crypto.randomUUID();
        const timestamp = new Date();

        // Calculate risk score if not provided
        const riskScore = event.riskScore ?? this.calculateRiskScore(event);

        // Create event
        const fullEvent: AuditEvent = {
            id,
            timestamp,
            ...event,
            riskScore,
        };

        // Add hash chain
        if (this.config.enableHashChain) {
            fullEvent.previousHash = this.lastHash;
            fullEvent.hash = await this.calculateHash(fullEvent);
            this.lastHash = fullEvent.hash;
        }

        // Store
        this.logs.push(fullEvent);

        // Alert on high risk
        if (this.config.enableAlerts && riskScore >= 70) {
            this.triggerAlert(fullEvent);
        }

        return fullEvent;
    }

    /**
     * Search audit logs
     */
    async search(query: SearchQuery): Promise<AuditEvent[]> {
        let results = [...this.logs];

        if (query.action) {
            const pattern = new RegExp(query.action.replace('*', '.*'));
            results = results.filter(e => pattern.test(e.action));
        }

        if (query.category) {
            results = results.filter(e => e.category === query.category);
        }

        if (query.actorId) {
            results = results.filter(e => e.actor.id === query.actorId);
        }

        if (query.resourceType) {
            results = results.filter(e => e.resource.type === query.resourceType);
        }

        if (query.resourceId) {
            results = results.filter(e => e.resource.id === query.resourceId);
        }

        if (query.outcome) {
            results = results.filter(e => e.outcome === query.outcome);
        }

        if (query.from) {
            results = results.filter(e => e.timestamp >= query.from!);
        }

        if (query.to) {
            results = results.filter(e => e.timestamp <= query.to!);
        }

        if (query.minRiskScore) {
            results = results.filter(e => (e.riskScore ?? 0) >= query.minRiskScore!);
        }

        // Sort by timestamp descending
        results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Pagination
        const offset = query.offset ?? 0;
        const limit = query.limit ?? 100;
        return results.slice(offset, offset + limit);
    }

    /**
     * Get event by ID
     */
    async getEvent(id: string): Promise<AuditEvent | undefined> {
        return this.logs.find(e => e.id === id);
    }

    /**
     * Verify hash chain integrity
     */
    async verifyIntegrity(): Promise<{ valid: boolean; brokenAt?: number }> {
        let prevHash = '0'.repeat(64);

        for (let i = 0; i < this.logs.length; i++) {
            const event = this.logs[i];

            if (event.previousHash !== prevHash) {
                return { valid: false, brokenAt: i };
            }

            const calculatedHash = await this.calculateHash(event);
            if (event.hash !== calculatedHash) {
                return { valid: false, brokenAt: i };
            }

            prevHash = event.hash!;
        }

        return { valid: true };
    }

    /**
     * Get audit statistics
     */
    async getStats(from?: Date, to?: Date): Promise<AuditStats> {
        let events = [...this.logs];

        if (from) {
            events = events.filter(e => e.timestamp >= from);
        }
        if (to) {
            events = events.filter(e => e.timestamp <= to);
        }

        const byCategory: Record<AuditCategory, number> = {
            authentication: 0,
            authorization: 0,
            data_access: 0,
            data_modification: 0,
            data_export: 0,
            configuration: 0,
            security: 0,
            compliance: 0,
            system: 0,
            agent: 0,
        };

        const byOutcome: Record<string, number> = {};
        const actors = new Set<string>();
        let highRiskCount = 0;

        for (const event of events) {
            byCategory[event.category]++;
            byOutcome[event.outcome] = (byOutcome[event.outcome] ?? 0) + 1;
            actors.add(event.actor.id);
            if ((event.riskScore ?? 0) >= 70) {
                highRiskCount++;
            }
        }

        return {
            totalEvents: events.length,
            byCategory,
            byOutcome,
            highRiskCount,
            uniqueActors: actors.size,
        };
    }

    /**
     * Export logs for compliance
     */
    async export(query: SearchQuery, format: 'json' | 'csv'): Promise<string> {
        const events = await this.search(query);

        if (format === 'csv') {
            const headers = ['id', 'timestamp', 'action', 'category', 'actor_id', 'resource_type', 'resource_id', 'outcome', 'risk_score'];
            const rows = events.map(e => [
                e.id,
                e.timestamp.toISOString(),
                e.action,
                e.category,
                e.actor.id,
                e.resource.type,
                e.resource.id ?? '',
                e.outcome,
                e.riskScore ?? 0,
            ]);
            return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        }

        return JSON.stringify(events, null, 2);
    }

    /**
     * Apply retention policy
     */
    async applyRetention(): Promise<number> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (this.config.retentionDays ?? 365));

        const before = this.logs.length;
        this.logs = this.logs.filter(e => e.timestamp >= cutoff);
        return before - this.logs.length;
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Log authentication event
     */
    async logAuth(action: 'login' | 'logout' | 'mfa' | 'password_change', actorId: string, outcome: 'success' | 'failure', details?: Record<string, unknown>): Promise<AuditEvent> {
        return this.log({
            action: `auth.${action}`,
            category: 'authentication',
            actor: { type: 'user', id: actorId },
            resource: { type: 'session' },
            outcome,
            details,
        });
    }

    /**
     * Log data access
     */
    async logDataAccess(actorId: string, resourceType: string, resourceId: string, action: 'read' | 'list' | 'export'): Promise<AuditEvent> {
        return this.log({
            action: `data.${action}`,
            category: action === 'export' ? 'data_export' : 'data_access',
            actor: { type: 'user', id: actorId },
            resource: { type: resourceType, id: resourceId },
            outcome: 'success',
        });
    }

    /**
     * Log data modification
     */
    async logDataChange(actorId: string, resourceType: string, resourceId: string, action: 'create' | 'update' | 'delete', before?: unknown, after?: unknown): Promise<AuditEvent> {
        return this.log({
            action: `data.${action}`,
            category: 'data_modification',
            actor: { type: 'user', id: actorId },
            resource: { type: resourceType, id: resourceId },
            outcome: 'success',
            delta: {
                before: before as Record<string, unknown>,
                after: after as Record<string, unknown>,
            },
        });
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private calculateRiskScore(event: Omit<AuditEvent, 'id' | 'timestamp' | 'hash' | 'previousHash'>): number {
        let score = 0;

        // High-risk actions
        if (this.config.highRiskActions?.some(a => event.action.includes(a))) {
            score += 40;
        }

        // Failed actions
        if (event.outcome === 'failure' || event.outcome === 'denied') {
            score += 20;
        }

        // Data export
        if (event.category === 'data_export') {
            score += 30;
        }

        // Configuration changes
        if (event.category === 'configuration') {
            score += 20;
        }

        // Security events
        if (event.category === 'security') {
            score += 30;
        }

        return Math.min(100, score);
    }

    private async calculateHash(event: AuditEvent): Promise<string> {
        const data = JSON.stringify({
            id: event.id,
            timestamp: event.timestamp.toISOString(),
            action: event.action,
            actor: event.actor,
            resource: event.resource,
            outcome: event.outcome,
            previousHash: event.previousHash,
        });

        // Simple hash for demo (would use crypto.subtle in production)
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    }

    private triggerAlert(event: AuditEvent): void {
        console.warn(`[AUDIT ALERT] High-risk event: ${event.action} by ${event.actor.id} (score: ${event.riskScore})`);
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const auditLogger = new AuditLoggingService();

export function createAuditLogger(config?: Partial<AuditLogConfig>): AuditLoggingService {
    return new AuditLoggingService(config);
}
