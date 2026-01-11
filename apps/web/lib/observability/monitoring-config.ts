/**
 * Production Monitoring Configuration
 * 
 * Defines SLOs, SLIs, and alerting thresholds for production monitoring.
 * Addresses: Audit Blocker #7 - Set up production monitoring
 */

// ===========================================
// Service Level Objectives (SLOs)
// ===========================================

export const SLOs = {
    /**
     * Availability SLO
     * Target: 99.9% uptime
     * Error budget: 43 minutes/month
     */
    availability: {
        target: 0.999,
        errorBudgetMinutes: 43,
        measurementWindow: '30d',
    },

    /**
     * Latency SLO
     * Target: 95% of requests under 500ms
     */
    latency: {
        p50_target_ms: 100,
        p95_target_ms: 500,
        p99_target_ms: 1000,
        measurementWindow: '24h',
    },

    /**
     * Error Rate SLO
     * Target: Less than 0.1% error rate
     */
    errorRate: {
        target: 0.001,
        maxPercent: 0.1,
        measurementWindow: '1h',
    },

    /**
     * Agent Response Time SLO
     * Target: AI agent responses under 10 seconds
     */
    agentResponse: {
        target_seconds: 10,
        p95_target_seconds: 15,
        measurementWindow: '24h',
    },
} as const;

// ===========================================
// Service Level Indicators (SLIs)
// ===========================================

export interface SLIMetric {
    name: string;
    description: string;
    query: string;
    unit: string;
}

export const SLIs: Record<string, SLIMetric> = {
    uptime: {
        name: 'Service Uptime',
        description: 'Percentage of successful health checks',
        query: 'sum(rate(health_check_success[5m])) / sum(rate(health_check_total[5m]))',
        unit: 'percent',
    },
    requestLatency: {
        name: 'Request Latency',
        description: 'Time to first byte for API requests',
        query: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
        unit: 'seconds',
    },
    errorRate: {
        name: 'Error Rate',
        description: 'Percentage of requests returning 5xx status',
        query: 'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))',
        unit: 'percent',
    },
    agentResponseTime: {
        name: 'Agent Response Time',
        description: 'Time for AI agent to generate response',
        query: 'histogram_quantile(0.95, rate(agent_response_duration_seconds_bucket[5m]))',
        unit: 'seconds',
    },
};

// ===========================================
// Alert Rules
// ===========================================

export interface AlertRule {
    name: string;
    severity: 'critical' | 'warning' | 'info';
    condition: string;
    duration: string;
    description: string;
    runbook: string;
}

export const ALERT_RULES: AlertRule[] = [
    // Critical Alerts
    {
        name: 'HighErrorRate',
        severity: 'critical',
        condition: 'error_rate > 0.01',
        duration: '5m',
        description: 'Error rate above 1% for 5 minutes',
        runbook: '/docs/runbooks/incident-response.md',
    },
    {
        name: 'ServiceDown',
        severity: 'critical',
        condition: 'up == 0',
        duration: '1m',
        description: 'Service health check failing',
        runbook: '/docs/runbooks/disaster-recovery.md',
    },
    {
        name: 'DatabaseConnectionFailure',
        severity: 'critical',
        condition: 'db_connection_errors > 0',
        duration: '2m',
        description: 'Database connection errors detected',
        runbook: '/docs/runbooks/disaster-recovery.md',
    },

    // Warning Alerts
    {
        name: 'HighLatency',
        severity: 'warning',
        condition: 'p95_latency_ms > 1000',
        duration: '5m',
        description: 'p95 latency above 1 second',
        runbook: '/docs/runbooks/incident-response.md',
    },
    {
        name: 'ErrorBudgetBurn',
        severity: 'warning',
        condition: 'error_budget_remaining < 0.5',
        duration: '1h',
        description: 'More than 50% of error budget consumed',
        runbook: '/docs/runbooks/incident-response.md',
    },
    {
        name: 'RateLimitExceeded',
        severity: 'warning',
        condition: 'rate_limit_exceeded_total > 100',
        duration: '5m',
        description: 'High number of rate limit violations',
        runbook: '/docs/runbooks/incident-response.md',
    },

    // Info Alerts
    {
        name: 'DeploymentStarted',
        severity: 'info',
        condition: 'deployment_in_progress == 1',
        duration: '0m',
        description: 'New deployment started',
        runbook: '/docs/runbooks/deployment-rollback.md',
    },
    {
        name: 'AgentSlowResponse',
        severity: 'info',
        condition: 'agent_p95_response_seconds > 10',
        duration: '15m',
        description: 'AI agent responding slowly',
        runbook: '/docs/runbooks/incident-response.md',
    },
];

// ===========================================
// Dashboard Configuration
// ===========================================

export const DASHBOARD_PANELS = {
    overview: [
        'uptime_percentage',
        'error_rate',
        'avg_latency',
        'active_users',
    ],
    performance: [
        'request_rate',
        'p50_latency',
        'p95_latency',
        'p99_latency',
    ],
    errors: [
        'error_count_by_type',
        'error_rate_over_time',
        'top_error_endpoints',
    ],
    agents: [
        'agent_request_count',
        'agent_response_time',
        'agent_error_rate',
        'tool_usage_distribution',
    ],
};

// ===========================================
// Health Check Configuration
// ===========================================

export const HEALTH_CHECKS = {
    endpoints: [
        { path: '/api/health', interval: '30s', timeout: '5s' },
        { path: '/api/ai/status', interval: '60s', timeout: '10s' },
    ],
    database: {
        enabled: true,
        interval: '60s',
        timeout: '5s',
        query: 'SELECT 1',
    },
    external: [
        { name: 'Supabase', url: 'https://status.supabase.com/api/v2/status.json' },
        { name: 'OpenAI', url: 'https://status.openai.com/api/v2/status.json' },
    ],
};

// ===========================================
// Utility Functions
// ===========================================

/**
 * Calculate error budget remaining
 */
export function calculateErrorBudget(
    currentErrorRate: number,
    targetErrorRate: number = SLOs.errorRate.target
): { remaining: number; percent: number } {
    const budget = targetErrorRate;
    const consumed = currentErrorRate;
    const remaining = Math.max(0, budget - consumed);
    const percent = (remaining / budget) * 100;

    return { remaining, percent };
}

/**
 * Check if SLO is being met
 */
export function isSLOMet(
    metric: 'availability' | 'latency' | 'errorRate',
    currentValue: number
): boolean {
    switch (metric) {
        case 'availability':
            return currentValue >= SLOs.availability.target;
        case 'latency':
            return currentValue <= SLOs.latency.p95_target_ms;
        case 'errorRate':
            return currentValue <= SLOs.errorRate.target;
        default:
            return false;
    }
}

/**
 * Get alert severity color
 */
export function getAlertColor(severity: AlertRule['severity']): string {
    const colors = {
        critical: '#dc2626', // red-600
        warning: '#d97706',  // amber-600
        info: '#2563eb',     // blue-600
    };
    return colors[severity];
}
