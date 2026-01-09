/**
 * Audit Module
 * 
 * Export all audit logging components.
 */

// Types
export * from './types';

// Logger
export {
    AuditLogger,
    InMemoryAuditStore,
    createAuditLogger,
} from './logger';

// Middleware
export {
    createAuditMiddleware,
    withAudit,
} from './middleware';

// Retention
export {
    RetentionPolicyEngine,
    ConsoleArchiveStore,
    defaultRetentionPolicies,
    createRetentionEngine,
    type RetentionPolicy,
    type RetentionResult,
    type ArchiveStore,
} from './retention';
