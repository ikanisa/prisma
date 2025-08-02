import { supabaseClient } from "./client.ts";
/**
 * Production monitoring and health check utilities
 * Provides comprehensive system monitoring and alerting
 */

import { getSupabaseClient } from "./supabase.ts";
import { logger } from "./logger.ts";

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency_ms?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  timestamp: string;
  memory_usage: Record<string, number>;
  request_count: number;
  error_count: number;
  avg_response_time: number;
  active_connections: number;
}

export class HealthChecker {
  private static instance: HealthChecker;
  
  static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('agents')
        .select('count', { count: 'exact', head: true });
      
      const latency = Date.now() - start;
      
      if (error) {
        return {
          service: 'database',
          status: 'unhealthy',
          latency_ms: latency,
          error: error.message
        };
      }

      return {
        service: 'database',
        status: latency > 5000 ? 'degraded' : 'healthy',
        latency_ms: latency,
        metadata: { table_accessible: true }
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        latency_ms: Date.now() - start,
        error: error.message
      };
    }
  }

  async checkEdgeFunctions(): Promise<HealthCheckResult[]> {
    const functions = [
      'generate-payment',
      'whatsapp-webhook',
      'driver-assign',
      'import-contacts'
    ];

    const results = await Promise.all(
      functions.map(async (functionName) => {
        const start = Date.now();
        try {
          const supabase = getSupabaseClient();
          const { data, error } = await supabase.functions.invoke(functionName, {
            body: { health_check: true }
          });

          const latency = Date.now() - start;

          if (error) {
            return {
              service: `function:${functionName}`,
              status: 'unhealthy' as const,
              latency_ms: latency,
              error: error.message
            };
          }

          return {
            service: `function:${functionName}`,
            status: latency > 10000 ? 'degraded' as const : 'healthy' as const,
            latency_ms: latency
          };
        } catch (error) {
          return {
            service: `function:${functionName}`,
            status: 'unhealthy' as const,
            latency_ms: Date.now() - start,
            error: error.message
          };
        }
      })
    );

    return results;
  }

  async checkExternalDependencies(): Promise<HealthCheckResult[]> {
    const dependencies = [
      { name: 'openai', url: 'https://api.openai.com/v1/models' },
      { name: 'whatsapp', url: 'https://graph.facebook.com/v17.0/me' }
    ];

    const results = await Promise.all(
      dependencies.map(async (dep) => {
        const start = Date.now();
        try {
          const response = await fetch(dep.url, {
            method: 'GET',
            headers: { 'User-Agent': 'easyMO-HealthCheck/1.0' }
          });

          const latency = Date.now() - start;

          if (!response.ok) {
            return {
              service: `external:${dep.name}`,
              status: 'unhealthy' as const,
              latency_ms: latency,
              error: `HTTP ${response.status}`
            };
          }

          return {
            service: `external:${dep.name}`,
            status: latency > 5000 ? 'degraded' as const : 'healthy' as const,
            latency_ms: latency
          };
        } catch (error) {
          return {
            service: `external:${dep.name}`,
            status: 'unhealthy' as const,
            latency_ms: Date.now() - start,
            error: error.message
          };
        }
      })
    );

    return results;
  }

  async runFullHealthCheck(): Promise<{
    overall_status: 'healthy' | 'unhealthy' | 'degraded';
    checks: HealthCheckResult[];
    timestamp: string;
  }> {
    logger.info('Running full health check');

    const checks: HealthCheckResult[] = [];
    
    // Database check
    checks.push(await this.checkDatabase());
    
    // Edge functions check
    checks.push(...await this.checkEdgeFunctions());
    
    // External dependencies check
    checks.push(...await this.checkExternalDependencies());

    // Determine overall status
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    let overall_status: 'healthy' | 'unhealthy' | 'degraded';
    if (unhealthyCount > 0) {
      overall_status = 'unhealthy';
    } else if (degradedCount > 0) {
      overall_status = 'degraded';
    } else {
      overall_status = 'healthy';
    }

    const result = {
      overall_status,
      checks,
      timestamp: new Date().toISOString()
    };

    logger.info('Health check completed', { 
      overall_status, 
      total_checks: checks.length,
      unhealthy: unhealthyCount,
      degraded: degradedCount
    });

    return result;
  }
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, number> = new Map();
  
  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  incrementCounter(metric: string, value: number = 1): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  setGauge(metric: string, value: number): void {
    this.metrics.set(metric, value);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  async collectSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = Deno.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      memory_usage: {
        rss: memoryUsage.rss,
        heap_used: memoryUsage.heapUsed,
        heap_total: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      request_count: this.metrics.get('requests_total') || 0,
      error_count: this.metrics.get('errors_total') || 0,
      avg_response_time: this.metrics.get('response_time_avg') || 0,
      active_connections: this.metrics.get('connections_active') || 0
    };
  }

  async persistMetrics(): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const metrics = await this.collectSystemMetrics();
      
      const { error } = await supabase
        .from('system_metrics')
        .insert(metrics);

      if (error) {
        logger.error('Failed to persist metrics', error);
      }
    } catch (error) {
      logger.error('Error persisting metrics', error);
    }
  }

  reset(): void {
    this.metrics.clear();
  }
}

export class AlertManager {
  private static instance: AlertManager;
  
  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  async sendAlert(alert: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    service: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // Store alert in database
      const { error } = await supabase
        .from('system_alerts')
        .insert({
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          service: alert.service,
          metadata: alert.metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error('Failed to store alert', error);
        return;
      }

      // Log alert
      logger.warn('ALERT', {
        severity: alert.severity,
        title: alert.title,
        service: alert.service,
        message: alert.message
      });

      // For critical alerts, could add additional notification logic here
      if (alert.severity === 'critical') {
        // Could integrate with external alerting services
        logger.error('CRITICAL ALERT', alert);
      }
    } catch (error) {
      logger.error('Error sending alert', error);
    }
  }

  async checkThresholds(metrics: SystemMetrics): Promise<void> {
    // Memory usage alerts
    const memoryUsagePct = (metrics.memory_usage.heap_used / metrics.memory_usage.heap_total) * 100;
    if (memoryUsagePct > 90) {
      await this.sendAlert({
        severity: 'critical',
        title: 'High Memory Usage',
        message: `Memory usage at ${memoryUsagePct.toFixed(1)}%`,
        service: 'system',
        metadata: { memory_usage_pct: memoryUsagePct }
      });
    } else if (memoryUsagePct > 75) {
      await this.sendAlert({
        severity: 'medium',
        title: 'Elevated Memory Usage',
        message: `Memory usage at ${memoryUsagePct.toFixed(1)}%`,
        service: 'system',
        metadata: { memory_usage_pct: memoryUsagePct }
      });
    }

    // Error rate alerts
    const errorRate = metrics.error_count / Math.max(metrics.request_count, 1);
    if (errorRate > 0.1) {
      await this.sendAlert({
        severity: 'high',
        title: 'High Error Rate',
        message: `Error rate at ${(errorRate * 100).toFixed(1)}%`,
        service: 'system',
        metadata: { error_rate: errorRate }
      });
    }

    // Response time alerts
    if (metrics.avg_response_time > 10000) {
      await this.sendAlert({
        severity: 'medium',
        title: 'Slow Response Times',
        message: `Average response time: ${metrics.avg_response_time}ms`,
        service: 'system',
        metadata: { avg_response_time: metrics.avg_response_time }
      });
    }
  }
}

// Export singleton instances
export const healthChecker = HealthChecker.getInstance();
export const metricsCollector = MetricsCollector.getInstance();
export const alertManager = AlertManager.getInstance();