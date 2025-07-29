import { createCorsResponse } from './cors';

export type EdgeFunctionResponse = {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
};

export function createSuccessResponse(
  data: any,
  metadata?: Record<string, any>
): Response {
  const response: EdgeFunctionResponse = {
    success: true,
    data,
    metadata,
  };

  return createCorsResponse(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createErrorResponse(
  error: string,
  status: number = 400,
  metadata?: Record<string, any>
): Response {
  const response: EdgeFunctionResponse = {
    success: false,
    error,
    metadata,
  };

  return createCorsResponse(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createValidationErrorResponse(
  errors: Record<string, string[]>
): Response {
  return createErrorResponse('Validation failed', 422, { errors });
}