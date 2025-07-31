/**
 * Production-ready performance monitoring utilities
 * Tracks function execution, database performance, and system metrics
 */

import { logger } from './logger.ts';
import { getSupabaseClient } from './supabase.ts';

interface PerformanceMetric {
  function_name: string;
  execution_time_ms: number;
  memory_usage_mb?: number;
  success: boolean;
  error_details?: string;
  input_size?: number;
  output_size?: number;
  timestamp: string;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private startTimes: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(functionName: string): void {
    this.startTimes.set(functionName, Date.now());
  }

  endTimer(functionName: string, success: boolean = true, error?: Error): number {
    const startTime = this.startTimes.get(functionName);
    if (!startTime) {
      logger.warn('No start time found for function', { functionName });
      return 0;
    }

    const executionTime = Date.now() - startTime;
    this.startTimes.delete(functionName);

    const metric: PerformanceMetric = {
      function_name: functionName,
      execution_time_ms: executionTime,
      success,
      error_details: error?.message,
      timestamp: new Date().toISOString()
    };

    this.metrics.push(metric);
    this.logMetric(metric);

    // Alert on slow performance
    if (executionTime > 5000) { // 5 seconds
      logger.warn('Slow function execution detected', { 
        functionName, 
        executionTime,
        threshold: 5000 
      });
    }

    return executionTime;
  }

  private logMetric(metric: PerformanceMetric): void {
    logger.info('Performance metric recorded', metric);
  }

  async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('agent_execution_log')
        .insert(this.metrics.map(m => ({
          function_name: m.function_name,
          execution_time_ms: m.execution_time_ms,
          success_status: m.success,
          error_details: m.error_details,
          timestamp: m.timestamp,
          input_data: { 
            input_size: m.input_size,
            output_size: m.output_size,
            memory_usage_mb: m.memory_usage_mb 
          }
        })));

      if (error) {
        logger.error('Failed to flush performance metrics', error);
      } else {
        logger.info('Performance metrics flushed', { count: this.metrics.length });
        this.metrics = [];
      }
    } catch (error) {
      logger.error('Error flushing performance metrics', error);
    }
  }

  getAverageExecutionTime(functionName: string): number {
    const functionMetrics = this.metrics.filter(m => m.function_name === functionName);
    if (functionMetrics.length === 0) return 0;

    const totalTime = functionMetrics.reduce((sum, m) => sum + m.execution_time_ms, 0);
    return totalTime / functionMetrics.length;
  }

  getSuccessRate(functionName: string): number {
    const functionMetrics = this.metrics.filter(m => m.function_name === functionName);
    if (functionMetrics.length === 0) return 0;

    const successCount = functionMetrics.filter(m => m.success).length;
    return (successCount / functionMetrics.length) * 100;
  }
}

// Performance decorator for functions
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  functionName: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.startTimer(functionName);

    try {
      const result = await fn(...args);
      monitor.endTimer(functionName, true);
      return result;
    } catch (error) {
      monitor.endTimer(functionName, false, error as Error);
      throw error;
    }
  }) as T;
}

// Database performance monitoring
export async function monitorDatabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    const executionTime = Date.now() - startTime;
    
    logger.info('Database query completed', {
      queryName,
      executionTime,
      success: true
    });

    // Alert on slow queries
    if (executionTime > 1000) { // 1 second
      logger.warn('Slow database query detected', {
        queryName,
        executionTime,
        threshold: 1000
      });
    }

    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Database query failed', error, {
      queryName,
      executionTime,
      success: false
    });
    throw error;
  }
}

// Memory usage monitoring
export function getMemoryUsage(): { used: number; total: number; percentage: number } {
  const memoryUsage = Deno.memoryUsage();
  const used = memoryUsage.heapUsed / 1024 / 1024; // MB
  const total = memoryUsage.heapTotal / 1024 / 1024; // MB
  const percentage = (used / total) * 100;

  return { used, total, percentage };
}

// Rate limiting with performance tracking
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const existingRequests = this.requests.get(identifier) || [];
    
    // Filter out requests outside the time window
    const validRequests = existingRequests.filter(time => time > windowStart);
    
    // Check if rate limit would be exceeded
    if (validRequests.length >= this.maxRequests) {
      logger.warn('Rate limit exceeded', {
        identifier,
        currentRequests: validRequests.length,
        maxRequests: this.maxRequests,
        windowMs: this.windowMs
      });
      return true;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return false;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const existingRequests = this.requests.get(identifier) || [];
    const validRequests = existingRequests.filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > cutoff);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}