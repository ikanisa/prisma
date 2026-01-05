/**
 * Observability: Metrics
 * 
 * Metrics collection for monitoring and alerting
 */

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram';
}

class MetricsCollector {
  private metrics: Metric[] = [];
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    this.record({
      name,
      value: current + value,
      timestamp: Date.now(),
      tags: tags || {},
      type: 'counter',
    });
  }

  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    this.gauges.set(key, value);

    this.record({
      name,
      value,
      timestamp: Date.now(),
      tags: tags || {},
      type: 'gauge',
    });
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);

    this.record({
      name,
      value,
      timestamp: Date.now(),
      tags: tags || {},
      type: 'histogram',
    });
  }

  /**
   * Get counter value
   */
  getCounter(name: string, tags?: Record<string, string>): number {
    const key = this.getKey(name, tags);
    return this.counters.get(key) || 0;
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, tags?: Record<string, string>): number {
    const key = this.getKey(name, tags);
    return this.gauges.get(key) || 0;
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string, tags?: Record<string, string>): {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const key = this.getKey(name, tags);
    const values = this.histograms.get(key) || [];
    
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;

    return {
      count: sorted.length,
      sum,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  /**
   * Record metric
   */
  private record(metric: Metric): void {
    this.metrics.push(metric);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('[METRIC]', JSON.stringify(metric));
    }

    // Export to Prometheus if enabled
    if (process.env.METRICS_BACKEND === 'prometheus') {
      try {
        // Prometheus metrics are recorded directly via prom-client
        // This is handled by the prometheus.ts module
      } catch (error) {
        console.error('Failed to export metric to Prometheus:', error);
      }
    }

    // Export to Datadog if enabled
    if (process.env.METRICS_BACKEND === 'datadog') {
      try {
        // Datadog metrics are recorded directly via datadog-metrics
        // This is handled by the datadog-metrics.ts module
      } catch (error) {
        console.error('Failed to export metric to Datadog:', error);
      }
    }
  }

  /**
   * Get key for metric
   */
  private getKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${tagStr}}`;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Export all metrics
   */
  export(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

/**
 * Global metrics collector
 */
export const metrics = new MetricsCollector();

/**
 * Common metric names
 */
export const MetricNames = {
  // Tool metrics
  TOOL_CALLS_TOTAL: 'tool.calls.total',
  TOOL_CALLS_DURATION: 'tool.calls.duration',
  TOOL_CALLS_ERRORS: 'tool.calls.errors',
  
  // Agent metrics
  AGENT_REQUESTS_TOTAL: 'agent.requests.total',
  AGENT_REQUESTS_DURATION: 'agent.requests.duration',
  AGENT_REQUESTS_ERRORS: 'agent.requests.errors',
  
  // API metrics
  API_REQUESTS_TOTAL: 'api.requests.total',
  API_REQUESTS_DURATION: 'api.requests.duration',
  API_REQUESTS_ERRORS: 'api.requests.errors',
  
  // Rate limiting
  RATE_LIMIT_HITS: 'rate_limit.hits',
  RATE_LIMIT_EXCEEDED: 'rate_limit.exceeded',
} as const;

