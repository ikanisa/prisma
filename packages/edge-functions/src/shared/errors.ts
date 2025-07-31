export class EdgeFunctionError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly metadata?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
  }

  static badRequest(message: string, metadata?: Record<string, any>): EdgeFunctionError {
    return new EdgeFunctionError(message, 400, 'BAD_REQUEST', metadata);
  }

  static unauthorized(message: string = 'Unauthorized'): EdgeFunctionError {
    return new EdgeFunctionError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Forbidden'): EdgeFunctionError {
    return new EdgeFunctionError(message, 403, 'FORBIDDEN');
  }

  static notFound(message: string = 'Not found'): EdgeFunctionError {
    return new EdgeFunctionError(message, 404, 'NOT_FOUND');
  }

  static validationError(message: string, errors?: Record<string, string[]>): EdgeFunctionError {
    return new EdgeFunctionError(message, 422, 'VALIDATION_ERROR', { errors });
  }

  static rateLimit(message: string = 'Rate limit exceeded'): EdgeFunctionError {
    return new EdgeFunctionError(message, 429, 'RATE_LIMIT');
  }

  static internal(message: string, metadata?: Record<string, any>): EdgeFunctionError {
    return new EdgeFunctionError(message, 500, 'INTERNAL_ERROR', metadata);
  }
}