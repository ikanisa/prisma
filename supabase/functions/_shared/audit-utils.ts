import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =======================================================================
// Enhanced Audit Utilities for Production Hardening
// =======================================================================

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export interface AuditLogEntry {
  function_name: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  metadata?: Record<string, any>;
}

export interface SecurityEvent {
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  function_name?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
}

export interface PerformanceMetric {
  function_name: string;
  execution_time_ms: number;
  memory_usage_mb?: number;
  request_id?: string;
  user_id?: string;
  status_code: number;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface FunctionHealthMetric {
  function_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms: number;
  error_rate: number;
  success_rate: number;
  total_requests: number;
  failed_requests: number;
  period_start: string;
  period_end: string;
}

/**
 * Log audit trail entry
 */
export async function logAuditTrail(entry: AuditLogEntry): Promise<void> {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        function_name: entry.function_name,
        user_id: entry.user_id,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
        request_id: entry.request_id,
        metadata: entry.metadata
      });
  } catch (error) {
    console.error('Failed to log audit trail:', error);
  }
}

/**
 * Log security event
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    await supabase
      .from('security_events')
      .insert({
        event_type: event.event_type,
        severity: event.severity,
        function_name: event.function_name,
        user_id: event.user_id,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        details: event.details
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Log performance metric
 */
export async function logPerformanceMetric(metric: PerformanceMetric): Promise<void> {
  try {
    await supabase
      .from('performance_metrics')
      .insert({
        function_name: metric.function_name,
        execution_time_ms: metric.execution_time_ms,
        memory_usage_mb: metric.memory_usage_mb,
        request_id: metric.request_id,
        user_id: metric.user_id,
        status_code: metric.status_code,
        error_message: metric.error_message,
        metadata: metric.metadata
      });
  } catch (error) {
    console.error('Failed to log performance metric:', error);
  }
}

/**
 * Log function health metric
 */
export async function logFunctionHealth(metric: FunctionHealthMetric): Promise<void> {
  try {
    await supabase
      .from('function_health_metrics')
      .insert({
        function_name: metric.function_name,
        status: metric.status,
        response_time_ms: metric.response_time_ms,
        error_rate: metric.error_rate,
        success_rate: metric.success_rate,
        total_requests: metric.total_requests,
        failed_requests: metric.failed_requests,
        period_start: metric.period_start,
        period_end: metric.period_end
      });
  } catch (error) {
    console.error('Failed to log function health metric:', error);
  }
}

/**
 * Enhanced performance monitoring with audit logging
 */
export async function withAuditPerformanceMonitoring<T>(
  functionName: string,
  operation: () => Promise<T>,
  context?: {
    requestId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<T> {
  const startTime = Date.now();
  const startMemory = performance.memory?.usedJSHeapSize || 0;
  
  try {
    const result = await operation();
    const executionTime = Date.now() - startTime;
    const endMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryUsage = (endMemory - startMemory) / (1024 * 1024); // Convert to MB
    
    // Log successful performance metric
    await logPerformanceMetric({
      function_name: functionName,
      execution_time_ms: executionTime,
      memory_usage_mb: memoryUsage,
      request_id: context?.requestId,
      user_id: context?.userId,
      status_code: 200,
      metadata: { success: true }
    });
    
    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Log failed performance metric
    await logPerformanceMetric({
      function_name: functionName,
      execution_time_ms: executionTime,
      request_id: context?.requestId,
      user_id: context?.userId,
      status_code: 500,
      error_message: error.message,
      metadata: { success: false, error: error.message }
    });
    
    throw error;
  }
}

/**
 * Enhanced security monitoring wrapper
 */
export async function withSecurityMonitoring<T>(
  functionName: string,
  operation: () => Promise<T>,
  context?: {
    requestId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<T> {
  try {
    const result = await operation();
    
    // Log successful operation
    await logAuditTrail({
      function_name: functionName,
      user_id: context?.userId,
      action: 'function_execution_success',
      ip_address: context?.ipAddress,
      user_agent: context?.userAgent,
      request_id: context?.requestId,
      metadata: { success: true }
    });
    
    return result;
  } catch (error) {
    // Log security event for failed operation
    await logSecurityEvent({
      event_type: 'function_execution_failed',
      severity: 'medium',
      function_name: functionName,
      user_id: context?.userId,
      ip_address: context?.ipAddress,
      user_agent: context?.userAgent,
      details: { error: error.message, request_id: context?.requestId }
    });
    
    throw error;
  }
}

/**
 * Rate limiting with audit logging
 */
export class AuditedRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  
  constructor(
    private maxRequests: number,
    private windowMs: number,
    private functionName: string
  ) {}
  
  async isAllowed(key: string, context?: { userId?: string; ipAddress?: string }): Promise<boolean> {
    const now = Date.now();
    const record = this.requests.get(key);
    
    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + this.windowMs });
      
      // Log rate limit window start
      await logAuditTrail({
        function_name: this.functionName,
        user_id: context?.userId,
        action: 'rate_limit_window_start',
        ip_address: context?.ipAddress,
        metadata: { key, max_requests: this.maxRequests, window_ms: this.windowMs }
      });
      
      return true;
    }
    
    if (record.count >= this.maxRequests) {
      // Log rate limit exceeded
      await logSecurityEvent({
        event_type: 'rate_limit_exceeded',
        severity: 'medium',
        function_name: this.functionName,
        user_id: context?.userId,
        ip_address: context?.ipAddress,
        details: { key, count: record.count, max_requests: this.maxRequests }
      });
      
      return false;
    }
    
    record.count++;
    return true;
  }
  
  getRemaining(key: string): number {
    const record = this.requests.get(key);
    if (!record || Date.now() > record.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - record.count);
  }
}

/**
 * Get recent audit activity
 */
export async function getRecentAuditActivity(hours: number = 24) {
  try {
    const { data, error } = await supabase
      .from('recent_audit_activity')
      .select('*');
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get recent audit activity:', error);
    return [];
  }
}

/**
 * Get security events summary
 */
export async function getSecurityEventsSummary(hours: number = 24) {
  try {
    const { data, error } = await supabase
      .from('security_events_summary')
      .select('*');
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get security events summary:', error);
    return [];
  }
}

/**
 * Get function performance summary
 */
export async function getFunctionPerformanceSummary(hours: number = 24) {
  try {
    const { data, error } = await supabase
      .from('function_performance_summary')
      .select('*');
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get function performance summary:', error);
    return [];
  }
}

/**
 * Clean up old audit data
 */
export async function cleanupOldAuditData(): Promise<void> {
  try {
    const { error } = await supabase.rpc('cleanup_old_audit_logs');
    if (error) throw error;
    console.log('Audit data cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup audit data:', error);
  }
} 