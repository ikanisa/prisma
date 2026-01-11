/**
 * Centralized Logging Configuration
 * 
 * Provides structured logging with log levels, aggregation, and retention policies.
 * Addresses: Audit High Priority #13 - Set up centralized logging
 */

// Log levels in order of severity
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
};

// Current log level (configurable via environment)
const CURRENT_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';

// ===========================================
// Log Retention Policies
// ===========================================

export const LOG_RETENTION_POLICIES = {
    // Debug logs - short retention
    debug: {
        retentionDays: 3,
        description: 'Development and debugging logs',
    },

    // Info logs - standard retention
    info: {
        retentionDays: 30,
        description: 'General application activity logs',
    },

    // Warning logs - medium retention
    warn: {
        retentionDays: 90,
        description: 'Warning and potential issue logs',
    },

    // Error logs - long retention
    error: {
        retentionDays: 365,
        description: 'Error logs for investigation',
    },

    // Security/audit logs - longest retention
    audit: {
        retentionDays: 730, // 2 years
        description: 'Security and audit trail logs',
    },
} as const;

// ===========================================
// Log Entry Structure
// ===========================================

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
    // Tracing
    requestId?: string;
    userId?: string;
    sessionId?: string;
    // Source
    service: string;
    component?: string;
    // Error details
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

// ===========================================
// Logger Class
// ===========================================

export class Logger {
    private service: string;
    private component?: string;
    private context: Record<string, unknown> = {};

    constructor(service: string, component?: string) {
        this.service = service;
        this.component = component;
    }

    /**
     * Set additional context for all logs from this logger
     */
    setContext(context: Record<string, unknown>): void {
        this.context = { ...this.context, ...context };
    }

    /**
     * Create child logger with additional context
     */
    child(component: string, context?: Record<string, unknown>): Logger {
        const childLogger = new Logger(this.service, component);
        childLogger.setContext({ ...this.context, ...context });
        return childLogger;
    }

    /**
     * Log at specified level
     */
    private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
        // Check if level is enabled
        if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LOG_LEVEL]) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            service: this.service,
            component: this.component,
            context: { ...this.context, ...context },
            requestId: context?.requestId as string,
            userId: context?.userId as string,
            sessionId: context?.sessionId as string,
        };

        // Output as JSON for log aggregation
        const output = JSON.stringify(entry);

        switch (level) {
            case 'debug':
                console.debug(output);
                break;
            case 'info':
                console.info(output);
                break;
            case 'warn':
                console.warn(output);
                break;
            case 'error':
            case 'fatal':
                console.error(output);
                break;
        }
    }

    debug(message: string, context?: Record<string, unknown>): void {
        this.log('debug', message, context);
    }

    info(message: string, context?: Record<string, unknown>): void {
        this.log('info', message, context);
    }

    warn(message: string, context?: Record<string, unknown>): void {
        this.log('warn', message, context);
    }

    error(message: string, error?: Error, context?: Record<string, unknown>): void {
        this.log('error', message, {
            ...context,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : undefined,
        });
    }

    fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
        this.log('fatal', message, {
            ...context,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : undefined,
        });
    }

    /**
     * Log security/audit event
     */
    audit(action: string, context?: Record<string, unknown>): void {
        this.info(`[AUDIT] ${action}`, { ...context, auditEvent: true });
    }
}

// ===========================================
// Pre-configured Loggers
// ===========================================

export const loggers = {
    api: new Logger('prisma-web', 'api'),
    auth: new Logger('prisma-web', 'auth'),
    ai: new Logger('prisma-web', 'ai'),
    database: new Logger('prisma-web', 'database'),
    security: new Logger('prisma-web', 'security'),
};

// ===========================================
// Log Aggregation Utilities
// ===========================================

export interface LogQuery {
    level?: LogLevel;
    service?: string;
    component?: string;
    startTime?: Date;
    endTime?: Date;
    userId?: string;
    requestId?: string;
    search?: string;
    limit?: number;
}

/**
 * Generate log query for external log service
 * (Cloudflare, Datadog, etc.)
 */
export function buildLogQuery(query: LogQuery): Record<string, string> {
    const filters: Record<string, string> = {};

    if (query.level) {
        filters['level'] = query.level;
    }
    if (query.service) {
        filters['service'] = query.service;
    }
    if (query.component) {
        filters['component'] = query.component;
    }
    if (query.startTime) {
        filters['from'] = query.startTime.toISOString();
    }
    if (query.endTime) {
        filters['to'] = query.endTime.toISOString();
    }
    if (query.userId) {
        filters['userId'] = query.userId;
    }
    if (query.requestId) {
        filters['requestId'] = query.requestId;
    }
    if (query.search) {
        filters['search'] = query.search;
    }
    if (query.limit) {
        filters['limit'] = query.limit.toString();
    }

    return filters;
}

// ===========================================
// Log-Based Alert Rules
// ===========================================

export interface LogAlertRule {
    name: string;
    description: string;
    condition: {
        level: LogLevel;
        countThreshold: number;
        timeWindowMinutes: number;
        filter?: string;
    };
    severity: 'critical' | 'warning' | 'info';
    notification: 'slack' | 'email' | 'pagerduty';
}

export const LOG_ALERT_RULES: LogAlertRule[] = [
    {
        name: 'HighErrorRate',
        description: 'Too many error logs in short time',
        condition: {
            level: 'error',
            countThreshold: 50,
            timeWindowMinutes: 5,
        },
        severity: 'critical',
        notification: 'pagerduty',
    },
    {
        name: 'AuthenticationFailures',
        description: 'Multiple auth failures (potential attack)',
        condition: {
            level: 'warn',
            countThreshold: 20,
            timeWindowMinutes: 5,
            filter: 'component:auth action:login_failed',
        },
        severity: 'critical',
        notification: 'pagerduty',
    },
    {
        name: 'DatabaseErrors',
        description: 'Database connection or query errors',
        condition: {
            level: 'error',
            countThreshold: 10,
            timeWindowMinutes: 5,
            filter: 'component:database',
        },
        severity: 'critical',
        notification: 'slack',
    },
    {
        name: 'SecurityAuditAlert',
        description: 'Security-related audit events',
        condition: {
            level: 'warn',
            countThreshold: 5,
            timeWindowMinutes: 10,
            filter: 'component:security auditEvent:true',
        },
        severity: 'warning',
        notification: 'slack',
    },
    {
        name: 'RateLimitExceeded',
        description: 'Rate limiting triggered frequently',
        condition: {
            level: 'warn',
            countThreshold: 100,
            timeWindowMinutes: 15,
            filter: 'action:rate_limit_exceeded',
        },
        severity: 'warning',
        notification: 'slack',
    },
];

// ===========================================
// Request Logging Middleware
// ===========================================

export function createRequestLogger(requestId: string, userId?: string) {
    const logger = new Logger('prisma-web', 'request');
    logger.setContext({ requestId, userId });
    return logger;
}

/**
 * Log request start
 */
export function logRequestStart(
    logger: Logger,
    method: string,
    path: string,
    userAgent?: string
): void {
    logger.info('Request started', {
        method,
        path,
        userAgent,
    });
}

/**
 * Log request end
 */
export function logRequestEnd(
    logger: Logger,
    method: string,
    path: string,
    status: number,
    durationMs: number
): void {
    logger.info('Request completed', {
        method,
        path,
        status,
        durationMs,
    });
}
