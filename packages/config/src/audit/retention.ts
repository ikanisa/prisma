/**
 * Retention Policy Engine
 * 
 * Automated cleanup of audit logs based on retention policies.
 */

import type {
    AuditStore,
    AuditEvent,
    AuditSeverity,
    AuditAction,
} from './types';

// ============================================================================
// RETENTION POLICY TYPES
// ============================================================================

export interface RetentionPolicy {
    id: string;
    name: string;

    /** Retention period in days */
    retentionDays: number;

    /** Conditions for this policy to apply */
    conditions?: {
        severities?: AuditSeverity[];
        actions?: AuditAction[];
        actorTypes?: string[];
        tenantIds?: string[];
    };

    /** Whether to archive before deletion */
    archiveBeforeDelete?: boolean;

    /** Priority (higher = evaluated first) */
    priority: number;

    enabled: boolean;
}

export interface RetentionResult {
    policyId: string;
    policyName: string;
    eventsDeleted: number;
    eventsArchived: number;
    startTime: Date;
    endTime: Date;
    error?: string;
}

// ============================================================================
// ARCHIVE STORE
// ============================================================================

export interface ArchiveStore {
    archive(events: AuditEvent[]): Promise<void>;
}

export class ConsoleArchiveStore implements ArchiveStore {
    async archive(events: AuditEvent[]): Promise<void> {
        console.log(`[Audit Archive] Archiving ${events.length} events`);
        // In production, this would write to S3, cold storage, etc.
    }
}

// ============================================================================
// RETENTION POLICY ENGINE
// ============================================================================

export class RetentionPolicyEngine {
    private policies: RetentionPolicy[] = [];
    private auditStore: AuditStore;
    private archiveStore?: ArchiveStore;
    private isRunning = false;

    constructor(auditStore: AuditStore, archiveStore?: ArchiveStore) {
        this.auditStore = auditStore;
        this.archiveStore = archiveStore;
    }

    /**
     * Add a retention policy
     */
    addPolicy(policy: RetentionPolicy): void {
        this.policies.push(policy);
        // Sort by priority (descending)
        this.policies.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Remove a retention policy
     */
    removePolicy(policyId: string): boolean {
        const index = this.policies.findIndex(p => p.id === policyId);
        if (index >= 0) {
            this.policies.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get all policies
     */
    getPolicies(): RetentionPolicy[] {
        return [...this.policies];
    }

    /**
     * Execute retention policies
     */
    async execute(): Promise<RetentionResult[]> {
        if (this.isRunning) {
            throw new Error('Retention policy execution already in progress');
        }

        this.isRunning = true;
        const results: RetentionResult[] = [];

        try {
            for (const policy of this.policies) {
                if (!policy.enabled) continue;

                const result = await this.executePolicy(policy);
                results.push(result);
            }
        } finally {
            this.isRunning = false;
        }

        return results;
    }

    /**
     * Execute a single policy
     */
    private async executePolicy(policy: RetentionPolicy): Promise<RetentionResult> {
        const startTime = new Date();
        let eventsDeleted = 0;
        let eventsArchived = 0;
        let error: string | undefined;

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

            // Query events matching conditions
            const queryResult = await this.auditStore.query({
                endDate: cutoffDate,
                severities: policy.conditions?.severities,
                actions: policy.conditions?.actions,
                limit: 1000,  // Process in batches
            });

            const eventsToProcess = queryResult.events;

            // Archive if configured
            if (policy.archiveBeforeDelete && this.archiveStore && eventsToProcess.length > 0) {
                await this.archiveStore.archive(eventsToProcess);
                eventsArchived = eventsToProcess.length;
            }

            // Delete events
            eventsDeleted = await this.auditStore.cleanup(cutoffDate);

        } catch (e) {
            error = e instanceof Error ? e.message : 'Unknown error';
        }

        return {
            policyId: policy.id,
            policyName: policy.name,
            eventsDeleted,
            eventsArchived,
            startTime,
            endTime: new Date(),
            error,
        };
    }

    /**
     * Preview what would be deleted
     */
    async preview(policyId: string): Promise<{ count: number; oldestEvent: Date; newestEvent: Date } | null> {
        const policy = this.policies.find(p => p.id === policyId);
        if (!policy) return null;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

        const result = await this.auditStore.query({
            endDate: cutoffDate,
            severities: policy.conditions?.severities,
            actions: policy.conditions?.actions,
        });

        if (result.events.length === 0) {
            return { count: 0, oldestEvent: new Date(), newestEvent: new Date() };
        }

        const timestamps = result.events.map(e => e.timestamp.getTime());

        return {
            count: result.total,
            oldestEvent: new Date(Math.min(...timestamps)),
            newestEvent: new Date(Math.max(...timestamps)),
        };
    }
}

// ============================================================================
// DEFAULT POLICIES
// ============================================================================

export const defaultRetentionPolicies: RetentionPolicy[] = [
    {
        id: 'critical-7-year',
        name: 'Critical Events - 7 Year Retention',
        retentionDays: 365 * 7,
        conditions: {
            severities: ['critical'],
        },
        archiveBeforeDelete: true,
        priority: 100,
        enabled: true,
    },
    {
        id: 'high-3-year',
        name: 'High Severity - 3 Year Retention',
        retentionDays: 365 * 3,
        conditions: {
            severities: ['high'],
        },
        archiveBeforeDelete: true,
        priority: 90,
        enabled: true,
    },
    {
        id: 'auth-2-year',
        name: 'Authentication Events - 2 Year Retention',
        retentionDays: 365 * 2,
        conditions: {
            actions: ['auth.login', 'auth.logout', 'auth.login_failed', 'auth.password_change'],
        },
        archiveBeforeDelete: true,
        priority: 80,
        enabled: true,
    },
    {
        id: 'data-changes-1-year',
        name: 'Data Modifications - 1 Year Retention',
        retentionDays: 365,
        conditions: {
            actions: ['data.create', 'data.update', 'data.delete'],
        },
        archiveBeforeDelete: true,
        priority: 70,
        enabled: true,
    },
    {
        id: 'default-90-day',
        name: 'Default - 90 Day Retention',
        retentionDays: 90,
        archiveBeforeDelete: false,
        priority: 0,
        enabled: true,
    },
];

// ============================================================================
// FACTORY
// ============================================================================

export function createRetentionEngine(
    auditStore: AuditStore,
    archiveStore?: ArchiveStore,
    policies?: RetentionPolicy[]
): RetentionPolicyEngine {
    const engine = new RetentionPolicyEngine(auditStore, archiveStore);

    for (const policy of (policies ?? defaultRetentionPolicies)) {
        engine.addPolicy(policy);
    }

    return engine;
}
