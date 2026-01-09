/**
 * Audit Types
 * 
 * Type definitions for comprehensive audit logging.
 */

// ============================================================================
// AUDIT EVENT TYPES
// ============================================================================

export type AuditAction =
    // Authentication
    | 'auth.login'
    | 'auth.logout'
    | 'auth.login_failed'
    | 'auth.password_change'
    | 'auth.mfa_enabled'
    | 'auth.mfa_disabled'

    // Data Access
    | 'data.view'
    | 'data.export'
    | 'data.search'
    | 'data.download'

    // Data Modification
    | 'data.create'
    | 'data.update'
    | 'data.delete'
    | 'data.restore'
    | 'data.archive'

    // Admin Actions
    | 'admin.user_create'
    | 'admin.user_update'
    | 'admin.user_delete'
    | 'admin.role_assign'
    | 'admin.role_revoke'
    | 'admin.settings_change'

    // Document Actions
    | 'document.upload'
    | 'document.delete'
    | 'document.share'
    | 'document.unshare'
    | 'document.approve'
    | 'document.reject'

    // Engagement Actions
    | 'engagement.create'
    | 'engagement.update'
    | 'engagement.delete'
    | 'engagement.assign'
    | 'engagement.complete'

    // API Access
    | 'api.call'
    | 'api.rate_limited'
    | 'api.error';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AuditOutcome = 'success' | 'failure' | 'partial' | 'denied';

// ============================================================================
// AUDIT EVENT
// ============================================================================

export interface AuditEvent {
    id: string;
    timestamp: Date;

    // Action details
    action: AuditAction | string;
    severity: AuditSeverity;
    outcome: AuditOutcome;

    // Actor (who performed the action)
    actor: {
        type: 'user' | 'system' | 'api' | 'integration';
        id: string;
        name?: string;
        email?: string;
        roles?: string[];
    };

    // Target (what was affected)
    target?: {
        type: string;  // e.g., 'user', 'document', 'engagement'
        id: string;
        name?: string;
        path?: string;
    };

    // Context
    context: {
        tenantId?: string;
        engagementId?: string;
        sessionId?: string;
        requestId?: string;

        // Client info
        ipAddress?: string;
        userAgent?: string;
        geoLocation?: {
            country?: string;
            region?: string;
            city?: string;
        };

        // API context
        method?: string;
        endpoint?: string;
        statusCode?: number;
    };

    // Change tracking
    changes?: {
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
        diff?: FieldChange[];
    };

    // Additional metadata
    metadata?: Record<string, unknown>;

    // Error info (if outcome is failure)
    error?: {
        code?: string;
        message: string;
        stack?: string;
    };

    // Correlation
    correlationId?: string;
    parentEventId?: string;
}

export interface FieldChange {
    field: string;
    oldValue: unknown;
    newValue: unknown;
    sensitive?: boolean;  // Mask in logs
}

// ============================================================================
// AUDIT CONFIGURATION
// ============================================================================

export interface AuditConfig {
    /** Enable audit logging */
    enabled: boolean;

    /** Actions to audit */
    auditActions: AuditAction[] | 'all';

    /** Minimum severity to log */
    minSeverity: AuditSeverity;

    /** Include request/response bodies */
    logBodies: boolean;

    /** Sensitive fields to mask */
    sensitiveFields: string[];

    /** Retention period in days */
    retentionDays: number;

    /** Enable real-time alerts */
    alerting?: {
        enabled: boolean;
        severities: AuditSeverity[];
        actions?: AuditAction[];
    };
}

// ============================================================================
// AUDIT STORE
// ============================================================================

export interface AuditStore {
    write(event: AuditEvent): Promise<void>;
    writeBatch(events: AuditEvent[]): Promise<void>;

    query(filter: AuditQueryFilter): Promise<AuditQueryResult>;

    getById(id: string): Promise<AuditEvent | null>;
    getByCorrelation(correlationId: string): Promise<AuditEvent[]>;

    cleanup(olderThan: Date): Promise<number>;
}

export interface AuditQueryFilter {
    // Time range
    startDate?: Date;
    endDate?: Date;

    // Actor filters
    actorId?: string;
    actorType?: string;

    // Target filters
    targetType?: string;
    targetId?: string;

    // Action filters
    actions?: AuditAction[];
    severities?: AuditSeverity[];
    outcomes?: AuditOutcome[];

    // Context filters
    tenantId?: string;
    engagementId?: string;
    ipAddress?: string;

    // Search
    searchQuery?: string;

    // Pagination
    limit?: number;
    offset?: number;

    // Sorting
    sortBy?: 'timestamp' | 'severity' | 'action';
    sortOrder?: 'asc' | 'desc';
}

export interface AuditQueryResult {
    events: AuditEvent[];
    total: number;
    hasMore: boolean;
}

// ============================================================================
// AUDIT REPORT
// ============================================================================

export interface AuditReport {
    id: string;
    name: string;
    generatedAt: Date;
    generatedBy: string;

    // Filters used
    filter: AuditQueryFilter;

    // Summary
    summary: {
        totalEvents: number;
        byAction: Record<string, number>;
        bySeverity: Record<AuditSeverity, number>;
        byOutcome: Record<AuditOutcome, number>;
        byActor: { id: string; name?: string; count: number }[];
        topTargets: { type: string; id: string; name?: string; count: number }[];
    };

    // Time series
    timeline: {
        period: 'hour' | 'day' | 'week';
        data: { timestamp: Date; count: number }[];
    };

    // Events (if included)
    events?: AuditEvent[];
}
