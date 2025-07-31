import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { 
  FunctionResponse, 
  SuccessResponse, 
  ErrorResponse, 
  LogEntry, 
  PerformanceMetrics,
  ErrorCodes,
  HttpStatus,
  RequestContext,
  AuditLogEntry
} from './types.ts';

// =======================================================================
// Utility Functions for Edge Functions
// =======================================================================

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  code: ErrorCodes | string,
  message: string,
  details?: any
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Create a request context with unique ID
 */
export function createRequestContext(req: Request): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    startTime: Date.now()
  };
}

/**
 * Structured logging function
 */
export function log(
  level: LogEntry['level'],
  functionName: string,
  message: string,
  metadata?: Record<string, any>,
  context?: RequestContext
): void {
  const logEntry: LogEntry = {
    level,
    function: functionName,
    message,
    metadata,
    timestamp: new Date().toISOString(),
    requestId: context?.requestId,
    userId: context?.userId
  };

  // In production, this would send to a logging service
  console.log(JSON.stringify(logEntry));
}

/**
 * Performance monitoring wrapper
 */
export async function withPerformanceMonitoring<T>(
  functionName: string,
  operation: () => Promise<T>,
  context?: RequestContext
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    
    const metrics: PerformanceMetrics = {
      functionName,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId
    };
    
    log('info', functionName, 'Function executed successfully', { metrics }, context);
    return result;
  } catch (error) {
    const metrics: PerformanceMetrics = {
      functionName,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId
    };
    
    log('error', functionName, 'Function execution failed', { 
      metrics, 
      error: error.message 
    }, context);
    throw error;
  }
}

/**
 * Input validation with Zod
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  functionName: string,
  context?: RequestContext
): T {
  try {
    const result = schema.parse(data);
    log('info', functionName, 'Input validation successful', { 
      inputKeys: Object.keys(data as object) 
    }, context);
    return result;
  } catch (error) {
    log('error', functionName, 'Input validation failed', { 
      error: error.message,
      input: data 
    }, context);
    throw new Error(`Validation error: ${error.message}`);
  }
}

/**
 * Safe database operation wrapper
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  functionName: string,
  context?: RequestContext
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    log('error', functionName, 'Database operation failed', { 
      error: error.message 
    }, context);
    
    // Map database errors to appropriate error codes
    if (error.message.includes('duplicate key')) {
      throw new Error(ErrorCodes.DUPLICATE_RECORD);
    } else if (error.message.includes('not found')) {
      throw new Error(ErrorCodes.RECORD_NOT_FOUND);
    } else {
      throw new Error(ErrorCodes.DATABASE_ERROR);
    }
  }
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.requests.get(key);
    
    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    if (record.count >= this.maxRequests) {
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
 * Create audit log entry
 */
export function createAuditLog(
  functionName: string,
  action: string,
  userId?: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>,
  context?: RequestContext
): AuditLogEntry {
  return {
    id: crypto.randomUUID(),
    functionName,
    userId,
    action,
    resourceType,
    resourceId,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
    metadata,
    timestamp: new Date().toISOString()
  };
}

/**
 * Environment variable validation
 */
export function validateEnvironment(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = required.filter(key => !Deno.env.get(key));
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Health check utility
 */
export async function performHealthCheck(): Promise<{
  database: boolean;
  externalApis: boolean;
  memory: boolean;
  disk: boolean;
}> {
  const checks = {
    database: false,
    externalApis: false,
    memory: false,
    disk: false
  };
  
  try {
    // Database check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (supabaseUrl) {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { 'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '' }
      });
      checks.database = response.ok;
    }
    
    // Memory check (simplified)
    checks.memory = true; // Assume OK for now
    
    // Disk check (simplified)
    checks.disk = true; // Assume OK for now
    
    // External APIs check (simplified)
    checks.externalApis = true; // Assume OK for now
    
  } catch (error) {
    console.error('Health check failed:', error);
  }
  
  return checks;
}

/**
 * CORS headers utility
 */
export function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
}

/**
 * Response wrapper with CORS
 */
export function createResponse(
  data: FunctionResponse,
  status: HttpStatus = HttpStatus.OK
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders()
    }
  });
}

/**
 * Error response wrapper
 */
export function createErrorResponseWithStatus(
  code: ErrorCodes | string,
  message: string,
  status: HttpStatus = HttpStatus.BAD_REQUEST,
  details?: any
): Response {
  const errorResponse = createErrorResponse(code, message, details);
  return createResponse(errorResponse, status);
}