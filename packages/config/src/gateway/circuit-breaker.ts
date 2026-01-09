/**
 * Circuit Breaker
 * 
 * Circuit breaker pattern for fault tolerance and resilience.
 */

import type {
    CircuitBreakerConfig,
    CircuitBreakerState,
    CircuitState,
    GatewayContext,
    GatewayMiddleware,
    GatewayResponse,
} from './types';

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export class CircuitBreaker {
    private config: CircuitBreakerConfig;
    private state: CircuitBreakerState;
    private name: string;

    constructor(name: string, config: CircuitBreakerConfig) {
        this.name = name;
        this.config = {
            timeout: 30000,
            isFailure: (error: unknown) => error instanceof Error,
            ...config,
        };

        this.state = {
            state: 'closed',
            failures: 0,
            successes: 0,
            lastStateChange: new Date(),
        };
    }

    /**
     * Get current state
     */
    getState(): CircuitBreakerState {
        return { ...this.state };
    }

    /**
     * Check if circuit allows request
     */
    canExecute(): boolean {
        this.updateState();
        return this.state.state !== 'open';
    }

    /**
     * Record a successful call
     */
    recordSuccess(): void {
        this.state.successes++;
        this.state.failures = 0;

        if (this.state.state === 'half-open') {
            if (this.state.successes >= this.config.successThreshold) {
                this.transition('closed');
            }
        }
    }

    /**
     * Record a failed call
     */
    recordFailure(error?: unknown): void {
        // Check if this error should count as a failure
        if (error && this.config.isFailure && !this.config.isFailure(error)) {
            return;
        }

        this.state.failures++;
        this.state.lastFailure = new Date();

        if (this.state.state === 'half-open') {
            // Any failure in half-open trips back to open
            this.transition('open');
        } else if (this.state.state === 'closed') {
            if (this.state.failures >= this.config.failureThreshold) {
                this.transition('open');
            }
        }
    }

    /**
     * Execute a function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (!this.canExecute()) {
            throw new CircuitOpenError(this.name, this.state.nextAttempt);
        }

        try {
            const result = await this.withTimeout(fn);
            this.recordSuccess();
            return result;
        } catch (error) {
            this.recordFailure(error);
            throw error;
        }
    }

    /**
     * Create middleware
     */
    middleware(
        handler: (ctx: GatewayContext) => Promise<GatewayResponse>
    ): GatewayMiddleware {
        return async (ctx: GatewayContext, next: () => Promise<void>) => {
            ctx.circuit = this.getState();

            if (!this.canExecute()) {
                // Try fallback if available
                if (this.config.fallback) {
                    ctx.response = await this.config.fallback(ctx.request);
                    return;
                }

                ctx.response = {
                    status: 503,
                    headers: {
                        'Retry-After': Math.ceil(
                            ((this.state.nextAttempt?.getTime() ?? Date.now()) - Date.now()) / 1000
                        ).toString(),
                    },
                    body: {
                        error: 'Service Unavailable',
                        message: 'Circuit breaker is open',
                        retryAfter: this.state.nextAttempt?.toISOString(),
                    },
                };
                return;
            }

            try {
                ctx.response = await this.withTimeout(() => handler(ctx));

                // Check if response indicates failure
                if (ctx.response && ctx.response.status >= 500) {
                    this.recordFailure();
                } else {
                    this.recordSuccess();
                }
            } catch (error) {
                this.recordFailure(error);
                ctx.error = error instanceof Error ? error : new Error(String(error));

                ctx.response = {
                    status: 500,
                    headers: {},
                    body: {
                        error: 'Internal Server Error',
                        message: ctx.error.message,
                    },
                };
            }

            ctx.circuit = this.getState();
            await next();
        };
    }

    /**
     * Force circuit state (for testing/admin)
     */
    forceState(state: CircuitState): void {
        this.transition(state);
    }

    /**
     * Reset circuit to closed state
     */
    reset(): void {
        this.state = {
            state: 'closed',
            failures: 0,
            successes: 0,
            lastStateChange: new Date(),
        };
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private updateState(): void {
        if (this.state.state === 'open' && this.state.nextAttempt) {
            if (new Date() >= this.state.nextAttempt) {
                this.transition('half-open');
            }
        }
    }

    private transition(newState: CircuitState): void {
        const now = new Date();

        this.state.state = newState;
        this.state.lastStateChange = now;
        this.state.successes = 0;

        if (newState === 'open') {
            this.state.nextAttempt = new Date(now.getTime() + this.config.openDuration);
        } else {
            this.state.nextAttempt = undefined;
        }

        if (newState === 'closed') {
            this.state.failures = 0;
        }

        console.log(`Circuit ${this.name}: ${this.state.state} -> ${newState}`);
    }

    private async withTimeout<T>(fn: () => Promise<T>): Promise<T> {
        if (!this.config.timeout) {
            return fn();
        }

        return Promise.race([
            fn(),
            new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new TimeoutError(this.config.timeout!));
                }, this.config.timeout);
            }),
        ]);
    }
}

// ============================================================================
// ERRORS
// ============================================================================

export class CircuitOpenError extends Error {
    public readonly circuitName: string;
    public readonly retryAfter?: Date;

    constructor(circuitName: string, retryAfter?: Date) {
        super(`Circuit breaker ${circuitName} is open`);
        this.name = 'CircuitOpenError';
        this.circuitName = circuitName;
        this.retryAfter = retryAfter;
    }
}

export class TimeoutError extends Error {
    public readonly timeoutMs: number;

    constructor(timeoutMs: number) {
        super(`Operation timed out after ${timeoutMs}ms`);
        this.name = 'TimeoutError';
        this.timeoutMs = timeoutMs;
    }
}

// ============================================================================
// CIRCUIT BREAKER REGISTRY
// ============================================================================

export class CircuitBreakerRegistry {
    private breakers = new Map<string, CircuitBreaker>();

    /**
     * Get or create a circuit breaker
     */
    get(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
        let breaker = this.breakers.get(name);

        if (!breaker && config) {
            breaker = new CircuitBreaker(name, config);
            this.breakers.set(name, breaker);
        }

        if (!breaker) {
            throw new Error(`Circuit breaker ${name} not found`);
        }

        return breaker;
    }

    /**
     * Register a circuit breaker
     */
    register(name: string, config: CircuitBreakerConfig): CircuitBreaker {
        const breaker = new CircuitBreaker(name, config);
        this.breakers.set(name, breaker);
        return breaker;
    }

    /**
     * Get all circuit breakers
     */
    getAll(): Map<string, CircuitBreaker> {
        return new Map(this.breakers);
    }

    /**
     * Get status of all circuits
     */
    getStatus(): Record<string, CircuitBreakerState> {
        const status: Record<string, CircuitBreakerState> = {};
        for (const [name, breaker] of this.breakers) {
            status[name] = breaker.getState();
        }
        return status;
    }

    /**
     * Reset all circuits
     */
    resetAll(): void {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createCircuitBreaker(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    return new CircuitBreaker(name, config);
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
