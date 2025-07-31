/**
 * System Health Monitor Edge Function
 * Comprehensive production monitoring and alerting system
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createErrorResponse, createSuccessResponse } from "../_shared/utils.ts";
import { validateRequiredEnvVars } from "../_shared/validation.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

// Validate environment variables
validateRequiredEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency_ms?: number;
  error?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Route handling
    switch (path) {
      case 'health':
        return await handleHealthCheck(req);
      case 'metrics':
        return await handleMetrics(req);
      case 'alerts':
        return await handleAlerts(req);
      default:
        return await handleFullMonitoring(req);
    }
  } catch (error) {
    logger.error('System health monitor error', error);
    return createErrorResponse('Internal server error', { error: error.message });
  }
});

async function handleHealthCheck(req: Request): Promise<Response> {
  try {
    logger.info('Running health check');
    
    const checks: HealthCheckResult[] = [];
    const supabase = getSupabaseClient();
    
    // Database health check
    const dbStart = Date.now();
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('count', { count: 'exact', head: true });
      
      const dbLatency = Date.now() - dbStart;
      
      if (error) {
        checks.push({
          service: 'database',
          status: 'unhealthy',
          latency_ms: dbLatency,
          error: error.message
        });
      } else {
        checks.push({
          service: 'database',
          status: dbLatency > 5000 ? 'degraded' : 'healthy',
          latency_ms: dbLatency,
          metadata: { table_accessible: true }
        });
      }
    } catch (error) {
      checks.push({
        service: 'database',
        status: 'unhealthy',
        latency_ms: Date.now() - dbStart,
        error: error.message
      });
    }

    // Memory health check
    const memoryUsage = Deno.memoryUsage();
    const memoryUsagePct = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    checks.push({
      service: 'memory',
      status: memoryUsagePct > 90 ? 'unhealthy' : memoryUsagePct > 75 ? 'degraded' : 'healthy',
      metadata: {
        usage_percent: memoryUsagePct,
        heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024)
      }
    });

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

    const healthResult = {
      overall_status,
      checks,
      timestamp: new Date().toISOString()
    };
    
    // Return appropriate HTTP status based on health
    const status = overall_status === 'healthy' ? 200 : 
                  overall_status === 'degraded' ? 206 : 503;

    return new Response(JSON.stringify(healthResult), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Health check failed', error);
    return createErrorResponse('Health check failed', { error: error.message }, 500);
  }
}

async function handleMetrics(req: Request): Promise<Response> {
  try {
    logger.info('Collecting system metrics');
    
    const memoryUsage = Deno.memoryUsage();
    
    const systemMetrics = {
      timestamp: new Date().toISOString(),
      memory_usage: {
        rss: memoryUsage.rss,
        heap_used: memoryUsage.heapUsed,
        heap_total: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      service: 'system-health-monitor'
    };

    return createSuccessResponse(systemMetrics);
  } catch (error) {
    logger.error('Metrics collection failed', error);
    return createErrorResponse('Metrics collection failed', { error: error.message });
  }
}

async function handleAlerts(req: Request): Promise<Response> {
  try {
    if (req.method === 'POST') {
      const alertData = await req.json();
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('system_alerts')
        .insert({
          severity: alertData.severity || 'medium',
          title: alertData.title || 'Manual Alert',
          message: alertData.message || 'No message provided',
          service: alertData.service || 'manual',
          metadata: alertData.metadata || {}
        });

      if (error) {
        logger.error('Failed to create alert', error);
        return createErrorResponse('Failed to create alert', { error: error.message });
      }

      return createSuccessResponse({ message: 'Alert created successfully' });
    }

    // For GET requests, return recent alerts
    const supabase = getSupabaseClient();
    const { data: alerts, error } = await supabase
      .from('system_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Failed to fetch alerts', error);
      return createErrorResponse('Failed to fetch alerts', { error: error.message });
    }

    return createSuccessResponse({ alerts });
  } catch (error) {
    logger.error('Alert handling failed', error);
    return createErrorResponse('Alert handling failed', { error: error.message });
  }
}

async function handleFullMonitoring(req: Request): Promise<Response> {
  try {
    logger.info('Running full system monitoring');

    // Collect all monitoring data
    const healthResult = await handleHealthCheck(req);
    const healthData = await healthResult.json();

    const memoryUsage = Deno.memoryUsage();
    const systemMetrics = {
      timestamp: new Date().toISOString(),
      memory_usage: {
        rss: memoryUsage.rss,
        heap_used: memoryUsage.heapUsed,
        heap_total: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      request_count: 1, // This would be tracked differently in a real system
      error_count: 0,
      avg_response_time: 0,
      active_connections: 1
    };

    // Check thresholds and create alerts if needed
    const memoryUsagePct = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePct > 90) {
      const supabase = getSupabaseClient();
      await supabase.from('system_alerts').insert({
        severity: 'critical',
        title: 'High Memory Usage',
        message: `Memory usage at ${memoryUsagePct.toFixed(1)}%`,
        service: 'system',
        metadata: { memory_usage_pct: memoryUsagePct }
      });
    }

    const response = {
      health: healthData,
      metrics: systemMetrics,
      monitoring_run_at: new Date().toISOString()
    };

    logger.info('Full monitoring completed', {
      overall_health: healthData.overall_status,
      memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024)
    });

    return createSuccessResponse(response);
  } catch (error) {
    logger.error('Full monitoring failed', error);
    return createErrorResponse('Full monitoring failed', { error: error.message });
  }
}