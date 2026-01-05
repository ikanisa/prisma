/**
 * Prometheus Metrics Integration
 * 
 * Metrics collection with Prometheus
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

const register = new Registry();

// Collect default Node.js metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Tool metrics
export const toolCallsTotal = new Counter({
  name: 'tool_calls_total',
  help: 'Total number of tool calls',
  labelNames: ['tool', 'status'],
  registers: [register],
});

export const toolCallsDuration = new Histogram({
  name: 'tool_calls_duration_seconds',
  help: 'Tool call duration in seconds',
  labelNames: ['tool'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const toolCallsErrors = new Counter({
  name: 'tool_calls_errors_total',
  help: 'Total number of tool call errors',
  labelNames: ['tool', 'error_code'],
  registers: [register],
});

// Agent metrics
export const agentRequestsTotal = new Counter({
  name: 'agent_requests_total',
  help: 'Total number of agent requests',
  labelNames: ['agent', 'status'],
  registers: [register],
});

export const agentRequestsDuration = new Histogram({
  name: 'agent_requests_duration_seconds',
  help: 'Agent request duration in seconds',
  labelNames: ['agent'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// API metrics
export const apiRequestsTotal = new Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['endpoint', 'method', 'status'],
  registers: [register],
});

export const apiRequestsDuration = new Histogram({
  name: 'api_requests_duration_seconds',
  help: 'API request duration in seconds',
  labelNames: ['endpoint', 'method'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// Rate limiting metrics
export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'key'],
  registers: [register],
});

export const rateLimitExceeded = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['endpoint', 'key'],
  registers: [register],
});

// System metrics
export const activeSessions = new Gauge({
  name: 'active_sessions',
  help: 'Number of active chat sessions',
  registers: [register],
});

export const activeWorkflows = new Gauge({
  name: 'active_workflows',
  help: 'Number of active workflows',
  registers: [register],
});

/**
 * Get all metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get metrics in JSON format
 */
export async function getMetricsJSON(): Promise<Record<string, unknown>> {
  return register.getMetricsAsJSON();
}

export { register };

