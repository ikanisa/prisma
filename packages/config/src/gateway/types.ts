/**
 * API Gateway Types
 * 
 * Type definitions for API Gateway middleware components.
 */

// ============================================================================
// RATE LIMITING
// ============================================================================

export interface RateLimitConfig {
    /** Time window in milliseconds */
    windowMs: number;

    /** Maximum requests per window */
    maxRequests: number;

    /** Key generator function */
    keyGenerator?: (req: GatewayRequest) => string;

    /** Skip certain requests */
    skip?: (req: GatewayRequest) => boolean;

    /** Custom message on limit exceeded */
    message?: string;

    /** Headers to include in response */
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
}

export interface RateLimitState {
    key: string;
    count: number;
    resetAt: Date;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    retryAfter?: number;
}

// ============================================================================
// THROTTLING
// ============================================================================

export interface ThrottleConfig {
    /** Requests per second limit */
    rps: number;

    /** Burst capacity */
    burst?: number;

    /** Queue requests instead of rejecting */
    queue?: boolean;

    /** Maximum queue size */
    maxQueueSize?: number;

    /** Queue timeout in ms */
    queueTimeout?: number;
}

export interface ThrottleState {
    tokens: number;
    lastRefill: number;
    queueSize: number;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
    /** Failure threshold to trip circuit */
    failureThreshold: number;

    /** Success threshold to close circuit (in half-open) */
    successThreshold: number;

    /** Time circuit stays open before half-open (ms) */
    openDuration: number;

    /** Timeout for individual requests (ms) */
    timeout?: number;

    /** Function to determine if error should count */
    isFailure?: (error: unknown) => boolean;

    /** Fallback function when circuit is open */
    fallback?: (req: GatewayRequest) => GatewayResponse | Promise<GatewayResponse>;
}

export interface CircuitBreakerState {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure?: Date;
    lastStateChange: Date;
    nextAttempt?: Date;
}

// ============================================================================
// API VERSIONING
// ============================================================================

export type VersionStrategy = 'path' | 'header' | 'query' | 'accept';

export interface VersionConfig {
    /** Versioning strategy */
    strategy: VersionStrategy;

    /** Header name (if using header strategy) */
    headerName?: string;

    /** Query parameter name (if using query strategy) */
    queryParam?: string;

    /** Default version */
    defaultVersion: string;

    /** Supported versions */
    supportedVersions: string[];

    /** Deprecated versions */
    deprecatedVersions?: string[];

    /** Sunset dates for deprecated versions */
    sunsetDates?: Record<string, Date>;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface GatewayRequest {
    method: string;
    path: string;
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string | string[] | undefined>;
    body?: unknown;

    // Client info
    ip?: string;
    userAgent?: string;

    // Auth info
    userId?: string;
    tenantId?: string;
    apiKey?: string;

    // Metadata
    requestId: string;
    timestamp: Date;
}

export interface GatewayResponse {
    status: number;
    headers: Record<string, string>;
    body?: unknown;
}

export interface GatewayContext {
    request: GatewayRequest;
    response?: GatewayResponse;

    // Timing
    startTime: number;
    endTime?: number;

    // Rate limit info
    rateLimit?: RateLimitResult;

    // Circuit breaker
    circuit?: CircuitBreakerState;

    // Version
    version?: string;

    // Error
    error?: Error;

    // Custom data
    metadata: Record<string, unknown>;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

export type GatewayMiddleware = (
    ctx: GatewayContext,
    next: () => Promise<void>
) => Promise<void>;

export interface GatewayConfig {
    rateLimiting?: RateLimitConfig | RateLimitConfig[];
    throttling?: ThrottleConfig;
    circuitBreaker?: CircuitBreakerConfig;
    versioning?: VersionConfig;

    // Logging
    logRequests?: boolean;
    logResponses?: boolean;

    // CORS
    cors?: {
        origins: string[];
        methods: string[];
        headers: string[];
        credentials?: boolean;
    };

    // Request limits
    maxBodySize?: number;
    timeout?: number;
}
