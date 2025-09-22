// Unified error handling for easyMO platform

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'validation' | 'auth' | 'database' | 'external_api' | 'business_logic' | 'system';

export interface ErrorMetadata {
  userId?: string;
  phoneNumber?: string;
  functionName?: string;
  requestId?: string;
  timestamp?: string;
  context?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly metadata: ErrorMetadata;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = 'medium',
    category: ErrorCategory = 'system',
    metadata: ErrorMetadata = {},
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = severity;
    this.category = category;
    this.metadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
    };
    this.retryable = retryable;
    
    // Maintains proper stack trace for V8
    Error.captureStackTrace(this, AppError);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      category: this.category,
      metadata: this.metadata,
      retryable: this.retryable,
      stack: this.stack,
    };
  }
}

/**
 * Error factory for common error types
 */
export class ErrorFactory {
  static validation(message: string, field?: string, metadata?: ErrorMetadata): AppError {
    return new AppError(
      message,
      'VALIDATION_ERROR',
      'medium',
      'validation',
      { ...metadata, field },
      false
    );
  }

  static authentication(message: string = 'Authentication required', metadata?: ErrorMetadata): AppError {
    return new AppError(
      message,
      'AUTH_ERROR',
      'high',
      'auth',
      metadata,
      false
    );
  }

  static authorization(message: string = 'Insufficient permissions', metadata?: ErrorMetadata): AppError {
    return new AppError(
      message,
      'AUTHORIZATION_ERROR',
      'high',
      'auth',
      metadata,
      false
    );
  }

  static database(message: string, originalError?: Error, metadata?: ErrorMetadata): AppError {
    return new AppError(
      message,
      'DATABASE_ERROR',
      'high',
      'database',
      { ...metadata, originalError: originalError?.message },
      true
    );
  }

  static externalApi(service: string, message: string, statusCode?: number, metadata?: ErrorMetadata): AppError {
    return new AppError(
      `${service}: ${message}`,
      'EXTERNAL_API_ERROR',
      'medium',
      'external_api',
      { ...metadata, service, statusCode },
      true
    );
  }

  static rateLimit(message: string = 'Rate limit exceeded', metadata?: ErrorMetadata): AppError {
    return new AppError(
      message,
      'RATE_LIMIT_ERROR',
      'medium',
      'system',
      metadata,
      true
    );
  }

  static businessLogic(message: string, code: string, metadata?: ErrorMetadata): AppError {
    return new AppError(
      message,
      code,
      'medium',
      'business_logic',
      metadata,
      false
    );
  }
}

/**
 * Standard error response format for APIs
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    severity: ErrorSeverity;
    retryable: boolean;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Creates standardized error response
 */
export function createErrorResponse(error: AppError): ErrorResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      severity: error.severity,
      retryable: error.retryable,
      metadata: error.metadata,
    },
  };
}

/**
 * Success response format
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  metadata?: Record<string, unknown>;
}

/**
 * Creates standardized success response
 */
export function createSuccessResponse<T>(data: T, metadata?: Record<string, unknown>): SuccessResponse<T> {
  return {
    success: true,
    data,
    metadata,
  };
}