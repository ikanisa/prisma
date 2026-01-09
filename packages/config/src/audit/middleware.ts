/**
 * Audit Middleware
 * 
 * Express/Next.js middleware for automatic request/response auditing.
 */

import type {
    AuditEvent,
    AuditAction,
    AuditOutcome,
} from './types';
import { AuditLogger } from './logger';

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

interface Request {
    method: string;
    url: string;
    path?: string;
    headers: Record<string, string | string[] | undefined>;
    body?: unknown;
    query?: Record<string, string>;
    params?: Record<string, string>;

    // Auth
    user?: {
        id: string;
        email?: string;
        name?: string;
        roles?: string[];
    };

    // Custom
    tenantId?: string;
    requestId?: string;
}

interface Response {
    statusCode: number;
    headers: Record<string, string>;
    body?: unknown;
}

interface AuditMiddlewareOptions {
    /** Paths to skip auditing */
    skipPaths?: string[];

    /** Methods to skip */
    skipMethods?: string[];

    /** Extract tenant ID from request */
    getTenantId?: (req: Request) => string | undefined;

    /** Map routes to actions */
    actionMapper?: (req: Request) => AuditAction | string | null;

    /** Log request body */
    logRequestBody?: boolean;

    /** Log response body */
    logResponseBody?: boolean;

    /** Custom severity mapper */
    severityMapper?: (req: Request, res: Response) => AuditEvent['severity'];
}

// ============================================================================
// DEFAULT ACTION MAPPER
// ============================================================================

function defaultActionMapper(req: Request): AuditAction | string | null {
    const method = req.method.toUpperCase();
    const path = req.path ?? req.url;

    // Auth endpoints
    if (path.includes('/auth/login')) return 'auth.login';
    if (path.includes('/auth/logout')) return 'auth.logout';

    // Document endpoints
    if (path.includes('/documents')) {
        if (method === 'POST') return 'document.upload';
        if (method === 'DELETE') return 'document.delete';
    }

    // Engagement endpoints
    if (path.includes('/engagements')) {
        if (method === 'POST') return 'engagement.create';
        if (method === 'PUT' || method === 'PATCH') return 'engagement.update';
        if (method === 'DELETE') return 'engagement.delete';
    }

    // Generic data operations
    switch (method) {
        case 'GET':
            return 'data.view';
        case 'POST':
            return 'data.create';
        case 'PUT':
        case 'PATCH':
            return 'data.update';
        case 'DELETE':
            return 'data.delete';
    }

    return 'api.call';
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

export function createAuditMiddleware(
    logger: AuditLogger,
    options: AuditMiddlewareOptions = {}
) {
    const {
        skipPaths = ['/health', '/metrics', '/favicon.ico'],
        skipMethods = ['OPTIONS', 'HEAD'],
        getTenantId = (req) => req.tenantId,
        actionMapper = defaultActionMapper,
        logRequestBody = false,
        logResponseBody = false,
        severityMapper,
    } = options;

    return (req: Request, res: Response, next: () => void): void => {
        const path = req.path ?? req.url;
        const method = req.method.toUpperCase();

        // Check if should skip
        if (skipMethods.includes(method)) {
            next();
            return;
        }

        if (skipPaths.some(p => path.startsWith(p))) {
            next();
            return;
        }

        const startTime = Date.now();

        // Capture original end method
        const originalEnd = (res as unknown as { end: (...args: unknown[]) => void }).end;

        // Override end to capture response
        (res as unknown as { end: (...args: unknown[]) => void }).end = function (...args: unknown[]) {
            const duration = Date.now() - startTime;

            // Determine action and outcome
            const action = actionMapper(req);
            const outcome: AuditOutcome = res.statusCode >= 400
                ? (res.statusCode === 403 ? 'denied' : 'failure')
                : 'success';

            // Build audit event
            const event: Omit<AuditEvent, 'id' | 'timestamp'> = {
                action: action ?? 'api.call',
                severity: severityMapper?.(req, res) ?? getSeverity(method, res.statusCode),
                outcome,

                actor: {
                    type: req.user ? 'user' : 'api',
                    id: req.user?.id ?? 'anonymous',
                    name: req.user?.name,
                    email: req.user?.email,
                    roles: req.user?.roles,
                },

                context: {
                    tenantId: getTenantId(req),
                    requestId: req.requestId,
                    ipAddress: getClientIp(req),
                    userAgent: getHeader(req, 'user-agent'),
                    method,
                    endpoint: path,
                    statusCode: res.statusCode,
                },

                metadata: {
                    durationMs: duration,
                    ...(logRequestBody && req.body ? { requestBody: req.body } : {}),
                    ...(logResponseBody && args[0] ? { responseBody: args[0] } : {}),
                },
            };

            // Log asynchronously
            logger.log(event).catch(console.error);

            // Call original end
            return originalEnd.apply(this, args);
        };

        next();
    };
}

// ============================================================================
// NEXT.JS API WRAPPER
// ============================================================================

type NextApiHandler = (req: unknown, res: unknown) => Promise<void> | void;

export function withAudit(
    logger: AuditLogger,
    handler: NextApiHandler,
    options: AuditMiddlewareOptions = {}
): NextApiHandler {
    return async (req: unknown, res: unknown) => {
        const request = req as Request;
        const response = res as Response;
        const startTime = Date.now();

        try {
            await handler(req, res);
        } finally {
            const duration = Date.now() - startTime;
            const action = options.actionMapper?.(request) ?? defaultActionMapper(request);

            await logger.log({
                action: action ?? 'api.call',
                severity: getSeverity(request.method, response.statusCode),
                outcome: response.statusCode >= 400 ? 'failure' : 'success',

                actor: {
                    type: request.user ? 'user' : 'api',
                    id: request.user?.id ?? 'anonymous',
                },

                context: {
                    tenantId: options.getTenantId?.(request),
                    method: request.method,
                    endpoint: request.path ?? request.url,
                    statusCode: response.statusCode,
                    ipAddress: getClientIp(request),
                },

                metadata: { durationMs: duration },
            });
        }
    };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getSeverity(method: string, statusCode: number): AuditEvent['severity'] {
    // Failed requests
    if (statusCode >= 500) return 'high';
    if (statusCode === 403) return 'high';
    if (statusCode === 401) return 'medium';

    // Modifying methods
    if (['DELETE'].includes(method)) return 'high';
    if (['POST', 'PUT', 'PATCH'].includes(method)) return 'medium';

    return 'low';
}

function getClientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = typeof forwarded === 'string' ? forwarded : forwarded[0];
        return ips?.split(',')[0]?.trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return typeof realIp === 'string' ? realIp : realIp[0];
    }

    return undefined;
}

function getHeader(req: Request, name: string): string | undefined {
    const value = req.headers[name];
    return typeof value === 'string' ? value : value?.[0];
}
