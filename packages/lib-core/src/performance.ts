// Performance monitoring utilities for easyMO platform

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static timers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  static startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End timing and record metric
   */
  static endTimer(name: string, metadata?: Record<string, unknown>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`No timer found for: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Get all recorded metrics
   */
  static getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get average duration for a specific metric name
   */
  static getAverageDuration(name: string): number {
    const filteredMetrics = this.metrics.filter(m => m.name === name);
    if (filteredMetrics.length === 0) return 0;
    
    const total = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / filteredMetrics.length;
  }
}

/**
 * Decorator for timing function execution
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  return ((...args: any[]) => {
    PerformanceMonitor.startTimer(name);
    
    try {
      const result = fn(...args);
      
      // Handle both sync and async functions
      if (result instanceof Promise) {
        return result.finally(() => {
          PerformanceMonitor.endTimer(name);
        });
      } else {
        PerformanceMonitor.endTimer(name);
        return result;
      }
    } catch (error) {
      PerformanceMonitor.endTimer(name, { error: (error as Error).message });
      throw error;
    }
  }) as T;
}

/**
 * Memory usage utilities
 */
export function getMemoryUsage(): { used: number; total: number; percentage: number } {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      used: usage.heapUsed,
      total: usage.heapTotal,
      percentage: (usage.heapUsed / usage.heapTotal) * 100,
    };
  }
  
  // Browser fallback
  return {
    used: 0,
    total: 0,
    percentage: 0,
  };
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(timestamp => now - timestamp < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.requests.clear();
  }
}