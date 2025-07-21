/**
 * Production utility functions
 * Common utilities used across edge functions
 */

import { logger } from './logger.ts';

// CORS headers for production
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Standard error response
export function createErrorResponse(
  message: string, 
  status: number = 500, 
  code?: string,
  details?: any
): Response {
  const errorPayload = {
    error: message,
    code,
    details,
    timestamp: new Date().toISOString(),
    status
  };
  
  logger.error(`Error response: ${message}`, null, { status, code, details });
  
  return new Response(
    JSON.stringify(errorPayload),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      }
    }
  );
}

// Standard success response
export function createSuccessResponse(data: any, status: number = 200): Response {
  const successPayload = {
    data,
    timestamp: new Date().toISOString(),
    status
  };
  
  return new Response(
    JSON.stringify(successPayload),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      }
    }
  );
}

// Handle CORS preflight
export function handleCorsPrelight(): Response {
  return new Response(null, { 
    status: 204,
    headers: corsHeaders 
  });
}

// Request ID generation for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Retry logic with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  context?: string
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        logger.info(`Operation succeeded on attempt ${attempt}`, { context });
      }
      return result;
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Operation failed on attempt ${attempt}/${maxRetries}`, { 
        context, 
        error: lastError.message,
        attempt 
      });
      
      if (attempt === maxRetries) break;
      
      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  logger.error(`Operation failed after ${maxRetries} attempts`, lastError, { context });
  throw lastError;
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  
  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      logger.warn('Rate limit exceeded', { identifier, requests: validRequests.length });
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter(1000, 60000); // 1000 requests per minute

// Performance monitoring
export class PerformanceMonitor {
  private startTime: number;
  private context: string;
  
  constructor(context: string) {
    this.context = context;
    this.startTime = performance.now();
  }
  
  end(additionalContext?: any): number {
    const duration = performance.now() - this.startTime;
    logger.info(`Performance: ${this.context}`, { 
      duration_ms: Math.round(duration),
      ...additionalContext 
    });
    return duration;
  }
}

// Memory usage monitoring
export function logMemoryUsage(context: string): void {
  if (typeof Deno !== 'undefined' && Deno.memoryUsage) {
    const usage = Deno.memoryUsage();
    logger.info(`Memory usage: ${context}`, {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    });
  }
}

// Health check utilities
export function createHealthCheckResponse(): Response {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: typeof Deno !== 'undefined' ? Deno.systemCpuUsage() : null,
    version: '1.0.0'
  };
  
  return createSuccessResponse(health);
}